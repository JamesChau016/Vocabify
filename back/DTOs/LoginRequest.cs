using System.ComponentModel.DataAnnotations;

namespace Vocabify.DTOs;

public record LoginRequest(
    [property: Required]
    [property: StringLength(256, MinimumLength = 1, ErrorMessage = "Username must be between 1 and 256 characters.")]
    string Username,

    [property: Required]
    [property: StringLength(256, MinimumLength = 1, ErrorMessage = "Password must be between 1 and 256 characters.")]
    string Password
);
