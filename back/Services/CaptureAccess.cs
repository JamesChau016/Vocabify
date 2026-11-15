using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace Vocabify.Services;

public static class CaptureAccess
{
    public static string SelectScheme(HttpContext context) =>
        context.Request.Headers.Authorization.ToString().StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? ApiTokenAuthenticationHandler.SchemeName
            : JwtBearerDefaults.AuthenticationScheme;

    public static bool HasScope(ClaimsPrincipal user) =>
        !user.Identities.Any(i => i.AuthenticationType == ApiTokenAuthenticationHandler.SchemeName) ||
        user.HasClaim("scope", ApiTokenService.Scope);
}
