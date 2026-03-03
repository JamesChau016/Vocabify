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
  },
});

const {setList, createList} = listSlice.actions

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



export default listSlice.reducer