using System.ComponentModel.DataAnnotations;

namespace Vocabify.DTOs;

public record CreateApiTokenRequest([Required, StringLength(100, MinimumLength = 1)] string Name);

public record ApiTokenResponse(Guid Id, string Name, string Scope, DateTime CreatedAt,
    DateTime ExpiresAt, DateTime? RevokedAt);

public record CreatedApiTokenResponse(Guid Id, string Name, string Scope, DateTime CreatedAt,
    DateTime ExpiresAt, DateTime? RevokedAt, string Token);
