import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import EmiCalculator from './pages/EmiCalculator';
import Customers from './pages/Customers';
import Loans from './pages/Loans';
import LoanDue from './pages/LoanDue';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import PrivateRoute from './components/PrivateRoute';

function App() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Main Header */}
      <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-950 text-white py-3 px-4 shadow-lg z-50 border-b border-primary-700/30">
        <div className="container mx-auto flex justify-center items-center text-center">
          <h1 className="text-xl md:text-3xl font-extrabold tracking-tight drop-shadow-sm">
            {t('appName')}
          </h1>
        </div>
      </div>
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-2 sm:py-3">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/emi-calculator" element={<EmiCalculator />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/loans/:id/ledger" element={<LoanDue />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/change-password" element={<ChangePassword />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default App;
