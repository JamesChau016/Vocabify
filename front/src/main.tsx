import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import App from './App'

import userReducer from './reducers/userReducer'


const store = configureStore({
  reducer: {
    user: userReducer
  }
})


createRoot(document.getElementById("root")!).render(
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
);
