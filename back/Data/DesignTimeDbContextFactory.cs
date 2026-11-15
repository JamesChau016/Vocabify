using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Vocabify.Data;

/// <summary>
/// Lets <c>dotnet ef</c> create an <see cref="AppDbContext"/> at design time
/// without booting the full application host (which tries to connect to Redis).
/// The connection string here is only used for migration generation — the
/// actual runtime connection comes from <c>Program.cs</c> / appsettings.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=vocabify;Username=vocabify;Password=vocabify")
            .Options;

        return new AppDbContext(options);
    }
}
