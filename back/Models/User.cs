using System.ComponentModel.DataAnnotations;

namespace Vocabify.Models;

public class User
{
    public Guid Id { get; set; }

    [Required, MinLength(3)]
    public string Username { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string? Email { get; set; }

    // null for password-auth users; "google" or "github" for OAuth users
    public string? OAuthProvider { get; set; }
    public string? OAuthId { get; set; }

    public List<VocabList> Lists { get; set; } = [];
    public List<PasswordResetToken> PasswordResetTokens { get; set; } = [];
}
