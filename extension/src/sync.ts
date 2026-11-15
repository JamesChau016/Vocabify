import { readConnection, readCachedUser, request } from "./auth.js";
import { applySync, getCursor, pendingOperations, setCachedLists, type CachedList, type LocalWord } from "./db.js";

interface PushResponse { acknowledgedOperationIds: string[]; cursor: number; }
interface PullChange extends Omit<LocalWord, "id"> { wordId: string; version: number; changedAt: string; }
interface PullResponse { changes: PullChange[]; nextCursor: number; hasMore: boolean; }
interface ApiList { id: string; name: string; user: { username: string }; }

export async function syncNow(): Promise<void> {
  const connection = await readConnection();
  if (!connection) return;
  const pending = await pendingOperations();
  let acknowledged: string[] = [];
  if (pending.length > 0) {
    const pushed = await request<PushResponse>(connection.apiBaseUrl, "api/sync/push", connection.token, {
      method: "POST", body: JSON.stringify({ operations: pending.slice(0, 100) }),
    });
    acknowledged = pushed.acknowledgedOperationIds;
  }

  let cursor = await getCursor();
  do {
    const pulled = await request<PullResponse>(connection.apiBaseUrl, `api/sync/pull?cursor=${cursor}`, connection.token);
    const words = pulled.changes.map(change => ({
      id: change.wordId, listId: change.listId, term: change.term,
      definition: change.definition, sentence: change.sentence, sourceUrl: change.sourceUrl, deleted: change.deleted,
    }));
    cursor = pulled.nextCursor;
    await applySync(acknowledged, words, cursor);
    acknowledged = [];
    if (!pulled.hasMore) break;
  } while (true);
}

export async function refreshOwnedLists(): Promise<CachedList[]> {
  const connection = await readConnection();
  const user = await readCachedUser();
  if (!connection || !user) return [];
  const lists = await request<ApiList[]>(connection.apiBaseUrl, "api/lists", connection.token);
  const owned = lists.filter(list => list.user.username === user.username).map(list => ({ id: list.id, name: list.name }));
  await setCachedLists(owned);
  return owned;
}
