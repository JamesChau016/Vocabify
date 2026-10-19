import axios from "axios";
import { describe, expect, it, vi } from "vitest";
import authService from "../services/auth";

describe("auth service", () => {
  it("logs in and returns the authenticated user", async () => {
    const credentials = { username: "alice", password: "secret" };
    const user = { username: "alice", name: "Alice" };
    vi.mocked(axios.post).mockResolvedValue({ data: user });

    await expect(authService.login(credentials)).resolves.toEqual(user);
    expect(axios.post).toHaveBeenCalledWith("/api/auth/login", credentials);
  });

  it("logs out", async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: undefined });

    await expect(authService.logout()).resolves.toBeUndefined();
    expect(axios.post).toHaveBeenCalledWith("/api/auth/logout");
  });

  it("gets the current user", async () => {
    const user = { username: "alice", name: "Alice" };
    vi.mocked(axios.get).mockResolvedValue({ data: user });

    await expect(authService.me()).resolves.toEqual(user);
    expect(axios.get).toHaveBeenCalledWith("/api/auth/me");
  });

  it("gets an OAuth provider URL", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { url: "https://accounts.example.test/oauth" },
    });

    await expect(authService.getOAuthUrl("google")).resolves.toBe(
      "https://accounts.example.test/oauth",
    );
    expect(axios.get).toHaveBeenCalledWith("/api/auth/oauth/google");
  });

  it("requests a password reset email", async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { message: "If the account exists, an email was sent." },
    });

    await expect(authService.forgotPassword("alice@example.com")).resolves.toBe(
      "If the account exists, an email was sent.",
    );
    expect(axios.post).toHaveBeenCalledWith("/api/auth/forgot-password", {
      email: "alice@example.com",
    });
  });

  it("resets a password", async () => {
    const request = {
      tokenId: "token-id",
      token: "token-value",
      newPassword: "new-secret",
    };
    vi.mocked(axios.post).mockResolvedValue({
      data: { message: "Password reset successfully." },
    });

    await expect(
      authService.resetPassword(request.tokenId, request.token, request.newPassword),
    ).resolves.toBe("Password reset successfully.");
    expect(axios.post).toHaveBeenCalledWith("/api/auth/reset-password", request);
  });
});
