using System.ComponentModel.DataAnnotations;

namespace Vocabify.DTOs;

public record UpdateListRequest(
    [property: Required(AllowEmptyStrings = false)]
    [property: StringLength(100, MinimumLength = 1)]
    [property: RegularExpression(@".*\S.*", ErrorMessage = "The Name field must contain at least one non-whitespace character.")]
    string Name,

    [property: StringLength(500)]
    string? Description
);
