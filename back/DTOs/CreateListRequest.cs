using System.ComponentModel.DataAnnotations;

namespace Vocabify.DTOs;

public record CreateListRequest
{
    [Required(AllowEmptyStrings = false)]
    [StringLength(100, MinimumLength = 1)]
    [RegularExpression(@".*\S.*", ErrorMessage = "The Name field must contain at least one non-whitespace character.")]
    public required string Name { get; init; }

    [StringLength(500)]
    public string? Description { get; init; }
}
