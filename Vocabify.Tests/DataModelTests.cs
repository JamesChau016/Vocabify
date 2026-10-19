using Microsoft.EntityFrameworkCore;
using Vocabify.Models;
using Vocabify.Tests.Infrastructure;

namespace Vocabify.Tests;

public class DataModelTests
{
    [Fact]
    public void A_list_persists_its_words_and_relationship()
    {
        using var database = new TestDatabase();
        var userId = Guid.NewGuid();
        var listId = Guid.NewGuid();

        using (var context = database.CreateContext())
        {
            context.Users.Add(new User
            {
                Id = userId,
                Username = "reader",
                Name = "Reader"
            });
            context.VocabLists.Add(new VocabList
            {
                Id = listId,
                UserId = userId,
                Name = "Reading",
                Words =
                [
                    new Word
                    {
                        Id = Guid.NewGuid(),
                        Term = "lucid",
                        Definition = "clear and easy to understand"
                    }
                ]
            });
            context.SaveChanges();
        }

        using var readContext = database.CreateContext();
        var list = readContext.VocabLists
            .Include(value => value.Words)
            .Single(value => value.Id == listId);

        var word = Assert.Single(list.Words);
        Assert.Equal("lucid", word.Term);
        Assert.Equal(listId, word.VocabListId);
    }

    [Fact]
    public void Deleting_a_list_cascades_to_its_words()
    {
        using var database = new TestDatabase();
        var userId = Guid.NewGuid();
        var listId = Guid.NewGuid();
        var wordId = Guid.NewGuid();

        using (var context = database.CreateContext())
        {
            context.Users.Add(new User
            {
                Id = userId,
                Username = "owner",
                Name = "Owner"
            });
            context.VocabLists.Add(new VocabList
            {
                Id = listId,
                UserId = userId,
                Name = "To delete",
                Words =
                [
                    new Word { Id = wordId, Term = "ephemeral" }
                ]
            });
            context.SaveChanges();
        }

        using (var context = database.CreateContext())
        {
            context.VocabLists.Remove(new VocabList { Id = listId });
            context.SaveChanges();
        }

        using var readContext = database.CreateContext();
        Assert.Null(readContext.Words.SingleOrDefault(word => word.Id == wordId));
    }

    [Fact]
    public void Deleting_a_user_cascades_to_lists_and_words()
    {
        using var database = new TestDatabase();
        var userId = Guid.NewGuid();
        var listId = Guid.NewGuid();
        var wordId = Guid.NewGuid();

        using (var context = database.CreateContext())
        {
            context.Users.Add(new User
            {
                Id = userId,
                Username = "cascade-owner",
                Name = "Cascade Owner",
                Lists =
                [
                    new VocabList
                    {
                        Id = listId,
                        Name = "Owned list",
                        Words =
                        [
                            new Word { Id = wordId, Term = "cascade" }
                        ]
                    }
                ]
            });
            context.SaveChanges();
        }

        using (var context = database.CreateContext())
        {
            context.Users.Remove(new User { Id = userId });
            context.SaveChanges();
        }

        using var readContext = database.CreateContext();
        Assert.Null(readContext.VocabLists.SingleOrDefault(list => list.Id == listId));
        Assert.Null(readContext.Words.SingleOrDefault(word => word.Id == wordId));
    }

    [Fact]
    public void Password_reset_tokens_persist_expiry_and_token_hash_is_unique()
    {
        using var database = new TestDatabase();
        var userId = Guid.NewGuid();
        var expiresAt = DateTime.UtcNow.AddHours(1);

        using var context = database.CreateContext();
        context.Users.Add(new User
        {
            Id = userId,
            Username = "reset-owner",
            Name = "Reset Owner",
            PasswordResetTokens =
            [
                new PasswordResetToken
                {
                    Id = Guid.NewGuid(),
                    TokenHash = "unique-hash",
                    ExpiresAt = expiresAt,
                    Used = false
                }
            ]
        });
        context.SaveChanges();

        var storedToken = context.PasswordResetTokens.Single();
        Assert.Equal(expiresAt, storedToken.ExpiresAt);
        Assert.False(storedToken.Used);

        context.PasswordResetTokens.Add(new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = "unique-hash",
            ExpiresAt = expiresAt.AddHours(1)
        });

        Assert.Throws<DbUpdateException>(() => context.SaveChanges());
    }

    [Fact]
    public void Deleting_a_user_cascades_to_password_reset_tokens()
    {
        using var database = new TestDatabase();
        var userId = Guid.NewGuid();
        var tokenId = Guid.NewGuid();

        using (var context = database.CreateContext())
        {
            context.Users.Add(new User
            {
                Id = userId,
                Username = "token-owner",
                Name = "Token Owner",
                PasswordResetTokens =
                [
                    new PasswordResetToken
                    {
                        Id = tokenId,
                        TokenHash = "reset-hash",
                        ExpiresAt = DateTime.UtcNow.AddHours(1)
                    }
                ]
            });
            context.SaveChanges();
        }

        using (var context = database.CreateContext())
        {
            context.Users.Remove(new User { Id = userId });
            context.SaveChanges();
        }

        using var readContext = database.CreateContext();
        Assert.Null(readContext.PasswordResetTokens.SingleOrDefault(token => token.Id == tokenId));
    }

    [Fact]
    public void Usernames_are_unique()
    {
        using var database = new TestDatabase();

        using var context = database.CreateContext();
        context.Users.AddRange(
            new User { Id = Guid.NewGuid(), Username = "duplicate", Name = "First" },
            new User { Id = Guid.NewGuid(), Username = "duplicate", Name = "Second" });

        Assert.Throws<DbUpdateException>(() => context.SaveChanges());
    }
}
