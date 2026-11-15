"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import apiTokens, { type ApiTokenMetadata, type CreatedApiToken } from "@/services/apiTokens";
import styles from "./page.module.css";

export default function ApiTokensPage() {
  const { currentUser, sessionLoading } = useAuth();
  const [tokens, setTokens] = useState<ApiTokenMetadata[]>([]);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<CreatedApiToken | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    apiTokens.list().then(setTokens).catch(() => setError("Could not load tokens."));
  }, [currentUser]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    setCreated(null);
    try {
      const result = await apiTokens.create(name.trim());
      setCreated(result);
      setTokens((previous) => [{
        id: result.id, name: result.name, scope: result.scope,
        createdAt: result.createdAt, expiresAt: result.expiresAt,
        revokedAt: result.revokedAt,
      }, ...previous]);
      setName("");
      setCopied(false);
    } catch {
      setError("Could not create token. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setError("");
    setBusy(true);
    try {
      await apiTokens.revoke(id);
      setTokens((previous) => previous.map((token) =>
        token.id === id ? { ...token, revokedAt: new Date().toISOString() } : token));
      if (created?.id === id) setCreated(null);
    } catch {
      setError("Could not revoke token. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.token);
      setCopied(true);
    } catch {
      setError("Copy failed. Select and copy the token manually.");
    }
  };

  return <>
    <Header />
    <main className={styles.main}>
      <p className={styles.eyebrow}>Settings / Extension access</p>
      <h1>API tokens</h1>
      <p>Create a capture token for an extension. It can identify your account and add words to your lists. Tokens expire after 90 days.</p>
      {sessionLoading ? <p>Loading session…</p> : !currentUser ?
        <p><Link href="/login">Sign in</Link> to manage tokens.</p> : <>
          <form onSubmit={create} className={styles.form}>
            <label htmlFor="token-name">Token name</label>
            <div className={styles.formRow}>
              <input id="token-name" value={name} onChange={(event) => setName(event.target.value)}
                maxLength={100} required placeholder="My extension" />
              <button disabled={busy || !name.trim()}>Create token</button>
            </div>
          </form>
          {created && <section className={styles.secret} aria-label="New token">
            <h2>Save this token now</h2>
            <p>It will be shown only once. Store it in your extension’s secure settings.</p>
            <code data-testid="new-token">{created.token}</code>
            <div className={styles.actions}>
              <button type="button" onClick={copy}>{copied ? "Copied" : "Copy token"}</button>
              <button type="button" onClick={() => setCreated(null)}>Done</button>
            </div>
          </section>}
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <section className={styles.list}>
            <h2>Your tokens</h2>
            {tokens.length === 0 ? <p>No tokens yet.</p> : <ul>
              {tokens.map((token) => {
                const expired = new Date(token.expiresAt) <= new Date();
                const status = token.revokedAt ? "Revoked" : expired ? "Expired" : "Active";
                return <li key={token.id}>
                  <div><strong>{token.name}</strong><span className={styles.status}>{status}</span>
                    <p>Scope: {token.scope} · Expires {new Date(token.expiresAt).toLocaleDateString()}</p></div>
                  {!token.revokedAt && <button type="button" disabled={busy} onClick={() => revoke(token.id)}>Revoke</button>}
                </li>;
              })}
            </ul>}
          </section>
        </>}
    </main>
  </>;
}
