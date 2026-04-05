import { createSlice } from "@reduxjs/toolkit";
import listServices from "../services/list";
import type { List } from '../services/list'
import type { User } from "../App";



const listSlice = createSlice({
  name: "list",
  initialState: [],
  reducers: {
    setList(state, action) {
      return action.payload;
    },
    createList(state, action) {
      const content = action.payload;
      state.push(content);
    },
    addWordList(state, action) {
      const { id, words } = action.payload
      const list = state.find(l => l.id === id)
      const addedWords = {...list, list: list.list.push(words)}
      state.map(l => (l.id === id ? addedWords : list))
    }
  },
});

const {setList, createList, addWordList} = listSlice.actions

export const initializeLists = () => {
    return async (dispatch) => {
        const lists = await listServices.getAll()
        dispatch(setList(lists))
    }
}

export const addList = (list: List, user: User) => {
    return async (dispatch) => {
        const createdList = await listServices.createList(list)
        const listWithUser = {...createdList, user: user}
        dispatch(createList(listWithUser))
    }
}

export const addWord = (id, words) => {
    return async (dispatch) => {
      const content = words.content
      await listServices.newWords(id, content)
      dispatch(addWordList({id, content}))
    }
}



export default listSlice.reducer