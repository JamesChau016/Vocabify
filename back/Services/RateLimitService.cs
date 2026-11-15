using StackExchange.Redis;

namespace Vocabify.Services;

/// <summary>
/// Fixed-window rate limiter backed by Redis atomic INCR.
///
/// Key format: rl:{policy.Prefix}:{identifier}:{windowBucket}
/// Each key self-expires after the window duration.
///
/// Fails open: if Redis is unreachable the request is allowed and a warning
/// is logged. A Redis outage never causes a 429.
/// </summary>
public class RateLimitService(IConnectionMultiplexer redis, ILogger<RateLimitService> logger)
{
    /// <summary>
    /// Returns <c>true</c> when the caller has exceeded the policy limit and
    /// should be rejected (HTTP 429). <paramref name="keyParts"/> are joined
    /// with ":" to form the identifier (e.g. IP, or IP + username).
    /// </summary>
    public async Task<bool> IsRateLimitedAsync(RateLimitPolicy policy, params string[] keyParts)
    {
        try
        {
            var db = redis.GetDatabase();
            var key = BuildKey(policy, keyParts);

            var count = await db.StringIncrementAsync(key);

            // First hit in this window — set the TTL so the key self-cleans.
            if (count == 1)
                await db.KeyExpireAsync(key, policy.Window);

            return count > policy.MaxRequests;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Rate limit check failed for {Policy}; allowing request", policy.Prefix);
            return false;
        }
    }

    private static string BuildKey(RateLimitPolicy policy, string[] keyParts)
    {
        var windowSeconds = (long)policy.Window.TotalSeconds;
        var bucket = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / windowSeconds;
        var identifier = string.Join(":", keyParts);
        return $"rl:{policy.Prefix}:{identifier}:{bucket}";
    }
}
