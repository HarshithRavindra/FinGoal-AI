import React from 'react';
import { User, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatters';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-400" />
          Account & Security Vault
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review profile metadata, active session security, and data isolation controls.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold text-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">{user?.full_name}</h2>
            <p className="text-xs text-slate-400">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              Verified Vault User
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-800">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-400 text-[11px]">User ID</span>
            <p className="text-sm font-semibold text-slate-200 mt-0.5">#{user?.id}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-400 text-[11px]">Member Since</span>
            <p className="text-sm font-semibold text-slate-200 mt-0.5">
              {formatDate(user?.created_at)}
            </p>
          </div>
        </div>

        {/* Security Info */}
        <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-800 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Security & Cryptographic Isolation
          </h3>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Passwords hashed with industry-standard bcrypt + salting.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>JWT authentication token with 24-hour expiry and encrypted payloads.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Multi-tenant database row-level segregation: All queries filtered by user ID.</span>
            </li>
          </ul>
        </div>

        <div className="pt-2 flex justify-between items-center">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

