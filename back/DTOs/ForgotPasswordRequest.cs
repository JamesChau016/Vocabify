using System.ComponentModel.DataAnnotations;

namespace Vocabify.DTOs;

public record ForgotPasswordRequest(
    [property: Required]
    [property: EmailAddress]
    string Email
);
