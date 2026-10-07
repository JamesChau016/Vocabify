using System.ComponentModel.DataAnnotations;

namespace Vocabify.DTOs;

public record ResetPasswordRequest(
    [property: Required]
    Guid TokenId,

    [property: Required]
    string Token,

    [property: Required]
    [property: StringLength(128, MinimumLength = 8, ErrorMessage = "Password must be between 8 and 128 characters.")]
    string NewPassword
);
