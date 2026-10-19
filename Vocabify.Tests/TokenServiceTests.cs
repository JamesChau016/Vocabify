using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens; 
using Microsoft.Extensions.Configuration;
using Vocabify.Services;

namespace Vocabify.Tests;

public class TokenServiceTests
{
    [Fact]
    public void GenerateToken_contains_user_claims_and_seven_day_expiry()
    {
        var userId = Guid.NewGuid();
        var issuedAt = DateTime.UtcNow;
        var service = new TokenService(CreateConfiguration());

        var token = new JwtSecurityTokenHandler().ReadJwtToken(
            service.GenerateToken(userId, "alice"));
        var iatClaim = token.Claims.Single(c => c.Type == JwtRegisteredClaimNames.Iat);

        Assert.Equal(userId.ToString(), token.Claims.Single(claim => claim.Type == "id").Value);
        Assert.Equal("alice", token.Claims.Single(claim => claim.Type == "user").Value);
        Assert.Equal("test", token.Issuer);
        Assert.InRange(token.ValidFrom, issuedAt.AddSeconds(-2), DateTime.UtcNow.AddSeconds(2));
        Assert.InRange(token.ValidTo - token.ValidFrom, TimeSpan.FromDays(7).Add(TimeSpan.FromSeconds(-1)), TimeSpan.FromDays(7).Add(TimeSpan.FromSeconds(1)));
        Assert.True(long.TryParse(iatClaim.Value, out var iatEpoch));
        Assert.InRange(
            iatEpoch,
            EpochTime.GetIntDate(issuedAt) - 2,
            EpochTime.GetIntDate(DateTime.UtcNow) + 2);
    }

    [Fact]
    public void Missing_secret_throws_an_invalid_operation_exception()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Issuer"] = "test"
            })
            .Build();

        var exception = Assert.Throws<InvalidOperationException>(
            () => new TokenService(configuration));

        Assert.Equal("Jwt:Secret not configured", exception.Message);
    }

    private static IConfiguration CreateConfiguration() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "a-secret-that-is-long-enough-for-hmac",
                ["Jwt:Issuer"] = "test"
            })
            .Build();
}
