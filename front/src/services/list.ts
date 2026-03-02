import axios from "axios"
import type { Word } from '../components/home/Home'

const baseUrl = "http://localhost:3006/api/lists"

interface List {
  name: string
  description: string | null
}

let token: string | null = null

const setToken = (newToken: string) => {
  token = `Bearer ${newToken}`
}

const getAll = async () => {
  const response = await axios.get(baseUrl)
  return response.data
}

const createList = async (list: List) => {
  const config = {
    headers: { Authorization: token },
  }

  const response = await axios.post(baseUrl, list, config)
  return response.data
}

const newWords = async (id: string, words: Array<Word>) => {
    const config = {
      headers: { Authorization: token },
    }

    const url = `${baseUrl}/${id}/words`

    const response = await axios.post(url, words, config)
    return response.data
}

export default { setToken, getAll, createList, newWords }
