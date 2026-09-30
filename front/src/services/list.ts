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

const getById = async (id: string) => {
  const url = `${baseUrl}/${id}`;
  const response = await axios.get(url);
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

const update = async (
  id: string,
  list: { name: string; description?: string }
) => {
  const config = {
    headers: { Authorization: token },
  };
  const url = `${baseUrl}/${id}`;
  const response = await axios.put(url, list, config);
  return response.data;
};

const remove = async (id: string) => {
  const config = {
    headers: { Authorization: token },
  };
  const url = `${baseUrl}/${id}`;
  const response = await axios.delete(url, config);
  return response.data;
};

export default {
  setToken,
  getAll,
  getById,
  createList,
  newWords,
  update,
  remove,
};
