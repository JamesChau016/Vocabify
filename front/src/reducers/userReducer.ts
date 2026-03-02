import { createSlice } from '@reduxjs/toolkit'
import userServices from '../services/user'
import listServices from '../services/list'
import loginServices from '../services/login'
import type { Credential } from '../services/login'


const initialState = {
    currentUser: null,
    usersList: []
}


const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers:{
        setUser(state, action){
            state.currentUser = action.payload
        },
        setUsersList(state, action){
            state.usersList = action.payload
        }
    }
})

const { setUser, setUsersList } = userSlice.actions

export const getUser = () => {
    return async (dispatch) => {
        const loggedInUser = window.localStorage.getItem('loggedInUser')
        if (loggedInUser){
            const user = JSON.parse(loggedInUser)
            listServices.setToken(user.token)
            dispatch(setUser(loggedInUser))
        }
    }
}

export const getUsersList = () => {
    return async (dispatch) => {
        const usersList = await userServices.getAll()
        dispatch(setUsersList(usersList))
    }
}

export const login = (info: Credential) => {
    return async (dispatch) => {
        try{
            const user = await loginServices.login(info)
            listServices.setToken(user.token)
            dispatch(setUser(user))
            window.localStorage.setItem('loggedInUser', JSON.stringify(user))
        }
        catch (error){
            console.log(error)
        }
    }
}

export default userSlice.reducer