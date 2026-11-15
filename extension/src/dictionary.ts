const DICTIONARY_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";
const SUGGEST_BASE = "https://api.datamuse.com/sug";

export interface DictionaryResult { partOfSpeech: string; definition: string; }

export async function suggestWords(prefix: string, signal?: AbortSignal): Promise<string[]> {
  try {
    const response = await fetch(`${SUGGEST_BASE}?s=${encodeURIComponent(prefix.trim())}&max=8`, { signal });
    if (!response.ok) return [];
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is { word: string } =>
      typeof item === "object" && item !== null && typeof item.word === "string")
      .slice(0, 8).map(item => item.word);
  } catch { return []; }
}

export async function lookupWord(term: string, signal?: AbortSignal): Promise<DictionaryResult | null> {
  try {
    const response = await fetch(`${DICTIONARY_BASE}/${encodeURIComponent(term.trim())}`, { signal });
    if (!response.ok) return null;
    const data = await response.json();
    const meaning = data[0]?.meanings?.[0];
    const definition = meaning?.definitions?.[0]?.definition;
    if (typeof definition !== "string" || !definition) return null;
    return { partOfSpeech: meaning.partOfSpeech ?? "", definition };
  } catch { return null; }
}

export function formatDefinition(result: DictionaryResult): string {
  return result.partOfSpeech ? `(${result.partOfSpeech}) ${result.definition}` : result.definition;
}
