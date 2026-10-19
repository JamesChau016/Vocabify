using System.ComponentModel.DataAnnotations;

namespace Vocabify.Models;

public class Word
{
    public Guid Id { get; set; }

    [Required]
    public string Term { get; set; } = string.Empty;

    public string? Definition { get; set; }

    public Guid VocabListId { get; set; }
    public VocabList VocabList { get; set; } = null!;
}
