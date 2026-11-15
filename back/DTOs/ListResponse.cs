namespace Vocabify.DTOs;

public record WordResponse(Guid Id, string Term, string? Definition, string? Sentence, string? SourceUrl);

public record ListUserResponse(string Username, string Name);

public record ListResponse(
    Guid Id,
    string Name,
    string Author,
    string? Description,
    DateTime DateCreated,
    ListUserResponse User,
    List<WordResponse> List
);
