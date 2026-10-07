using System.ComponentModel.DataAnnotations;

namespace Vocabify.DTOs;

public record CreateUserRequest(
    [property: Required]
    [property: StringLength(30, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 30 characters.")]
    string Username,

    [property: Required]
    [property: StringLength(100, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 100 characters.")]
    string Name,

    [property: Required]
    [property: StringLength(128, MinimumLength = 8, ErrorMessage = "Password must be between 8 and 128 characters.")]
    string Password,

    [property: EmailAddress]
    string? Email
);
