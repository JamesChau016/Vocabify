export interface LocalWord {
  id: string;
  listId: string;
  term: string;
  definition: string | null;
  sentence: string | null;
  sourceUrl: string | null;
  deleted: boolean;
}

export interface PendingOperation {
  operationId: string;
  wordId: string;
  listId: string;
  editedAt: string;
  deleted: boolean;
  fields?: Record<string, string | null>;
}

export interface CachedList { id: string; name: string; }

const DB_NAME = "vocabify-sync";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("words", { keyPath: "id" });
      db.createObjectStore("operations", { keyPath: "operationId" });
      db.createObjectStore("meta");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(stores: string[], mode: IDBTransactionMode, run: (tx: IDBTransaction) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(stores, mode);
    const result = await run(tx);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return result;
  } finally { db.close(); }
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueCapture(operation: PendingOperation, word: LocalWord): Promise<boolean> {
  return transaction(["words", "operations"], "readwrite", async tx => {
    const existing = await result(tx.objectStore("words").getAll() as IDBRequest<LocalWord[]>);
    if (existing.some(saved => !saved.deleted &&
      saved.listId === word.listId &&
      saved.term.trim().toLocaleLowerCase() === word.term.trim().toLocaleLowerCase() &&
      saved.sentence === word.sentence &&
      saved.sourceUrl === word.sourceUrl)) return false;
    tx.objectStore("words").put(word);
    tx.objectStore("operations").put(operation);
    return true;
  });
}

export async function pendingOperations(): Promise<PendingOperation[]> {
  return transaction(["operations"], "readonly", tx => result(tx.objectStore("operations").getAll()));
}

export async function applySync(acknowledged: string[], changes: LocalWord[], cursor: number): Promise<void> {
  await transaction(["words", "operations", "meta"], "readwrite", async tx => {
    for (const id of acknowledged) tx.objectStore("operations").delete(id);
    for (const word of changes) tx.objectStore("words").put(word);
    tx.objectStore("meta").put(cursor, "cursor");
  });
}

export async function getCursor(): Promise<number> {
  return transaction(["meta"], "readonly", async tx => (await result(tx.objectStore("meta").get("cursor")) as number | undefined) ?? 0);
}

export async function setCachedLists(lists: CachedList[]): Promise<void> {
  await transaction(["meta"], "readwrite", async tx => { tx.objectStore("meta").put(lists, "lists"); });
}

export async function getCachedLists(): Promise<CachedList[]> {
  return transaction(["meta"], "readonly", async tx => (await result(tx.objectStore("meta").get("lists")) as CachedList[] | undefined) ?? []);
}

export function clearLocalData(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Local database is busy."));
  });
}
