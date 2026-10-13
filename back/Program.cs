using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Vocabify.Data;
using Vocabify.Services;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

// Redis cache
builder.Services.AddStackExchangeRedisCache(options =>
    options.Configuration = builder.Configuration.GetConnectionString("Redis"));

// JWT authentication — reads token from the HttpOnly "auth" cookie
var jwtSecret = builder.Configuration["Jwt:Secret"]!;
var jwtIssuer = builder.Configuration["Jwt:Issuer"]!;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };

        // Read JWT from the "auth" HttpOnly cookie instead of the Authorization header
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                ctx.Token = ctx.Request.Cookies["auth"];
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddHttpClient();
builder.Services.AddControllers();
builder.Services.AddCors();

// Allow reading forwarded headers from the Next.js dev proxy
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// Handle CLI commands (e.g., dotnet run -- seed)
if (args.Contains("seed"))
{
    using var scope = builder.Services.BuildServiceProvider().CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbSeeder.SeedDemoDataAsync(db);
    Console.WriteLine("✓ Demo data seeded successfully");
    return;
}

var app = builder.Build();

app.UseForwardedHeaders();

// In dev, allow any origin with credentials so tools like Postman / REST clients work directly.
// In prod, lock this down to your actual domain.
var allowedOrigin = builder.Configuration["App:PublicUrl"] ?? "http://localhost:3000";
app.UseCors(policy => policy
    .WithOrigins(allowedOrigin)
    .AllowAnyMethod()
    .AllowAnyHeader()
    .AllowCredentials());

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
