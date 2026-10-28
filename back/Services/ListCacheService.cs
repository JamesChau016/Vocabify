using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using Vocabify.DTOs;

namespace Vocabify.Services;

/// <summary>
/// Read-through cache for public list endpoints backed by Redis.
///
/// Version-key pattern: each logical entity (all-lists, per-list) has a cheap
/// integer version stored in Redis. Cached data lives at a key that embeds the
/// current version. Invalidation = increment the version key in one write;
/// the old data key becomes unreachable and expires via TTL.
///
/// NOTE: Version increment is read-add-write, not atomic (IDistributedCache has
/// no native INCR). A concurrent mutation could produce a stale entry that
/// survives until the next invalidation or TTL. This is acceptable at current
/// traffic levels.
///
/// All public methods swallow Redis exceptions and log a warning. A Redis outage
/// never causes a 5xx — callers fall through to PostgreSQL on any cache error.
/// </summary>
public class ListCacheService(IDistributedCache cache, ILogger<ListCacheService> logger)
{
    private static readonly TimeSpan DataTtl = TimeSpan.FromMinutes(10);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    // ── version key names ────────────────────────────────────────────────────
    private const string GlobalVersionKey = "lists:v";
    private static string ListVersionKey(Guid id) => $"list:{id}:v";

    // ── data key names (embed version so old entries become orphaned) ─────────
    private static string AllListsDataKey(long version) => $"lists:{version}";
    private static string ListDataKey(Guid id, long version) => $"list:{id}:{version}";

    // ────────────────────────────────────────────────────────────────────────
    // Public read helpers
    // ────────────────────────────────────────────────────────────────────────

    public async Task<List<ListResponse>?> GetAllListsAsync()
    {
        try
        {
            var version = await GetVersionAsync(GlobalVersionKey);
            var json = await cache.GetStringAsync(AllListsDataKey(version));
            if (json is null) return null;
            return JsonSerializer.Deserialize<List<ListResponse>>(json, JsonOptions);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cache read failed for all-lists; falling back to database");
            return null;
        }
    }

    public async Task<ListResponse?> GetListAsync(Guid id)
    {
        try
        {
            var version = await GetVersionAsync(ListVersionKey(id));
            var json = await cache.GetStringAsync(ListDataKey(id, version));
            if (json is null) return null;
            return JsonSerializer.Deserialize<ListResponse>(json, JsonOptions);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cache read failed for list {ListId}; falling back to database", id);
            return null;
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Public write helpers
    // ────────────────────────────────────────────────────────────────────────

    public async Task SetAllListsAsync(List<ListResponse> data)
    {
        try
        {
            var version = await GetVersionAsync(GlobalVersionKey);
            var json = JsonSerializer.Serialize(data, JsonOptions);
            await cache.SetStringAsync(AllListsDataKey(version), json, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = DataTtl
            });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cache write failed for all-lists");
        }
    }

    public async Task SetListAsync(ListResponse data)
    {
        try
        {
            var version = await GetVersionAsync(ListVersionKey(data.Id));
            var json = JsonSerializer.Serialize(data, JsonOptions);
            await cache.SetStringAsync(ListDataKey(data.Id, version), json, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = DataTtl
            });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cache write failed for list {ListId}", data.Id);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Public invalidation helpers
    // ────────────────────────────────────────────────────────────────────────

    public async Task InvalidateAllListsAsync()
    {
        try
        {
            await IncrementVersionAsync(GlobalVersionKey);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cache invalidation failed for all-lists");
        }
    }

    public async Task InvalidateListAsync(Guid id)
    {
        try
        {
            await IncrementVersionAsync(ListVersionKey(id));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cache invalidation failed for list {ListId}", id);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Private version helpers
    // ────────────────────────────────────────────────────────────────────────

    private async Task<long> GetVersionAsync(string vKey)
    {
        var raw = await cache.GetStringAsync(vKey);
        return raw is not null && long.TryParse(raw, out var v) ? v : 0L;
    }

    private async Task IncrementVersionAsync(string vKey)
    {
        var current = await GetVersionAsync(vKey);
        // Version keys have no TTL — they are cheap integers that must survive
        // data TTL expiry. If Redis is flushed they reset to 0, which is safe:
        // the new version 0 won't match any existing data key's version.
        await cache.SetStringAsync(vKey, (current + 1).ToString());
    }
}
