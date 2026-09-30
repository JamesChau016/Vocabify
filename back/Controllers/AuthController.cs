using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vocabify.Data;
using Vocabify.DTOs;
using Vocabify.Services;

namespace Vocabify.Controllers;

[ApiController]
[Route("api/login")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokenService;

    public AuthController(AppDbContext db, TokenService tokenService)
    {
        _db = db;
        _tokenService = tokenService;
    }

    [HttpPost]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // Missing/empty username or password is rejected with a 400 that names the
        // offending field. This is enforced automatically by [ApiController]
        // ModelState validation using the DataAnnotations on LoginRequest, so no
        // token is issued and execution never reaches this method on invalid input.

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);

        // Return the SAME generic 401 for both an unknown username and a wrong
        // password so the response never discloses which credential was incorrect.
        // No token is generated on this failure path.
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { error = "wrong username or password" });

        var token = _tokenService.GenerateToken(user.Id, user.Username);

        return Ok(new LoginResponse(token, user.Username, user.Name));
    }
}
