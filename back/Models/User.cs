using System.ComponentModel.DataAnnotations;

namespace Vocabify.Models;

public class User
{
    public Guid Id { get; set; }

    [Required, MinLength(3)]
    public string Username { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public List<VocabList> Lists { get; set; } = [];
}
