using Microsoft.EntityFrameworkCore;
using Vocabify.Models;

namespace Vocabify.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<VocabList> VocabLists => Set<VocabList>();
    public DbSet<Word> Words => Set<Word>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique();
            e.HasMany(u => u.Lists)
             .WithOne(l => l.User)
             .HasForeignKey(l => l.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasMany(u => u.PasswordResetTokens)
             .WithOne(t => t.User)
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<VocabList>(e =>
        {
            e.HasMany(l => l.Words)
             .WithOne(w => w.VocabList)
             .HasForeignKey(w => w.VocabListId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
