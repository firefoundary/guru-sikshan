import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // For hackathon: simulate login by saving to localStorage
    localStorage.setItem("isAuthenticated", "true");
    navigate("/dashboard");
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', width: '300px', gap: '10px' , color :'white' , alignContent : 'center'}}>
        <h2 >DIET Admin Login</h2>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" required />
        <button type="submit">LOGIN</button>
      </form>

    </div>
  );
};

export default Login;