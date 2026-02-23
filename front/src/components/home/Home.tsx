import { useState, useEffect } from 'react'
import type { User } from '../../App'
import services from '../../services/list'

interface List {
    id: string,
    name: string,
    description?: string,
    dateCreated: Date,
    user: User
}

const Home = ({ user }) => {
    const [ lists, setLists ] = useState<List[]>([])

    useEffect(() => {
        services.getAll().then(data => setLists(data))
    },[])
    

    if (!lists){
        return(
            <div>failed to fetch list</div>
        )
    }

    return (
        <>
            <h1>Welcome {user}!</h1>
            <ol>
                {lists.map((l) => (
                    <li key={l.id}>{l.name}</li>
                ))}
            </ol>
        </>
    )
}

export default Home