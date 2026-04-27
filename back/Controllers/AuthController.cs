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
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { error = "wrong username or password" });

        var token = _tokenService.GenerateToken(user.Id, user.Username);

        return Ok(new LoginResponse(token, user.Username, user.Name));
    }
}
