import axios from "axios";
import type { Word } from "@/types";

const baseUrl = "/api/lists";

let token: string | null = null;

const setToken = (newToken: string) => {
  token = `Bearer ${newToken}`;
};

const getAll = async () => {
  const response = await axios.get(baseUrl);
  return response.data;
};

const createList = async (list: { name: string; description: string }) => {
  const config = {
    headers: { Authorization: token },
  };
  const response = await axios.post(baseUrl, list, config);
  return response.data;
};

const newWords = async (id: string, words: Array<Word>) => {
  const config = {
    headers: { Authorization: token },
  };
  const url = `${baseUrl}/${id}/words`;
  const response = await axios.post(url, words, config);
  return response.data;
};

export default { setToken, getAll, createList, newWords };
