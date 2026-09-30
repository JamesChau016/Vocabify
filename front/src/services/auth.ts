import axios from "axios";

const baseUrl = "/api/logout";

let token: string | null = null;

const setToken = (newToken: string) => {
  token = `Bearer ${newToken}`;
};

const logout = async (): Promise<void> => {
  const config = {
    headers: { Authorization: token },
  };
  await axios.post(baseUrl, null, config);
};

export default { setToken, logout };
