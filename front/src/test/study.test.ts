import axios from "axios";
import { describe, expect, it, vi } from "vitest";
import studyService from "../services/study";

describe("study service", () => {
  it("fetches due words with timezone parameter", async () => {
    const dueWords = [
      { id: "w1", term: "lucid", definition: "clear", listId: "l1", reviewState: null },
    ];
    vi.mocked(axios.get).mockResolvedValue({ data: dueWords });

    await expect(studyService.getDueWords("America/New_York")).resolves.toEqual(dueWords);
    expect(axios.get).toHaveBeenCalledWith("/api/study/due", {
      params: { tz: "America/New_York" },
    });
  });

  it("submits a review with wordId and grade", async () => {
    const reviewState = { easeFactor: 2.5, interval: 1, repetitions: 1, dueAt: "2026-11-01T00:00:00Z" };
    vi.mocked(axios.post).mockResolvedValue({ data: reviewState });

    await expect(studyService.submitReview("w1", 2)).resolves.toEqual(reviewState);
    expect(axios.post).toHaveBeenCalledWith("/api/study/review", { wordId: "w1", grade: 2 });
  });
});
