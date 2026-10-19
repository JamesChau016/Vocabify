import axios from "axios";
import type { Credential } from "@/types";

const baseUrl = "/api/login";

const login = async (creds: Credential) => {
  const response = await axios.post(baseUrl, creds);
  return response.data;
};

export default { login };
