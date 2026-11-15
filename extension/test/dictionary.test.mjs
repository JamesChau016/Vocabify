import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { formatDefinition, lookupWord, suggestWords } from "../dist/dictionary.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("suggestions use the website endpoint and return at most eight words", async () => {
  let calledUrl = "";
  globalThis.fetch = async url => {
    calledUrl = String(url);
    return { ok: true, json: async () => Array.from({ length: 10 }, (_, i) => ({ word: `word${i}` })) };
  };
  const words = await suggestWords("two words");
  assert.equal(words.length, 8);
  assert.match(calledUrl, /api\.datamuse\.com\/sug\?s=two%20words&max=8/);
});

test("selected word receives the first definition in the website format", async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => [{ meanings: [
    { partOfSpeech: "noun", definitions: [{ definition: "a short-lived thing" }] },
  ] }] });
  const result = await lookupWord("ephemeral");
  assert.equal(formatDefinition(result), "(noun) a short-lived thing");
});

test("lookup failure leaves the definition empty for manual capture", async () => {
  globalThis.fetch = async () => { throw new Error("offline"); };
  assert.deepEqual(await suggestWords("word"), []);
  assert.equal(await lookupWord("word"), null);
});
