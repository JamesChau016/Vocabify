import axios from 'axios'

const baseUrl = "http://localhost:3006/api/lists"

const getAll = async () => {
    const response = await axios.get(baseUrl)
    return response.data
}


export default { getAll }