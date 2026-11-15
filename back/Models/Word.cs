using System.ComponentModel.DataAnnotations;

namespace Vocabify.Models;

public class Word
{
    public Guid Id { get; set; }

    [Required]
    public string Term { get; set; } = string.Empty;

    public string? Definition { get; set; }

    public string? Sentence { get; set; }

    public string? SourceUrl { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset TermUpdatedAt { get; set; }
    public Guid TermOperationId { get; set; }
    public DateTimeOffset DefinitionUpdatedAt { get; set; }
    public Guid DefinitionOperationId { get; set; }
    public DateTimeOffset SentenceUpdatedAt { get; set; }
    public Guid SentenceOperationId { get; set; }
    public DateTimeOffset SourceUrlUpdatedAt { get; set; }
    public Guid SourceUrlOperationId { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeleteOperationId { get; set; }

    public Guid VocabListId { get; set; }
    public VocabList VocabList { get; set; } = null!;
}
