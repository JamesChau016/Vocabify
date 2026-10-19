using System.ComponentModel.DataAnnotations;

namespace Vocabify.DTOs;

public record ForgotPasswordRequest
{
    [Required]
    [EmailAddress]
    public required string Email { get; init; }
}
