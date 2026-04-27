using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vocabify.Data;
using Vocabify.DTOs;
using Vocabify.Models;

namespace Vocabify.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _db.Users
            .Select(u => new UserResponse(u.Id, u.Username, u.Name))
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest request)
    {
        var user = new User
        {
            Username = request.Username,
            Name = request.Name,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, 10)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Created($"/api/users/{user.Id}", new UserResponse(user.Id, user.Username, user.Name));
    }
}
