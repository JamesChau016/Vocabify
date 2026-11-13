import axios from "axios";

export interface ApiTokenMetadata {
  id: string;
  name: string;
  scope: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface CreatedApiToken extends ApiTokenMetadata {
  token: string;
}

const base = "/api/auth/tokens";

const list = async (): Promise<ApiTokenMetadata[]> =>
  (await axios.get<ApiTokenMetadata[]>(base)).data;

const create = async (name: string): Promise<CreatedApiToken> =>
  (await axios.post<CreatedApiToken>(base, { name })).data;

const revoke = async (id: string): Promise<void> => {
  await axios.delete(`${base}/${id}`);
};

export default { list, create, revoke };
