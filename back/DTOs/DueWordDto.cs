namespace Vocabify.DTOs;

public record DueWordDto(Guid Id, string Term, string? Definition, Guid ListId, ReviewStateDto? ReviewState);
