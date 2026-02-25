import { Link } from 'react-router-dom'


const Header = () => {

    return(
        <>
            <Link to='/'>Landing</Link>
            <Link to='/home'>Home</Link>
            <Link to='/login'>Login</Link>
        </>
    )
}


export default Header