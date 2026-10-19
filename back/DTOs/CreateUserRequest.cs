using System.ComponentModel.DataAnnotations;

namespace Vocabify.DTOs;

public record CreateUserRequest
{
    [Required]
    [StringLength(30, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 30 characters.")]
    public required string Username { get; init; }

    [Required]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 100 characters.")]
    public required string Name { get; init; }

    [Required]
    [StringLength(128, MinimumLength = 8, ErrorMessage = "Password must be between 8 and 128 characters.")]
    public required string Password { get; init; }

    [EmailAddress]
    public string? Email { get; init; }
}
