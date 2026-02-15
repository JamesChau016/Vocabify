import axios from "axios"

const baseUrl = "/api/login";

interface Credential {
    username: string,
    password: string
}

const login = async (creds: Credential) => {
    const response = await axios.post(baseUrl, creds)
    return response.data
}

export default { login }
