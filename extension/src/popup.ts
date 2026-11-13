import {
  addWordToList,
  ApiRequestError,
  connectCaptureToken,
  DEFAULT_API_URL,
  DEFAULT_WEB_URL,
  disconnect,
  normalizeBaseUrl,
  validateConnection,
  type ConnectionSettings,
  type VocabifyUser,
} from "./auth.js";

const connectView = element<HTMLElement>("connect-view");
const captureView = element<HTMLElement>("capture-view");
const apiInput = element<HTMLInputElement>("api-url");
const webInput = element<HTMLInputElement>("web-url");
const tokenInput = element<HTMLInputElement>("token");
const manageLink = element<HTMLAnchorElement>("manage-link");
const status = element<HTMLElement>("status");
const account = element<HTMLElement>("account");

element<HTMLButtonElement>("connect").addEventListener("click", connect);
element<HTMLButtonElement>("disconnect").addEventListener("click", disconnectFromPopup);
element<HTMLButtonElement>("save-word").addEventListener("click", saveWord);
apiInput.addEventListener("input", updateManageLink);
webInput.addEventListener("input", updateManageLink);

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing popup element: ${id}`);
  return found as T;
}

function setStatus(message: string, isError = false): void {
  status.textContent = message;
  status.dataset.error = String(isError);
}

function updateManageLink(): void {
  try {
    manageLink.href = new URL("settings/tokens", normalizeBaseUrl(webInput.value)).href;
  } catch {
    manageLink.removeAttribute("href");
  }
}

function currentSettings(): ConnectionSettings {
  return {
    apiBaseUrl: normalizeBaseUrl(apiInput.value),
    webBaseUrl: normalizeBaseUrl(webInput.value),
  };
}

function showCapture(user: VocabifyUser, settings: ConnectionSettings): void {
  connectView.hidden = true;
  captureView.hidden = false;
  account.textContent = `Connected as ${user.name || user.username}`;
  apiInput.value = settings.apiBaseUrl;
  webInput.value = settings.webBaseUrl;
  updateManageLink();
}

function showConnect(apiBaseUrl = DEFAULT_API_URL, webBaseUrl = DEFAULT_WEB_URL): void {
  captureView.hidden = true;
  connectView.hidden = false;
  apiInput.value = apiBaseUrl;
  webInput.value = webBaseUrl;
  updateManageLink();
}

async function connect(): Promise<void> {
  const button = element<HTMLButtonElement>("connect");
  button.disabled = true;
  setStatus("Checking token…");
  try {
    const settings = currentSettings();
    const user = await connectCaptureToken(settings.apiBaseUrl, settings.webBaseUrl, tokenInput.value);
    tokenInput.value = "";
    showCapture(user, settings);
    setStatus("Connected.");
  } catch (error) {
    setStatus(errorMessage(error, "Could not connect."), true);
  } finally {
    button.disabled = false;
  }
}

async function disconnectFromPopup(): Promise<void> {
  await disconnect();
  showConnect();
  setStatus("Disconnected.");
}

async function saveWord(): Promise<void> {
  const button = element<HTMLButtonElement>("save-word");
  button.disabled = true;
  setStatus("Saving word…");
  try {
    const listId = element<HTMLInputElement>("list-id").value.trim();
    const term = element<HTMLInputElement>("term").value.trim();
    const definition = element<HTMLTextAreaElement>("definition").value.trim();
    if (!listId) throw new Error("Enter the ID of one of your lists.");
    if (!term) throw new Error("Enter a word to save.");
    await addWordToList(listId, term, definition);
    element<HTMLInputElement>("term").value = "";
    element<HTMLTextAreaElement>("definition").value = "";
    setStatus("Word saved to your list.");
  } catch (error) {
    setStatus(errorMessage(error, "Could not save word."), true);
  } finally {
    button.disabled = false;
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function initialize(): Promise<void> {
  try {
    const current = await validateConnection();
    if (!current) {
      showConnect();
      return;
    }
    showCapture(current.user, current.connection);
  } catch (error) {
    showConnect();
    const message = error instanceof ApiRequestError && error.status === 401
      ? "Reconnect with an active token."
      : "Could not reach the API. Check the URL and try again.";
    setStatus(message, true);
  }
}

void initialize();
