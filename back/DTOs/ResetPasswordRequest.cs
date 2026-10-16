using System.ComponentModel.DataAnnotations;

namespace Vocabify.DTOs;

public record ResetPasswordRequest
{
    [Required]
    public Guid TokenId { get; init; }

    [Required]
    public required string Token { get; init; }

    [Required]
    [StringLength(128, MinimumLength = 8, ErrorMessage = "Password must be between 8 and 128 characters.")]
    public required string NewPassword { get; init; }
}
