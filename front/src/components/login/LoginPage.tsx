import { useState, type SetStateAction } from 'react'
import type { Dispatch } from 'react'
import type { User } from '../../App'
import services from '../../services/login'

type UserProps = {
    setUser: Dispatch<SetStateAction<User | null>>
}


const LoginPage = ( props: UserProps ) => {
    const [ username, setUsername ] = useState('')
    const [ password, setPassword ] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
        const user = await services.login({ username, password })
        props.setUser(user)
    };

    return (
      <>
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Username:
            <input
                type='text'
              value={username}
              onChange={(u) => setUsername(u.target.value)}
            />
          </label><br/>
          <label>
            Password:
            <input
                type='password'
                value={password}
                onChange={(p) => setPassword(p.target.value)}
            />
          </label><br/>
          <button type='submit'>login</button>
        </form>
      </>
    );
}

export default LoginPage