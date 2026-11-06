import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSpreadsheet,
  ReceiptText,
  Activity,
  Target,
  Sparkles,
  User,
  LogOut,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { logout, user } = useAuth();

  const navigationItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Bank Statements', path: '/statements', icon: FileSpreadsheet },
    { name: 'Transactions', path: '/transactions', icon: ReceiptText },
    { name: 'Financial Health', path: '/analysis', icon: Activity },
    { name: 'Savings Goals', path: '/goals', icon: Target },
    { name: 'Adaptive Rescheduler', path: '/adaptive-planning', icon: Sparkles },
    { name: 'Cash Flow Forecast', path: '/analysis#forecast', icon: TrendingUp },
    { name: 'Profile & Settings', path: '/profile', icon: User },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* App Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold shadow-md shadow-indigo-500/20">
            FG
          </div>
          <div>
            <h1 className="font-semibold text-slate-100 text-base leading-tight tracking-tight">
              FinGoal<span className="text-indigo-400 font-bold">-AI</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Smart Wealth Engine</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-medium text-slate-200 truncate">
                {user?.full_name || 'FinGoal User'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

