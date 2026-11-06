import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  badge,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-slate-900/60';
      case 'success':
        return 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-900/60';
      case 'warning':
        return 'border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-slate-900/60';
      case 'danger':
        return 'border-rose-500/30 bg-gradient-to-br from-rose-950/30 to-slate-900/60';
      default:
        return 'border-slate-800 bg-slate-900/60';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'primary':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'success':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'warning':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'danger':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div
      className={`p-5 rounded-xl border backdrop-blur-sm transition-all hover:border-slate-700/80 shadow-sm ${getVariantStyles()}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {badge && (
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800">
            {badge}
          </span>
        )}
        {Icon && !badge && (
          <div className={`p-2 rounded-lg border ${getIconColor()}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-2xl font-bold text-slate-100 tracking-tight">{value}</h3>
        {trend && (
          <span
            className={`text-xs font-medium flex items-center gap-0.5 ${
              trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};

