import axios from "axios";
import type { Credential, User } from "@/types";

const base = "/api/auth";

const login = async (creds: Credential): Promise<User> => {
  const response = await axios.post(`${base}/login`, creds);
  return response.data;
};

const logout = async (): Promise<void> => {
  await axios.post(`${base}/logout`);
};

const me = async (): Promise<User> => {
  const response = await axios.get(`${base}/me`);
  return response.data;
};

const getOAuthUrl = async (provider: "google" | "github"): Promise<string> => {
  const response = await axios.get(`${base}/oauth/${provider}`);
  return response.data.url;
};

const forgotPassword = async (email: string): Promise<string> => {
  const response = await axios.post(`${base}/forgot-password`, { email });
  return response.data.message;
};

const resetPassword = async (tokenId: string, token: string, newPassword: string): Promise<string> => {
  const response = await axios.post(`${base}/reset-password`, { tokenId, token, newPassword });
  return response.data.message;
};

export default { login, logout, me, getOAuthUrl, forgotPassword, resetPassword };
