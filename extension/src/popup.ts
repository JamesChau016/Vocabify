import {
  ApiRequestError,
  connectCaptureToken,
  DEFAULT_API_URL,
  DEFAULT_WEB_URL,
  disconnect,
  normalizeBaseUrl,
  readCachedUser,
  readConnection,
  validateConnection,
  type ConnectionSettings,
  type VocabifyUser,
} from "./auth.js";
import { clearLocalData, enqueueCapture, getCachedLists, type CachedList } from "./db.js";
import { refreshOwnedLists, syncNow } from "./sync.js";
import { uuidv7 } from "./uuid.js";
import { normalizeTerm } from "./normalize.js";

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

type StatusKind = "info" | "success" | "warning" | "error";

function setStatus(message: string, kind: StatusKind = "info", reveal = false): void {
  status.textContent = message;
  status.dataset.kind = kind;
  status.hidden = message.length === 0;
  status.setAttribute("role", kind === "error" ? "alert" : "status");
  status.setAttribute("aria-live", kind === "error" ? "assertive" : "polite");
  if (reveal) {
    requestAnimationFrame(() => status.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
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
    await populateLists(await refreshOwnedLists());
    setStatus("Connected. Your lists are ready.", "success", true);
  } catch (error) {
    setStatus(errorMessage(error, "Could not connect."), "error", true);
  } finally {
    button.disabled = false;
  }
}

async function disconnectFromPopup(): Promise<void> {
  await disconnect();
  await clearLocalData();
  showConnect();
  setStatus("Disconnected.", "success", true);
}

async function saveWord(): Promise<void> {
  const button = element<HTMLButtonElement>("save-word");
  button.disabled = true;
  setStatus("Saving word…", "info");
  try {
    const listId = element<HTMLSelectElement>("list-id").value;
    const termInput = element<HTMLInputElement>("term");
    const term = normalizeTerm(termInput.value);
    termInput.value = term;
    const definition = element<HTMLTextAreaElement>("definition").value.trim();
    const sentence = element<HTMLTextAreaElement>("sentence").value.trim();
    const sourceUrl = element<HTMLInputElement>("source-url").value.trim();
    if (!listId) throw new Error("Choose a destination list while online first.");
    if (!term) throw new Error("Enter a word to save.");
    if (term.length > 200) throw new Error("Word must be 200 characters or fewer.");
    if (definition.length > 2000) throw new Error("Definition must be 2,000 characters or fewer.");
    if (sentence.length > 4000) throw new Error("Sentence must be 4,000 characters or fewer.");
    if (sourceUrl.length > 2048) throw new Error("Source URL must be 2,048 characters or fewer.");
    if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) throw new Error("Source URL must use HTTP or HTTPS.");
    const wordId = uuidv7();
    const operationId = uuidv7();
    const queued = await enqueueCapture({
      operationId, wordId, listId, editedAt: new Date().toISOString(), deleted: false,
      fields: { term, definition: definition || null, sentence: sentence || null, sourceUrl: sourceUrl || null },
    }, { id: wordId, listId, term, definition: definition || null, sentence: sentence || null, sourceUrl: sourceUrl || null, deleted: false });
    if (!queued) {
      setStatus("Already saved. This word and source are in that list.", "warning", true);
      void syncNow().catch(() => undefined);
      return;
    }
    element<HTMLInputElement>("term").value = "";
    element<HTMLTextAreaElement>("definition").value = "";
    element<HTMLTextAreaElement>("sentence").value = "";
    try {
      await syncNow();
      setStatus("Saved and synced. The word is ready on Vocabify.", "success", true);
    } catch {
      setStatus("Saved offline. It will sync automatically when the connection returns.", "warning", true);
    }
  } catch (error) {
    setStatus(errorMessage(error, "Could not save word."), "error", true);
  } finally {
    button.disabled = false;
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function initialize(): Promise<void> {
  const connection = await readConnection();
  const cachedUser = await readCachedUser();
  if (!connection || !cachedUser) { showConnect(); return; }
  showCapture(cachedUser, connection);
  await populateLists(await getCachedLists());
  await prefillFromPage();
  try {
    const current = await validateConnection();
    if (!current) return;
    await populateLists(await refreshOwnedLists());
    await syncNow();
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      await clearLocalData();
      showConnect();
      setStatus("Reconnect with an active token.", "error", true);
    } else {
      setStatus("Offline capture is ready. Pending words will sync automatically.", "warning");
    }
  }
}

async function populateLists(lists: CachedList[]): Promise<void> {
  const select = element<HTMLSelectElement>("list-id");
  const previous = select.value;
  select.replaceChildren();
  for (const list of lists) {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.name;
    select.append(option);
  }
  if (lists.some(list => list.id === previous)) select.value = previous;
}

async function prefillFromPage(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const [capture] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selection = window.getSelection();
        const selected = selection?.toString().trim() ?? "";
        const context = selection?.anchorNode?.parentElement?.textContent?.trim() ?? selected;
        const escaped = selected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const sentence = selected ? (context.match(new RegExp(`[^.!?]*${escaped}[^.!?]*[.!?]?`, "i"))?.[0].trim() ?? context) : "";
        return {
          selected: selected.slice(0, 200),
          sentence: sentence.slice(0, 4000),
          sourceUrl: /^https?:$/i.test(location.protocol) ? location.href.slice(0, 2048) : "",
        };
      },
    });
    if (!capture.result) return;
    element<HTMLInputElement>("term").value = capture.result.selected;
    element<HTMLTextAreaElement>("sentence").value = capture.result.sentence;
    element<HTMLInputElement>("source-url").value = capture.result.sourceUrl;
  } catch { /* Browser internal pages cannot be inspected. */ }
}

void initialize();
