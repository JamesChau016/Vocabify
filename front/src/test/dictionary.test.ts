import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupAllMeanings, lookupWord, suggestWords } from "../services/dictionary";

describe("dictionary service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("encodes the prefix and returns suggested words", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ word: "hello" }, { word: "help" }])),
    );

    await expect(suggestWords("hel lo")).resolves.toEqual(["hello", "help"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.datamuse.com/sug?s=hel%20lo&max=8",
      { signal: undefined },
    );
  });

  it("returns the first definition and part of speech", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            meanings: [
              {
                partOfSpeech: "noun",
                definitions: [{ definition: "a test definition" }],
              },
            ],
          },
        ]),
      ),
    );

    await expect(lookupWord(" word ")).resolves.toEqual({
      partOfSpeech: "noun",
      definition: "a test definition",
    });
  });

  it("returns one definition for each available meaning", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            meanings: [
              {
                partOfSpeech: "noun",
                definitions: [{ definition: "a thing" }],
              },
              {
                partOfSpeech: "verb",
                definitions: [{ definition: "to do a thing" }],
              },
            ],
          },
        ]),
      ),
    );

    await expect(lookupAllMeanings("test")).resolves.toEqual([
      { partOfSpeech: "noun", definition: "a thing" },
      { partOfSpeech: "verb", definition: "to do a thing" },
    ]);
  });

  it("returns an empty result when the lookup request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 404 }),
    );

    await expect(lookupAllMeanings("missing")).resolves.toEqual([]);
    await expect(lookupWord("missing")).resolves.toBeNull();
  });

  it("returns null and an empty list when fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    await expect(lookupWord("test")).resolves.toBeNull();
    await expect(lookupAllMeanings("test")).resolves.toEqual([]);
  });
});
