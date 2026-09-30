using System.ComponentModel.DataAnnotations;

namespace Vocabify.DTOs;

public record AddWordItem(
    [property: Required(AllowEmptyStrings = false)]
    [property: StringLength(200, MinimumLength = 1)]
    [property: RegularExpression(@".*\S.*", ErrorMessage = "The Term field must contain at least one non-whitespace character.")]
    string Term,

    [property: StringLength(2000)]
    string? Definition
);
