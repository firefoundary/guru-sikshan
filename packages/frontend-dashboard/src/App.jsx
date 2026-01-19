import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Pages
import Dashboard from "./pages/Dashboard";
import Teachers from "./pages/Teachers";
import Feedback from "./pages/Feedback";
import Login from "./pages/Login";
import UploadModules from "./pages/UploadModules"; // New Import

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

        {/* Root Redirect */}
        <Route path="/" element={<Navigate to="/dashboard" />} />

        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
        />
        <Route 
          path="/teachers" 
          element={<ProtectedRoute><Teachers /></ProtectedRoute>} 
        />
        <Route 
          path="/upload-modules" 
          element={<ProtectedRoute><UploadModules /></ProtectedRoute>} 
        />
        <Route 
          path="/feedback" 
          element={<ProtectedRoute><Feedback /></ProtectedRoute>} 
        />

        {/* Catch-all: Redirect unknown paths to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;