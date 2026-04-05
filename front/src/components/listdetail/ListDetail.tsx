import Header from "../header/Header"
import { useMatch } from "react-router-dom"
import { useSelector } from "react-redux"


const ListDetail = () => {
    const lists = useSelector(state => state.list)
    const match = useMatch('/home/lists/:id')
    const list = match ? lists.find(l => l.id === match.params.id) : null

    if (!list){
        return(
            <div>
                <Header/>
                <h3>can't find list</h3>
            </div>
        )
    }


    return(
        <div>
            <Header/>
            <h3>{list.name} by {list.author}</h3>
            <div>created {list.dateCreated}</div>
            <div>description: {list.description}</div>

        </div>
    )
}

export default ListDetail