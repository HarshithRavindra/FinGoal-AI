import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { UploadStatementPage } from '../pages/UploadStatementPage';
import { TransactionReviewPage } from '../pages/TransactionReviewPage';
import { FinancialAnalysisPage } from '../pages/FinancialAnalysisPage';
import { GoalsPage } from '../pages/GoalsPage';
import { AdaptivePlanningPage } from '../pages/AdaptivePlanningPage';
import { ProfilePage } from '../pages/ProfilePage';

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Application Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/statements" element={<UploadStatementPage />} />
            <Route path="/transactions" element={<TransactionReviewPage />} />
            <Route path="/analysis" element={<FinancialAnalysisPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/adaptive-planning" element={<AdaptivePlanningPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Fallback Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

