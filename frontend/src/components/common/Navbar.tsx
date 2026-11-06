import React from 'react';
import { Menu, Bell, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onToggleSidebar: () => void;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, title }) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        {title && (
          <h2 className="text-lg font-semibold text-slate-100 hidden sm:block tracking-tight">
            {title}
          </h2>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Security badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Encrypted Vault</span>
        </div>

        {/* Notifications */}
        <button
          title="Notifications"
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
        </button>

        {/* User avatar pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-semibold text-xs flex items-center justify-center">
            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-xs font-medium text-slate-300 hidden sm:inline">
            {user?.full_name?.split(' ')[0] || 'User'}
          </span>
        </div>
      </div>
    </header>
  );
};

