using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Vocabify.Services;

public class TokenService
{
    private readonly string _secret;
    private readonly string _issuer;

    public TokenService(IConfiguration config)
    {
        _secret = config["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret not configured");
        _issuer = config["Jwt:Issuer"] ?? "vocabify";
    }

    public string GenerateToken(Guid userId, string username)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Compute a single issuance instant so that issued-at and expiry are derived
        // from the same moment. JWT numeric-date claims are truncated to whole seconds;
        // deriving expiry as now.AddDays(7) keeps the identical sub-second fraction, so
        // exp - iat is exactly 604800 seconds (7 days) after truncation.
        var now = DateTime.UtcNow;
        var expires = now.AddDays(7);

        var claims = new[]
        {
            new Claim("id", userId.ToString()),
            new Claim("user", username),
            new Claim(JwtRegisteredClaimNames.Iat, EpochTime.GetIntDate(now).ToString(), ClaimValueTypes.Integer64)
        };

        var token = new JwtSecurityToken(
            issuer: _issuer,
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
