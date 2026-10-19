using Vocabify.Models;

namespace Vocabify.Tests.Infrastructure;

/// <summary>
/// Trivial tests that verify the test project is wired up correctly: the
/// project builds, xUnit runs, and the <see cref="TestDatabase"/> fixture
/// produces an isolated, working <c>AppDbContext</c>.
/// </summary>
public class TestDatabaseTests
{
    [Fact]
    public void Fixture_creates_a_usable_context()
    {
        using var db = new TestDatabase();
        using var context = db.CreateContext();

        Assert.Empty(context.Users);
    }

    [Fact]
    public void Fixture_persists_and_reloads_entities_across_contexts()
    {
        using var db = new TestDatabase();

        var userId = Guid.NewGuid();
        using (var write = db.CreateContext())
        {
            write.Users.Add(new User
            {
                Id = userId,
                Username = "alice",
                Name = "Alice",
                PasswordHash = "hash"
            });
            write.SaveChanges();
        }

        using var read = db.CreateContext();
        var reloaded = Assert.Single(read.Users);
        Assert.Equal("alice", reloaded.Username);
        Assert.Equal(userId, reloaded.Id);
    }

    [Fact]
    public void Fixture_instances_are_isolated_from_each_other()
    {
        using var first = new TestDatabase();
        using (var context = first.CreateContext())
        {
            context.Users.Add(new User { Id = Guid.NewGuid(), Username = "bob", Name = "Bob" });
            context.SaveChanges();
        }

        using var second = new TestDatabase();
        using var secondContext = second.CreateContext();

        // A separate TestDatabase must not see the first database's data.
        Assert.Empty(secondContext.Users);
    }
}
