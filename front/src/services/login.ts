import axios from "axios"

const baseUrl = "http://localhost:3006/api/login";

export interface Credential {
    username: string,
    password: string
}

const login = async (creds: Credential) => {
    const response = await axios.post(baseUrl, creds)
    return response.data
}

export default { login }
