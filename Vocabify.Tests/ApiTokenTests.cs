using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vocabify.Controllers;
using Vocabify.DTOs;
using Vocabify.Models;
using Vocabify.Services;
using Vocabify.Tests.Infrastructure;

namespace Vocabify.Tests;

public class ApiTokenTests
{
    [Fact]
    public void Bearer_header_precedes_cookie_and_scope_is_required()
    {
        var request = new DefaultHttpContext();
        request.Request.Headers.Cookie = "auth=valid-cookie";
        Assert.Equal("Bearer", CaptureAccess.SelectScheme(request));
        request.Request.Headers.Authorization = "Bearer invalid-token";
        Assert.Equal(ApiTokenAuthenticationHandler.SchemeName, CaptureAccess.SelectScheme(request));
        var noScope = new ClaimsPrincipal(new ClaimsIdentity([new Claim("id", Guid.NewGuid().ToString())], ApiTokenAuthenticationHandler.SchemeName));
        Assert.False(CaptureAccess.HasScope(noScope));
        var capture = new ClaimsPrincipal(new ClaimsIdentity([new Claim("scope", "capture")], ApiTokenAuthenticationHandler.SchemeName));
        Assert.True(CaptureAccess.HasScope(capture));
    }

    [Fact]
    public async Task Creation_stores_only_hash_and_validation_checks_expiry_revocation_and_scope()
    {
        using var database = new TestDatabase();
        var owner = new User { Id = Guid.NewGuid(), Username = "alice", Name = "Alice" };
        using (var db = database.CreateContext())
        {
            db.Users.Add(owner);
            await db.SaveChangesAsync();
        }

        string raw;
        Guid id;
        using (var db = database.CreateContext())
        {
            var (record, token) = await new ApiTokenService(db).CreateAsync(owner.Id, " Extension ");
            raw = token;
            id = record.Id;
            Assert.Equal("Extension", record.Name);
            Assert.Equal("capture", record.Scope);
            Assert.InRange(record.ExpiresAt - record.CreatedAt, TimeSpan.FromDays(90), TimeSpan.FromDays(90));
            Assert.DoesNotContain(raw, record.SecretHash);
            Assert.Equal(ApiTokenService.Hash(raw.Split('.')[1]), record.SecretHash);
        }

        using (var db = database.CreateContext())
        {
            var service = new ApiTokenService(db);
            Assert.Equal(owner.Id, (await service.ValidateAsync(raw))?.UserId);
            Assert.Null(await service.ValidateAsync(raw[..^1] + (raw[^1] == 'a' ? 'b' : 'a')));
            Assert.Null(await service.ValidateAsync("Bearer " + raw));
            var record = await db.ApiTokens.SingleAsync(t => t.Id == id);
            record.ExpiresAt = DateTime.UtcNow.AddSeconds(-1);
            await db.SaveChangesAsync();
            Assert.Null(await service.ValidateAsync(raw));
            record.ExpiresAt = DateTime.UtcNow.AddDays(1);
            record.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            Assert.Null(await service.ValidateAsync(raw));
        }
    }

    [Fact]
    public async Task Controller_discloses_secret_only_on_create_and_enforces_owner_on_revoke()
    {
        using var database = new TestDatabase();
        var alice = new User { Id = Guid.NewGuid(), Username = "alice" };
        var bob = new User { Id = Guid.NewGuid(), Username = "bob" };
        using var db = database.CreateContext();
        db.Users.AddRange(alice, bob);
        await db.SaveChangesAsync();
        var controller = Controller(db, alice.Id);
        var created = Assert.IsType<CreatedResult>(await controller.Create(new CreateApiTokenRequest("Ext")));
        var secret = Assert.IsType<CreatedApiTokenResponse>(created.Value);
        Assert.StartsWith("vocab_", secret.Token);
        var listed = Assert.IsType<OkObjectResult>(await controller.List());
        var metadata = Assert.IsType<List<ApiTokenResponse>>(listed.Value);
        Assert.Single(metadata);
        Assert.DoesNotContain("token", System.Text.Json.JsonSerializer.Serialize(metadata), StringComparison.OrdinalIgnoreCase);
        Assert.IsType<NotFoundResult>(await Controller(db, bob.Id).Revoke(secret.Id));
        Assert.Null((await db.ApiTokens.SingleAsync()).RevokedAt);
        Assert.IsType<NoContentResult>(await controller.Revoke(secret.Id));
        Assert.NotNull((await db.ApiTokens.SingleAsync()).RevokedAt);
        Assert.Null(await new ApiTokenService(db).ValidateAsync(secret.Token));
    }

    private static ApiTokensController Controller(Vocabify.Data.AppDbContext db, Guid userId) =>
        new(db, new ApiTokenService(db))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("id", userId.ToString())], "Cookie"))
                }
            }
        };
}
