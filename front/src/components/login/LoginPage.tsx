import { useState } from "react";
import { useDispatch } from "react-redux";
import Header from "../header/Header";
import { useNavigate } from "react-router-dom";
import { login } from "../../reducers/userReducer";
import type { AppDispatch } from "../../main";


const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch(login({ username, password }));
    navigate("/home");
  };

  return (
    <>
      <Header />
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Username:
          <input
            type="text"
            value={username}
            onChange={(u) => setUsername(u.target.value)}
          />
        </label>
        <br />
        <label>
          Password:
          <input
            type="password"
            value={password}
            onChange={(p) => setPassword(p.target.value)}
          />
        </label>
        <br />
        <button type="submit">login</button>
      </form>
    </>
  );
};

export default LoginPage;
