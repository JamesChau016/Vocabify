using System.ComponentModel.DataAnnotations;

namespace Vocabify.DTOs;

public record AddWordItem
{
    [Required(AllowEmptyStrings = false)]
    [StringLength(200, MinimumLength = 1)]
    [RegularExpression(@".*\S.*", ErrorMessage = "The Term field must contain at least one non-whitespace character.")]
    public required string Term { get; init; }

    [StringLength(2000)]
    public string? Definition { get; init; }
}
