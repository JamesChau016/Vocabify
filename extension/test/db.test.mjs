import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { applySync, clearLocalData, enqueueCapture, pendingOperations } from "../dist/db.js";
import { uuidv7 } from "../dist/uuid.js";
import { normalizeTerm } from "../dist/normalize.js";

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

test("normalizes Unicode, case, and whitespace before saving", () => {
  assert.equal(normalizeTerm("  ＣＡＦÉ\t  AU   LAIT  "), "café au lait");
});

test("repeated capture of the same page selection queues one word", async () => {
  const base = {
    listId: "019a7d9b-f000-7000-8000-000000000003",
    term: "offline", definition: null,
    sentence: "Captured while offline.", sourceUrl: "https://example.com/article", deleted: false,
  };
  for (const suffix of ["1", "2"]) {
    const wordId = `019a7d9b-f000-7000-8000-00000000000${suffix}`;
    await enqueueCapture({
      operationId: `019a7d9b-f000-7000-8000-00000000001${suffix}`,
      wordId, listId: base.listId, editedAt: "2026-11-13T00:00:00.000Z", deleted: false,
      fields: { term: base.term, sentence: base.sentence, sourceUrl: base.sourceUrl },
    }, { id: wordId, ...base });
  }
  assert.equal((await pendingOperations()).length, 1);
  await applySync(["019a7d9b-f000-7000-8000-000000000011"], [], 1);
  const afterSync = await enqueueCapture({
    operationId: "019a7d9b-f000-7000-8000-000000000013",
    wordId: "019a7d9b-f000-7000-8000-000000000003",
    listId: base.listId, editedAt: "2026-11-13T00:01:00.000Z", deleted: false,
    fields: { term: base.term, sentence: base.sentence, sourceUrl: base.sourceUrl },
  }, { id: "019a7d9b-f000-7000-8000-000000000003", ...base });
  assert.equal(afterSync, false);
  assert.equal((await pendingOperations()).length, 0);
});
