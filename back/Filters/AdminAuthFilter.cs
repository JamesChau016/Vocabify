using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Vocabify.Filters;

/// <summary>
/// Action filter that gates a route behind HTTP Basic Auth, checking credentials
/// against the ADMIN_USER and ADMIN_USER_PASS environment variables (surfaced via
/// IConfiguration as "ADMIN_USER" and "ADMIN_USER_PASS").
///
/// Usage: decorate an action with [TypeFilter(typeof(AdminAuthFilter))].
/// </summary>
public class AdminAuthFilter(IConfiguration config) : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        var adminUser = config["ADMIN_USER"];
        var adminPass = config["ADMIN_USER_PASS"];

        if (string.IsNullOrEmpty(adminUser) || string.IsNullOrEmpty(adminPass))
        {
            // Fail closed: if env vars aren't set, nobody gets in.
            context.Result = new StatusCodeResult(503);
            return;
        }

        var authHeader = context.HttpContext.Request.Headers.Authorization.ToString();

        if (!authHeader.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
        {
            Challenge(context);
            return;
        }

        string credentials;
        try
        {
            credentials = Encoding.UTF8.GetString(Convert.FromBase64String(authHeader["Basic ".Length..].Trim()));
        }
        catch
        {
            Challenge(context);
            return;
        }

        var colon = credentials.IndexOf(':');
        if (colon < 0)
        {
            Challenge(context);
            return;
        }

        var user = credentials[..colon];
        var pass = credentials[(colon + 1)..];

        if (!string.Equals(user, adminUser, StringComparison.Ordinal) ||
            !string.Equals(pass, adminPass, StringComparison.Ordinal))
        {
            Challenge(context);
            return;
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }

    private static void Challenge(ActionExecutingContext context)
    {
        context.HttpContext.Response.Headers.WWWAuthenticate = "Basic realm=\"Vocabify Admin\"";
        context.Result = new UnauthorizedResult();
    }
}
