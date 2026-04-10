import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import EmiCalculator from './pages/EmiCalculator';
import Customers from './pages/Customers';
import Loans from './pages/Loans';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/emi-calculator" element={<EmiCalculator />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/loans" element={<Loans />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default App;
