using System.ComponentModel.DataAnnotations;

namespace Vocabify.Models;

public class VocabList
{
    public Guid Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    public string Author { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public List<Word> Words { get; set; } = [];
}
