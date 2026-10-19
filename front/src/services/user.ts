import axios from "axios";
import type { RegisterCredential } from "@/types";

const baseUrl = "/api/users";

const getAll = async () => {
  const response = await axios.get(baseUrl);
  return response.data;
};

const create = async ({ username, name, password }: RegisterCredential) => {
  const response = await axios.post(baseUrl, { username, name, password });
  return response.data;
};

export default { getAll, create };
