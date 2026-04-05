import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import type { User } from '../../App'
import ListForm from './ListForm'
import Header from '../header/Header'

export interface List {
    id: string,
    name: string,
    author: string,
    description?: string,
    dateCreated: Date,
    user: User
}

export interface Word {
    id: string,
    term: string,
    definition: string
}

const Home = () => {
    const lists = useSelector(state => state.list)
    const { currentUser } = useSelector(state => state.user)

    if (!lists){
      
        return(
            <div>failed to fetch list</div>
        )
    }
    if (!currentUser){
        return (
          <div>
            <Header />
            <h3>please log in first</h3>
          </div>
        );
    }

    return (
      <>
        <Header />
        <h1>Welcome {currentUser.name}!</h1>
        <ListForm />
        <ol>
          {lists?.map((l: List) => (
            <li key={l.id}>
              <Link to={`lists/${l.id}`}>
                {l.name} - {l.author}
              </Link>
            </li>
          ))}
        </ol>
      </>
    );
}

export default Home