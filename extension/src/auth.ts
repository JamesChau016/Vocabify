const TOKEN_KEY = "vocabify.captureToken";
const API_KEY = "vocabify.apiBaseUrl";
const WEB_KEY = "vocabify.webBaseUrl";

export const DEFAULT_API_URL = "http://localhost:3006/";
export const DEFAULT_WEB_URL = "http://localhost:3000/";

export interface ConnectionSettings {
  apiBaseUrl: string;
  webBaseUrl: string;
}

export interface VocabifyUser {
  username: string;
  name: string;
}

interface StoredConnection extends ConnectionSettings {
  token: string;
}

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function normalizeBaseUrl(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("Use HTTPS for the API URL.");
  }
  return url.href.endsWith("/") ? url.href : `${url.href}/`;
}

export async function connectCaptureToken(
  apiUrl: string,
  webUrl: string,
  rawToken: string,
): Promise<VocabifyUser> {
  const apiBaseUrl = normalizeBaseUrl(apiUrl);
  const webBaseUrl = normalizeBaseUrl(webUrl);
  const token = rawToken.trim();
  if (!/^vocab_[a-f0-9]{24}\.[a-f0-9]{64}$/.test(token)) {
    throw new Error("Enter a valid Vocabify capture token.");
  }

  const originPermission = `${new URL(apiBaseUrl).origin}/*`;
  const granted = await chrome.permissions.request({ origins: [originPermission] });
  if (!granted) throw new Error("Allow access to your Vocabify API to connect.");

  const user = await request<VocabifyUser>(apiBaseUrl, "api/auth/me", token);
  await chrome.storage.local.set({ [TOKEN_KEY]: token, [API_KEY]: apiBaseUrl, [WEB_KEY]: webBaseUrl });
  return user;
}

export async function readConnection(): Promise<StoredConnection | null> {
  const stored = await chrome.storage.local.get([TOKEN_KEY, API_KEY, WEB_KEY]);
  const { [TOKEN_KEY]: token, [API_KEY]: apiBaseUrl, [WEB_KEY]: webBaseUrl } = stored;
  if (typeof token !== "string" || typeof apiBaseUrl !== "string") return null;
  return {
    token,
    apiBaseUrl,
    webBaseUrl: typeof webBaseUrl === "string" ? webBaseUrl : DEFAULT_WEB_URL,
  };
}

export async function validateConnection(): Promise<{ connection: StoredConnection; user: VocabifyUser } | null> {
  const connection = await readConnection();
  if (!connection) return null;
  try {
    const user = await request<VocabifyUser>(connection.apiBaseUrl, "api/auth/me", connection.token);
    return { connection, user };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      await chrome.storage.local.remove(TOKEN_KEY);
    }
    throw error;
  }
}

export async function disconnect(): Promise<void> {
  await chrome.storage.local.remove([TOKEN_KEY, API_KEY, WEB_KEY]);
}

export async function addWordToList(
  listId: string,
  term: string,
  definition: string,
): Promise<void> {
  const connection = await readConnection();
  if (!connection) throw new Error("Connect your Vocabify account first.");
  await request<unknown>(
    connection.apiBaseUrl,
    `api/lists/${encodeURIComponent(listId)}/words`,
    connection.token,
    {
      method: "POST",
      body: JSON.stringify([{ term, definition: definition || null }]),
    },
  );
}

async function request<T>(
  baseUrl: string,
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(new URL(path, baseUrl), {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const message = response.status === 401
      ? "Token is invalid, expired, or revoked."
      : response.status === 403
        ? "This token cannot perform that action."
        : `Request failed (${response.status}).`;
    throw new ApiRequestError(message, response.status);
  }
  return (response.status === 204 ? null : await response.json()) as T;
}
