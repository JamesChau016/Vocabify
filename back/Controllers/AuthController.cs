using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vocabify.Data;
using Vocabify.DTOs;
using Vocabify.Models;
using Vocabify.Services;

namespace Vocabify.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokenService;
    private readonly EmailService _emailService;
    private readonly RateLimitService _rateLimiter;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;

    public AuthController(
        AppDbContext db,
        TokenService tokenService,
        EmailService emailService,
        RateLimitService rateLimiter,
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        IWebHostEnvironment env)
    {
        _db = db;
        _tokenService = tokenService;
        _emailService = emailService;
        _rateLimiter = rateLimiter;
        _httpClientFactory = httpClientFactory;
        _config = config;
        _env = env;
    }

    // ── Login ────────────────────────────────────────────────────────────────

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (await _rateLimiter.IsRateLimitedAsync(RateLimitPolicy.Login, ClientIp(), request.Username))
            return StatusCode(429, new { error = "Too many login attempts. Try again later." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { error = "wrong username or password" });

        SetAuthCookie(_tokenService.GenerateToken(user.Id, user.Username));
        return Ok(new LoginResponse(user.Username, user.Name));
    }

    // ── Logout ───────────────────────────────────────────────────────────────

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("auth", new CookieOptions { Path = "/" });
        return NoContent();
    }

    // ── Session restore ──────────────────────────────────────────────────────

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return Unauthorized();

        return Ok(new LoginResponse(user.Username, user.Name));
    }

    // ── OAuth: Google ────────────────────────────────────────────────────────

    [HttpGet("oauth/google")]
    public IActionResult GoogleOAuth()
    {
        var clientId = _config["OAuth:Google:ClientId"]!;
        var redirectUri = $"{_config["App:PublicUrl"]}/api/auth/callback/google";
        var state = GenerateState("google");

        var url = "https://accounts.google.com/o/oauth2/v2/auth?" +
            $"client_id={HttpUtility.UrlEncode(clientId)}" +
            $"&redirect_uri={HttpUtility.UrlEncode(redirectUri)}" +
            "&response_type=code" +
            "&scope=openid%20email%20profile" +
            $"&state={HttpUtility.UrlEncode(state)}";

        return Ok(new { url });
    }

    [HttpGet("callback/google")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string code, [FromQuery] string state)
    {
        if (!ValidateState(state, "google"))
            return BadRequest(new { error = "Invalid OAuth state." });

        var clientId = _config["OAuth:Google:ClientId"]!;
        var clientSecret = _config["OAuth:Google:ClientSecret"]!;
        var redirectUri = $"{_config["App:PublicUrl"]}/api/auth/callback/google";
        var publicUrl = _config["App:PublicUrl"]!;

        var http = _httpClientFactory.CreateClient();

        // Exchange code for token
        var tokenResp = await http.PostAsync("https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["redirect_uri"] = redirectUri,
                ["grant_type"] = "authorization_code"
            }));

        if (!tokenResp.IsSuccessStatusCode)
            return Redirect($"{publicUrl}/login?error=oauth_failed");

        var tokenJson = await tokenResp.Content.ReadAsStringAsync();
        using var tokenDoc = JsonDocument.Parse(tokenJson);
        var accessToken = tokenDoc.RootElement.GetProperty("access_token").GetString();

        // Get user info
        http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var infoResp = await http.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo");

        if (!infoResp.IsSuccessStatusCode)
            return Redirect($"{publicUrl}/login?error=oauth_failed");

        var infoJson = await infoResp.Content.ReadAsStringAsync();
        using var infoDoc = JsonDocument.Parse(infoJson);
        var sub = infoDoc.RootElement.GetProperty("sub").GetString()!;
        var email = infoDoc.RootElement.GetProperty("email").GetString()!;
        var name = infoDoc.RootElement.TryGetProperty("name", out var nameProp)
            ? nameProp.GetString() ?? email.Split('@')[0]
            : email.Split('@')[0];

        return await HandleOAuthUser(email, name, "google", sub);
    }

    // ── OAuth: GitHub ────────────────────────────────────────────────────────

    [HttpGet("oauth/github")]
    public IActionResult GitHubOAuth()
    {
        var clientId = _config["OAuth:GitHub:ClientId"]!;
        var redirectUri = $"{_config["App:PublicUrl"]}/api/auth/callback/github";
        var state = GenerateState("github");

        var url = "https://github.com/login/oauth/authorize?" +
            $"client_id={HttpUtility.UrlEncode(clientId)}" +
            $"&redirect_uri={HttpUtility.UrlEncode(redirectUri)}" +
            "&scope=user%3Aemail" +
            $"&state={HttpUtility.UrlEncode(state)}";

        return Ok(new { url });
    }

    [HttpGet("callback/github")]
    public async Task<IActionResult> GitHubCallback([FromQuery] string code, [FromQuery] string state)
    {
        if (!ValidateState(state, "github"))
            return BadRequest(new { error = "Invalid OAuth state." });

        var clientId = _config["OAuth:GitHub:ClientId"]!;
        var clientSecret = _config["OAuth:GitHub:ClientSecret"]!;
        var redirectUri = $"{_config["App:PublicUrl"]}/api/auth/callback/github";
        var publicUrl = _config["App:PublicUrl"]!;

        var http = _httpClientFactory.CreateClient();
        http.DefaultRequestHeaders.Accept.Add(
            new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

        // Exchange code for token
        var tokenResp = await http.PostAsync("https://github.com/login/oauth/access_token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["code"] = code,
                ["redirect_uri"] = redirectUri
            }));

        if (!tokenResp.IsSuccessStatusCode)
            return Redirect($"{publicUrl}/login?error=oauth_failed");

        var tokenJson = await tokenResp.Content.ReadAsStringAsync();
        using var tokenDoc = JsonDocument.Parse(tokenJson);
        var accessToken = tokenDoc.RootElement.GetProperty("access_token").GetString();

        http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        http.DefaultRequestHeaders.Add("User-Agent", "Vocabify");

        // Get user profile
        var profileResp = await http.GetAsync("https://api.github.com/user");
        if (!profileResp.IsSuccessStatusCode)
            return Redirect($"{publicUrl}/login?error=oauth_failed");

        var profileJson = await profileResp.Content.ReadAsStringAsync();
        using var profileDoc = JsonDocument.Parse(profileJson);
        var githubId = profileDoc.RootElement.GetProperty("id").GetInt64().ToString();
        var name = profileDoc.RootElement.TryGetProperty("name", out var nameProp) && nameProp.ValueKind != JsonValueKind.Null
            ? nameProp.GetString()!
            : profileDoc.RootElement.GetProperty("login").GetString()!;

        // Get primary email (may not be in profile if private)
        string? email = profileDoc.RootElement.TryGetProperty("email", out var emailProp) && emailProp.ValueKind != JsonValueKind.Null
            ? emailProp.GetString()
            : null;

        if (email is null)
        {
            var emailsResp = await http.GetAsync("https://api.github.com/user/emails");
            if (emailsResp.IsSuccessStatusCode)
            {
                var emailsJson = await emailsResp.Content.ReadAsStringAsync();
                using var emailsDoc = JsonDocument.Parse(emailsJson);
                email = emailsDoc.RootElement.EnumerateArray()
                    .Where(e => e.TryGetProperty("primary", out var p) && p.GetBoolean())
                    .Select(e => e.GetProperty("email").GetString())
                    .FirstOrDefault();
            }
        }

        if (email is null)
            return Redirect($"{publicUrl}/login?error=email_required");

        return await HandleOAuthUser(email, name, "github", githubId);
    }

    // ── Password reset ───────────────────────────────────────────────────────

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (await _rateLimiter.IsRateLimitedAsync(RateLimitPolicy.ForgotPassword, ClientIp()))
            return StatusCode(429, new { error = "Too many requests. Try again later." });

        var generic = Ok(new { message = "If that email is registered, you'll receive a reset link shortly." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user is null) return generic; // don't disclose whether the email exists

        // Invalidate outstanding tokens for this user
        var existing = await _db.PasswordResetTokens
            .Where(t => t.UserId == user.Id && !t.Used)
            .ToListAsync();
        foreach (var t in existing) t.Used = true;

        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var resetToken = new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = BCrypt.Net.BCrypt.HashPassword(rawToken, 10),
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        };
        _db.PasswordResetTokens.Add(resetToken);
        await _db.SaveChangesAsync();

        var resetUrl = $"{_config["App:PublicUrl"]}/reset-password?id={resetToken.Id}&token={rawToken}";
        await _emailService.SendPasswordResetAsync(user.Email!, resetUrl);

        return generic;
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (await _rateLimiter.IsRateLimitedAsync(RateLimitPolicy.ResetPassword, ClientIp()))
            return StatusCode(429, new { error = "Too many requests. Try again later." });

        var invalid = BadRequest(new { error = "Invalid or expired reset link." });

        var resetToken = await _db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == request.TokenId && !t.Used && t.ExpiresAt > DateTime.UtcNow);

        if (resetToken is null) return invalid;
        if (!BCrypt.Net.BCrypt.Verify(request.Token, resetToken.TokenHash)) return invalid;

        resetToken.Used = true;
        resetToken.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, 10);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password updated. You can now sign in." });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void SetAuthCookie(string token)
    {
        Response.Cookies.Append("auth", token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = _env.IsProduction(),
            MaxAge = TimeSpan.FromDays(7),
            Path = "/"
        });
    }

    private string GenerateState(string provider)
    {
        var state = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        Response.Cookies.Append($"oauth_state_{provider}", state, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            MaxAge = TimeSpan.FromMinutes(10),
            Path = "/"
        });
        return state;
    }

    private bool ValidateState(string state, string provider)
    {
        var key = $"oauth_state_{provider}";
        var stored = Request.Cookies[key];
        Response.Cookies.Delete(key, new CookieOptions { Path = "/" });
        return !string.IsNullOrEmpty(stored) && stored == state;
    }

    private async Task<IActionResult> HandleOAuthUser(string email, string name, string provider, string providerId)
    {
        var publicUrl = _config["App:PublicUrl"]!;

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.OAuthProvider == provider && u.OAuthId == providerId);

        if (user is null)
        {
            user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user is not null)
            {
                user.OAuthProvider = provider;
                user.OAuthId = providerId;
                await _db.SaveChangesAsync();
            }
        }

        if (user is null)
        {
            var username = await GenerateUniqueUsernameAsync(email, provider);
            user = new User
            {
                Username = username,
                Name = name,
                Email = email,
                OAuthProvider = provider,
                OAuthId = providerId,
                // Unguessable hash — prevents password login for OAuth-only accounts
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString(), 10)
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }

        SetAuthCookie(_tokenService.GenerateToken(user.Id, user.Username));
        return Redirect($"{publicUrl}/home");
    }

    private async Task<string> GenerateUniqueUsernameAsync(string email, string provider)
    {
        var prefix = email.Split('@')[0];
        prefix = Regex.Replace(prefix, @"[^a-zA-Z0-9_]", "_");
        prefix = prefix.Length < 3 ? $"{provider}_{prefix}" : prefix;
        prefix = prefix[..Math.Min(20, prefix.Length)];

        var candidate = prefix;
        var n = 1;
        while (await _db.Users.AnyAsync(u => u.Username == candidate))
            candidate = $"{prefix}{n++}";

        return candidate;
    }

    private string ClientIp() =>
        HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    private Guid? GetUserId()
    {
        var idClaim = User.FindFirstValue("id");
        return Guid.TryParse(idClaim, out var id) ? id : null;
    }
}
