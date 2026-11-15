using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Vocabify.Data;
using Vocabify.Models;

namespace Vocabify.Services;

public class ApiTokenService(AppDbContext db)
{
    public const string Scope = "capture";

    public async Task<(ApiToken Metadata, string Token)> CreateAsync(Guid userId, string name)
    {
        var selector = Convert.ToHexString(RandomNumberGenerator.GetBytes(12)).ToLowerInvariant();
        var secret = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var now = DateTime.UtcNow;
        var token = new ApiToken
        {
            UserId = userId,
            Name = name.Trim(),
            Scope = Scope,
            Selector = selector,
            SecretHash = Hash(secret),
            CreatedAt = now,
            ExpiresAt = now.AddDays(90)
        };
        db.ApiTokens.Add(token);
        await db.SaveChangesAsync();
        return (token, $"vocab_{selector}.{secret}");
    }

    public async Task<ApiToken?> ValidateAsync(string rawToken)
    {
        if (!TryParse(rawToken, out var selector, out var secret)) return null;
        var token = await db.ApiTokens.AsNoTracking().Include(t => t.User)
            .SingleOrDefaultAsync(t => t.Selector == selector);
        if (token is null || token.RevokedAt is not null || token.ExpiresAt <= DateTime.UtcNow)
            return null;
        var supplied = Convert.FromHexString(Hash(secret));
        var stored = Convert.FromHexString(token.SecretHash);
        return CryptographicOperations.FixedTimeEquals(supplied, stored) ? token : null;
    }

    public static string Hash(string secret) =>
        Convert.ToHexString(SHA256.HashData(Encoding.ASCII.GetBytes(secret)));

    private static bool TryParse(string raw, out string selector, out string secret)
    {
        selector = secret = string.Empty;
        if (!raw.StartsWith("vocab_", StringComparison.Ordinal)) return false;
        var parts = raw[6..].Split('.');
        if (parts.Length != 2 || parts[0].Length != 24 || parts[1].Length != 64 ||
            !parts.All(p => p.All(c => c is >= '0' and <= '9' or >= 'a' and <= 'f')))
            return false;
        selector = parts[0];
        secret = parts[1];
        return true;
    }
}
