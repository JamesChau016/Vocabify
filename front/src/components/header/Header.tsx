import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../../reducers/userReducer'
import type { AppDispatch } from '../../main'
import { useNavigate } from 'react-router-dom'


const Header = () => {
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()
    const { currentUser } = useSelector(state => state.user)

    const handleLogout = () => {
        dispatch(logout())
        navigate('/')
    }

    return(
        <>
            <Link to='/'>Landing</Link>
            <Link to='/home'>Home</Link>
            {!currentUser ? <Link to='/login'>Login</Link>: <button onClick={handleLogout}>logout</button>}
        </>
    )
}


export default Header