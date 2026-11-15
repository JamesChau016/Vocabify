import axios from "axios";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ApiTokensPage from "../app/settings/tokens/page";

vi.mock("@/context/AuthContext", () => {
  const currentUser = { username: "alice", name: "Alice" };
  return { useAuth: () => ({ currentUser, sessionLoading: false }) };
});
vi.mock("@/components/Header", () => ({ default: () => <header>Header</header> }));

const token = {
  id: "token-id", name: "My extension", scope: "capture",
  createdAt: "2026-11-04T00:00:00Z", expiresAt: "2027-02-02T00:00:00Z",
  revokedAt: null, token: "vocab_selector.secret",
};

describe("API token settings", () => {
  it("creates a token, shows the secret once, and never puts it in storage", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    vi.mocked(axios.post).mockResolvedValue({ data: token });
    render(<ApiTokensPage />);
    fireEvent.change(screen.getByLabelText("Token name"), { target: { value: "My extension" } });
    fireEvent.click(screen.getByRole("button", { name: "Create token" }));
    expect(await screen.findByTestId("new-token")).toHaveTextContent(token.token);
    expect(axios.post).toHaveBeenCalledWith("/api/auth/tokens", { name: "My extension" });
    expect(localStorage.length).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByText(token.token)).not.toBeInTheDocument();
  });

  it("lists only metadata and revokes a token", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [{ ...token, token: undefined }] });
    vi.mocked(axios.delete).mockResolvedValue({});
    render(<ApiTokensPage />);
    expect(await screen.findByText("My extension")).toBeInTheDocument();
    expect(screen.queryByText(token.token)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(screen.getByText("Revoked")).toBeInTheDocument());
    expect(axios.delete).toHaveBeenCalledWith("/api/auth/tokens/token-id");
  });
});
