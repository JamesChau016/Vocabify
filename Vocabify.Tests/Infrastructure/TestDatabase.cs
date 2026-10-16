using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Vocabify.Data;

namespace Vocabify.Tests.Infrastructure;

/// <summary>
/// Builds an isolated <see cref="AppDbContext"/> backed by a private SQLite
/// in-memory database. Each instance owns its own open connection, so every
/// test gets a fresh, fully isolated schema that lives only as long as the
/// connection is open. SQLite is used (rather than the EF InMemory provider)
/// because the design relies on relational behavior such as cascade deletes
/// and the unique index on <c>User.Username</c>.
/// </summary>
public sealed class TestDatabase : IDisposable
{
    private readonly SqliteConnection _connection;

    public TestDatabase()
    {
        // "DataSource=:memory:" scopes the database to this single connection.
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var seedContext = new AppDbContext(options);
        seedContext.Database.EnsureCreated();

        _options = options;
    }

    private readonly DbContextOptions<AppDbContext> _options;

    /// <summary>
    /// Creates a new <see cref="AppDbContext"/> over the same isolated in-memory
    /// database. Call this to obtain a fresh change-tracker (e.g. to reload data
    /// and assert it was persisted) without losing the underlying data.
    /// </summary>
    public AppDbContext CreateContext() => new(_options);

    public void Dispose() => _connection.Dispose();
}
