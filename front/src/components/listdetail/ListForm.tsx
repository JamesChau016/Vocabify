import { useState } from 'react'
import { addWord } from '../../reducers/listReducer';
import { useDispatch } from 'react-redux'

const ListForm = () => {
    const dispatch = useDispatch()
    const [term, setTerm] = useState('')

    const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

    };

    return (
      <div>
        <h4>Add new words</h4>
        <form onSubmit={handleAdd}>
          <label>
            Term:
            <input 
                value={term}
                onChange={t => setTerm(t.target.value)}
            />
          </label><br/>
          <button type='submit'>add</button>
        </form>
      </div>
    );
}

export default ListForm