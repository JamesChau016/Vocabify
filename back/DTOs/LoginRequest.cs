using System.ComponentModel.DataAnnotations;

namespace Vocabify.DTOs;

public record LoginRequest
{
    [Required]
    [StringLength(256, MinimumLength = 1, ErrorMessage = "Username must be between 1 and 256 characters.")]
    public required string Username { get; init; }

    [Required]
    [StringLength(256, MinimumLength = 1, ErrorMessage = "Password must be between 1 and 256 characters.")]
    public required string Password { get; init; }
}
