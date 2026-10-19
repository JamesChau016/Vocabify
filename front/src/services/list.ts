import axios from "axios";
import type { Word } from "@/types";

const baseUrl = "/api/lists";

const getAll = async () => {
  const response = await axios.get(baseUrl);
  return response.data;
};

const getById = async (id: string) => {
  const response = await axios.get(`${baseUrl}/${id}`);
  return response.data;
};

const createList = async (list: { name: string; description: string }) => {
  const response = await axios.post(baseUrl, list);
  return response.data;
};

const newWords = async (id: string, words: Array<Word>) => {
  const response = await axios.post(`${baseUrl}/${id}/words`, words);
  return response.data;
};

const update = async (id: string, list: { name: string; description?: string }) => {
  const response = await axios.put(`${baseUrl}/${id}`, list);
  return response.data;
};

const remove = async (id: string) => {
  const response = await axios.delete(`${baseUrl}/${id}`);
  return response.data;
};

const updateWord = async (
  listId: string,
  wordId: string,
  word: { term: string; definition?: string }
) => {
  const response = await axios.put(`${baseUrl}/${listId}/words/${wordId}`, word);
  return response.data;
};

const deleteWord = async (listId: string, wordId: string) => {
  await axios.delete(`${baseUrl}/${listId}/words/${wordId}`);
};

export default { getAll, getById, createList, newWords, update, remove, updateWord, deleteWord };
