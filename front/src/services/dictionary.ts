const BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";
const SUGGEST_BASE = "https://api.datamuse.com/sug";

export interface DictionaryResult {
  partOfSpeech: string;
  definition: string;
}

export interface Meaning {
  partOfSpeech: string;
  definition: string;
}

/**
 * Returns up to `max` word suggestions for the given prefix using Datamuse.
 * Returns [] on no match, abort, or network error.
 */
export async function suggestWords(
  prefix: string,
  signal?: AbortSignal,
  max = 8
): Promise<string[]> {
  try {
    const url = `${SUGGEST_BASE}?s=${encodeURIComponent(prefix.trim())}&max=${max}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const data: { word: string }[] = await res.json();
    return data.map((d) => d.word);
  } catch {
    return [];
  }
}

/**
 * Returns one entry per part of speech (first definition each).
 * Returns [] when the word is not found, the request is aborted, or any error occurs.
 */
export async function lookupAllMeanings(
  term: string,
  signal?: AbortSignal
): Promise<Meaning[]> {
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(term.trim())}`, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    const meanings: Meaning[] = [];
    for (const meaning of data[0]?.meanings ?? []) {
      const definition = meaning.definitions?.[0]?.definition;
      if (definition) meanings.push({ partOfSpeech: meaning.partOfSpeech ?? "", definition });
    }
    return meanings;
  } catch {
    return [];
  }
}

/**
 * Looks up the first definition and part of speech for a word.
 * Returns null if the word is not found or the request fails — callers
 * should treat null as "no result available" rather than an error.
 */
export async function lookupWord(term: string): Promise<DictionaryResult | null> {
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(term.trim())}`);
    if (!res.ok) return null;
    const data = await res.json();
    const meaning = data[0]?.meanings?.[0];
    if (!meaning) return null;
    const definition = meaning.definitions?.[0]?.definition;
    if (!definition) return null;
    return { partOfSpeech: meaning.partOfSpeech ?? "", definition };
  } catch {
    return null;
  }
}
