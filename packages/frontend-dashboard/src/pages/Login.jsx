import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    localStorage.setItem("isAuthenticated", "true");
    navigate("/dashboard");
  };

  // Styles object for cleaner JSX
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f0f2f5', // Light grey background
      fontFamily: 'Arial, sans-serif'
    },
    header: {
      textAlign: 'center',
      marginBottom: '2rem'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      margin: '0',
      color: '#000'
    },
    subtitle: {
      fontSize: '1.2rem',
      color: '#666',
      marginTop: '0.5rem'
    },
    card: {
      backgroundColor: '#fff',
      padding: '40px',
      borderRadius: '20px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
      width: '100%',
      maxWidth: '400px',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    },
    input: {
      padding: '12px 15px',
      borderRadius: '8px',
      border: '1px solid #ddd',
      fontSize: '1rem',
      outline: 'none'
    },
    button: {
      padding: '12px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: '#003d82', // Deep blue from image
      color: 'white',
      fontSize: '1rem',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '10px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Guru Sikshan</h1>
        <p style={styles.subtitle}>Teacher Training Platform</p>
      </div>

      <form onSubmit={handleLogin} style={styles.card}>
        <input 
          style={styles.input}
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          style={styles.input}
          type="password" 
          placeholder="Password" 
          required 
        />
        <button type="submit" style={styles.button}>Login</button>
      </form>
    </div>
  );
};

export default Login;