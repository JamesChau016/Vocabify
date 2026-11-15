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
    public DbSet<ApiToken> ApiTokens => Set<ApiToken>();
    public DbSet<ReviewState> ReviewStates => Set<ReviewState>();
    public DbSet<ReviewLog> ReviewLogs => Set<ReviewLog>();
    public DbSet<SyncOperationReceipt> SyncOperationReceipts => Set<SyncOperationReceipt>();
    public DbSet<SyncChange> SyncChanges => Set<SyncChange>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.Property(u => u.SyncVersion).IsConcurrencyToken();
            e.HasIndex(u => u.Username).IsUnique();
            e.HasMany(u => u.Lists)
             .WithOne(l => l.User)
             .HasForeignKey(l => l.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasMany(u => u.PasswordResetTokens)
             .WithOne(t => t.User)
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasMany(u => u.ApiTokens)
             .WithOne(t => t.User)
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ApiToken>(e =>
        {
            e.HasIndex(t => t.Selector).IsUnique();
            e.HasIndex(t => t.UserId);
        });

        modelBuilder.Entity<VocabList>(e =>
        {
            e.HasMany(l => l.Words)
             .WithOne(w => w.VocabList)
             .HasForeignKey(w => w.VocabListId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Word>().HasQueryFilter(x => !x.IsDeleted);

        modelBuilder.Entity<SyncOperationReceipt>(e =>
        {
            e.HasKey(x => new { x.UserId, x.OperationId });
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SyncChange>(e =>
        {
            e.HasKey(x => new { x.UserId, x.Version });
            e.HasIndex(x => new { x.UserId, x.WordId });
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
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
