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
    public DbSet<ReviewState> ReviewStates => Set<ReviewState>();
    public DbSet<ReviewLog> ReviewLogs => Set<ReviewLog>();

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

        modelBuilder.Entity<PasswordResetToken>(e =>
        {
            e.HasIndex(token => token.TokenHash).IsUnique();
        });

        modelBuilder.Entity<ReviewState>(e =>
        {
            e.HasKey(r => new { r.UserId, r.WordId });
            e.HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.Word).WithMany().HasForeignKey(r => r.WordId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReviewLog>(e =>
        {
            e.HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.Word).WithMany().HasForeignKey(r => r.WordId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(r => new { r.UserId, r.WordId, r.ReviewedAt });
        });
    }
}
