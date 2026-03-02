import { useState } from 'react'
import services from '../../services/list'


const ListForm = () => {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')

    const createNewList = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const list = {
        name: name,
        description: description,
      };
      await services.createList(list);
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