import axios from "axios";
import type { DueWord, ReviewState } from "@/types";

const baseUrl = "/api/study";

const getDueWords = async (tz: string): Promise<DueWord[]> => {
  const response = await axios.get(`${baseUrl}/due`, { params: { tz } });
  return response.data;
};

const submitReview = async (wordId: string, grade: number): Promise<ReviewState> => {
  const response = await axios.post(`${baseUrl}/review`, { wordId, grade });
  return response.data;
};

export default { getDueWords, submitReview };
