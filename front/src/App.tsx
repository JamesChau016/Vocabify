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


  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </>
  );
}

export default App
