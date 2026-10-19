using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vocabify.Migrations
{
    /// <inheritdoc />
    public partial class AddUniquePasswordResetTokenHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_TokenHash",
                table: "PasswordResetTokens",
                column: "TokenHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PasswordResetTokens_TokenHash",
                table: "PasswordResetTokens");
        }
    }
}
