import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Pages
import Dashboard from "./pages/Dashboard";
import Teachers from "./pages/Teachers";
import Feedback from "./pages/Feedback";
import Login from "./pages/Login"; // New Import

// Simple Auth Guard
const ProtectedRoute = ({ children }) => {
  const isAuth = localStorage.getItem("isAuthenticated") === "true";
  return isAuth ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route 
          path="/dashboard" 
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
        />
        <Route 
          path="/teachers" 
          element={<ProtectedRoute><Teachers /></ProtectedRoute>} 
        />
        <Route 
          path="/feedback" 
          element={<ProtectedRoute><Feedback /></ProtectedRoute>} 
        />
      </Routes>
    </Router>
  );
};

export default App;