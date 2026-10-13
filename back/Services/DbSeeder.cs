using Vocabify.Data;
using Vocabify.Models;

namespace Vocabify.Services;

public static class DbSeeder
{
    public static async Task SeedDemoDataAsync(AppDbContext db)
    {
        // Skip if demo users already exist
        if (await db.Users.AnyAsync(u => u.Username.StartsWith("demo_")))
            return;

        var demoUsers = new[]
        {
            new User
            {
                Id = Guid.NewGuid(),
                Username = "demo_spanish",
                Name = "Spanish Learner",
                Email = "demo.spanish@vocabify.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123", 10),
                OAuthProvider = null,
                OAuthId = null
            },
            new User
            {
                Id = Guid.NewGuid(),
                Username = "demo_french",
                Name = "French Explorer",
                Email = "demo.french@vocabify.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123", 10),
                OAuthProvider = null,
                OAuthId = null
            }
        };

        foreach (var user in demoUsers)
        {
            db.Users.Add(user);
        }

        await db.SaveChangesAsync();

        // Add vocab lists and words for each demo user
        var spanishUser = demoUsers[0];
        var frenchUser = demoUsers[1];

        var spanishList = new VocabList
        {
            Id = Guid.NewGuid(),
            Name = "Spanish Verbs",
            Author = spanishUser.Name,
            Description = "Common Spanish verbs for beginners",
            DateCreated = DateTime.UtcNow,
            UserId = spanishUser.Id,
            Words = new List<Word>
            {
                new() { Term = "hablar", Definition = "to speak" },
                new() { Term = "comer", Definition = "to eat" },
                new() { Term = "vivir", Definition = "to live" },
                new() { Term = "amar", Definition = "to love" },
                new() { Term = "aprender", Definition = "to learn" }
            }
        };

        var spanishList2 = new VocabList
        {
            Id = Guid.NewGuid(),
            Name = "Spanish Animals",
            Author = spanishUser.Name,
            Description = "Animals in Spanish",
            DateCreated = DateTime.UtcNow,
            UserId = spanishUser.Id,
            Words = new List<Word>
            {
                new() { Term = "gato", Definition = "cat" },
                new() { Term = "perro", Definition = "dog" },
                new() { Term = "pájaro", Definition = "bird" },
                new() { Term = "pez", Definition = "fish" },
                new() { Term = "león", Definition = "lion" }
            }
        };

        var frenchList = new VocabList
        {
            Id = Guid.NewGuid(),
            Name = "French Adjectives",
            Author = frenchUser.Name,
            Description = "Common French adjectives",
            DateCreated = DateTime.UtcNow,
            UserId = frenchUser.Id,
            Words = new List<Word>
            {
                new() { Term = "beau", Definition = "beautiful" },
                new() { Term = "petit", Definition = "small" },
                new() { Term = "grand", Definition = "big" },
                new() { Term = "bon", Definition = "good" },
                new() { Term = "mauvais", Definition = "bad" }
            }
        };

        db.VocabLists.Add(spanishList);
        db.VocabLists.Add(spanishList2);
        db.VocabLists.Add(frenchList);

        await db.SaveChangesAsync();
    }
}
