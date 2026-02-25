import { useState } from "react";
import { Routes, Route } from 'react-router-dom'
import LoginPage from './components/login/LoginPage' 
import Landing from './components/landing/Landing'
import Home from './components/home/Home'

export interface User {
  token: string;
  username: string;
  name: string;
}

const App = () => {
  const [ user, setUser ] = useState<User|null>(null)


  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage setUser={setUser} />} />
        <Route path="/home" element={<Home user={user} />} />
      </Routes>
    </>
  );
}

export default App
