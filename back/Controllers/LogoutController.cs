using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Vocabify.Controllers;

[ApiController]
[Route("api/logout")]
public class LogoutController : ControllerBase
{
    // Stateless JWT: logout simply acknowledges a valid token and returns 204.
    // The client is responsible for clearing its own stored token.
    // [Authorize] + the JWT bearer middleware return 401 automatically when the
    // token is missing, invalid, or expired.
    [Authorize]
    [HttpPost]
    public IActionResult Logout()
    {
        return NoContent();
    }
}
