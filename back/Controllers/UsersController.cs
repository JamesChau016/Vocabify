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
        // Length/required validation (username 3-30, name 1-100, password 8-128) is enforced
        // by DataAnnotations on CreateUserRequest and auto-validated by [ApiController],
        // which returns a 400 ProblemDetails naming the offending field on violation.
        // (Requirements 1.1, 1.4, 1.6, 1.7)

        // Pre-insert duplicate-username check so no Account is created for a taken username.
        // (Requirements 1.5, 10.2)
        var usernameTaken = await _db.Users.AnyAsync(u => u.Username == request.Username);
        if (usernameTaken)
        {
            return Conflict(new { error = "username is taken" });
        }

        var user = new User
        {
            Username = request.Username,
            Name = request.Name,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, 10)
        };

        _db.Users.Add(user);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Race condition: the unique index on User.Username rejected the insert.
            // Map to the same 409 contract; no Account is persisted. (Requirements 1.5, 10.2)
            return Conflict(new { error = "username is taken" });
        }

        // Return only id, username, and name; the password hash is never exposed.
        // (Requirements 1.2, 1.3)
        return Created($"/api/users/{user.Id}", new UserResponse(user.Id, user.Username, user.Name));
    }
}
