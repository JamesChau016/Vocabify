import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import LoginPage from './components/login/LoginPage' 
import Landing from './components/landing/Landing'
import Home from './components/home/Home'
import ListDetail from './components/listdetail/ListDetail'
import { useDispatch } from 'react-redux'
import { initializeLists } from './reducers/listReducer'
import { getUser } from './reducers/userReducer'
import type { AppDispatch } from "./main";

export interface User {
  token: string;
  username: string;
  name: string;
}

const App = () => {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    dispatch(initializeLists())
    dispatch(getUser())
  },[dispatch])


  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/home/lists/:id" element={<ListDetail/>}/>
      </Routes>
    </>
  );
}

export default App
