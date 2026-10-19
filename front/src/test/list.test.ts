import axios from "axios";
import { describe, expect, it, vi } from "vitest";
import listService from "../services/list";

describe("list service", () => {
  it("gets all lists", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: [{ id: "list-1", name: "Reading" }],
    });

    await expect(listService.getAll()).resolves.toEqual([
      { id: "list-1", name: "Reading" },
    ]);
    expect(axios.get).toHaveBeenCalledWith("/api/lists");
  });

  it("gets a list by id", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { id: "list-1", name: "Reading" },
    });

    await expect(listService.getById("list-1")).resolves.toEqual({
      id: "list-1",
      name: "Reading",
    });
    expect(axios.get).toHaveBeenCalledWith("/api/lists/list-1");
  });

  it("creates a list and returns the API response", async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { id: "list-1", name: "Reading", description: "Books" },
    });

    await expect(
      listService.createList({ name: "Reading", description: "Books" }),
    ).resolves.toEqual({
      id: "list-1",
      name: "Reading",
      description: "Books",
    });
    expect(axios.post).toHaveBeenCalledWith("/api/lists", {
      name: "Reading",
      description: "Books",
    });
  });

  it("adds words to a list", async () => {
    const words = [{ id: "word-1", term: "lucid", definition: "clear" }];
    vi.mocked(axios.post).mockResolvedValue({ data: words });

    await expect(listService.newWords("list-1", words)).resolves.toEqual(words);
    expect(axios.post).toHaveBeenCalledWith("/api/lists/list-1/words", words);
  });

  it("updates a list", async () => {
    const update = { name: "Updated", description: "New description" };
    vi.mocked(axios.put).mockResolvedValue({
      data: { id: "list-1", ...update },
    });

    await expect(listService.update("list-1", update)).resolves.toEqual({
      id: "list-1",
      ...update,
    });
    expect(axios.put).toHaveBeenCalledWith("/api/lists/list-1", update);
  });

  it("removes a list", async () => {
    vi.mocked(axios.delete).mockResolvedValue({ data: { deleted: true } });

    await expect(listService.remove("list-1")).resolves.toEqual({ deleted: true });
    expect(axios.delete).toHaveBeenCalledWith("/api/lists/list-1");
  });

  it("updates a word in a list", async () => {
    const word = { term: "lucid", definition: "clear" };
    vi.mocked(axios.put).mockResolvedValue({
      data: { id: "word-1", ...word },
    });

    await expect(listService.updateWord("list-1", "word-1", word)).resolves.toEqual({
      id: "word-1",
      ...word,
    });
    expect(axios.put).toHaveBeenCalledWith(
      "/api/lists/list-1/words/word-1",
      word,
    );
  });

  it("deletes a word from the selected list", async () => {
    vi.mocked(axios.delete).mockResolvedValue({ data: undefined });

    await expect(
      listService.deleteWord("list-1", "word-1"),
    ).resolves.toBeUndefined();
    expect(axios.delete).toHaveBeenCalledWith("/api/lists/list-1/words/word-1");
  });
});
