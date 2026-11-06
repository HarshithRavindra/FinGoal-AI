import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Navbar } from '../components/common/Navbar';

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/':
        return 'Executive Financial Overview';
      case '/statements':
        return 'Bank Statements & Extraction';
      case '/transactions':
        return 'Transaction Review & Classification';
      case '/analysis':
        return 'Financial Health & Predictive Analytics';
      case '/goals':
        return 'Savings Goals & Feasibility';
      case '/adaptive-planning':
        return 'Adaptive Goal Rescheduler';
      case '/profile':
        return 'User Account & Security';
      default:
        return 'FinGoal-AI';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          title={getPageTitle(location.pathname)}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

