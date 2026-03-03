import { useState } from 'react'
import { addList } from '../../reducers/listReducer'
import type { AppDispatch } from '../../main'
import { useDispatch, useSelector } from 'react-redux'


const ListForm = () => {
    const dispatch = useDispatch<AppDispatch>()
    const user = useSelector(state => state.currentUser)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')

    const createNewList = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const list = {
        name: name,
        description: description,
      };
      dispatch(addList(list, user))
    };
    return(
        <>
            <h3>List form</h3>
            <form onSubmit={createNewList}>
                <label>
                    name:
                    <input value={name} onChange={n => setName(n.target.value)}/>
                </label><br/>
                <label>
                    description:
                    <input value={description} onChange={des => setDescription(des.target.value)}/>
                </label><br/>
                <button type='submit'>create</button>
            </form>
        </>
    )
}

export default ListForm