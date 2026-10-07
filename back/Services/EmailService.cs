using MailKit.Net.Smtp;
using MimeKit;

namespace Vocabify.Services;

public class EmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config) => _config = config;

    public async Task SendPasswordResetAsync(string toEmail, string resetUrl)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("Vocabify", _config["Smtp:From"]!));
        message.To.Add(new MailboxAddress("", toEmail));
        message.Subject = "Reset your Vocabify password";
        message.Body = new TextPart("plain")
        {
            Text = $"You requested a password reset for your Vocabify account.\n\n" +
                   $"Click the link below to set a new password:\n\n{resetUrl}\n\n" +
                   $"This link expires in 1 hour. If you didn't request this, ignore this email."
        };

        using var client = new SmtpClient();
        await client.ConnectAsync(
            _config["Smtp:Host"]!,
            int.Parse(_config["Smtp:Port"]!),
            MailKit.Security.SecureSocketOptions.None);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}
