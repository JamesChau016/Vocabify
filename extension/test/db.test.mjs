import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { applySync, clearLocalData, enqueueCapture, pendingOperations } from "../dist/db.js";
import { uuidv7 } from "../dist/uuid.js";

afterEach(async () => { await clearLocalData(); });

test("persists offline captures until the server acknowledges them", async () => {
  const operation = {
    operationId: "019a7d9b-f000-7000-8000-000000000001",
    wordId: "019a7d9b-f000-7000-8000-000000000002",
    listId: "019a7d9b-f000-7000-8000-000000000003",
    editedAt: "2026-11-13T00:00:00.000Z",
    deleted: false,
    fields: { term: "offline", sentence: "Captured while offline." },
  };
  await enqueueCapture(operation, {
    id: operation.wordId,
    listId: operation.listId,
    term: "offline",
    definition: null,
    sentence: "Captured while offline.",
    sourceUrl: "https://example.com/article",
    deleted: false,
  });

  assert.deepEqual(await pendingOperations(), [operation]);
  await applySync([operation.operationId], [], 1);
  assert.deepEqual(await pendingOperations(), []);
});

test("generates UUIDv7 identifiers", () => {
  assert.match(uuidv7(), /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
