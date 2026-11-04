namespace Vocabify.Services;

/// <summary>
/// Defines a fixed-window rate limit: at most <see cref="MaxRequests"/> within
/// each <see cref="Window"/>. <see cref="Prefix"/> namespaces the Redis key so
/// different policies don't collide.
/// </summary>
public record RateLimitPolicy(string Prefix, int MaxRequests, TimeSpan Window)
{
    public static readonly RateLimitPolicy Login = new("login", 5, TimeSpan.FromMinutes(15));
    public static readonly RateLimitPolicy ForgotPassword = new("forgot-pw", 3, TimeSpan.FromHours(1));
    public static readonly RateLimitPolicy ResetPassword = new("reset-pw", 5, TimeSpan.FromHours(1));
    public static readonly RateLimitPolicy Review = new("review", 120, TimeSpan.FromMinutes(15));
}
