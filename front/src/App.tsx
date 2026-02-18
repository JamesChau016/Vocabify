import { useState } from "react";
import LoginPage from './components/login/LoginPage' 
import Landing from './components/landing/Landing'

export interface User {
  token: string;
  username: string;
  name: string;
}

const App = () => {
  const [ user, setUser ] = useState<User|null>(null)

  if (user){
    return (
      <Landing/>
    )
  }

  return (
    <LoginPage setUser={setUser}/>
  )
}

export default App
