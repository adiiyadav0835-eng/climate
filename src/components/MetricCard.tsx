/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'blue' | 'rose' | 'amber' | 'emerald' | 'purple' | 'slate';
  onClick?: () => void;
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
  onClick,
  badge
}) => {
  const variantStyles = {
    blue: 'border-blue-500/30 bg-blue-950/20 text-blue-400',
    rose: 'border-rose-500/30 bg-rose-950/20 text-rose-400',
    amber: 'border-amber-500/30 bg-amber-950/20 text-amber-400',
    emerald: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400',
    purple: 'border-purple-500/30 bg-purple-950/20 text-purple-400',
    slate: 'border-slate-700 bg-slate-900/50 text-slate-300'
  };

  return (
    <div
      onClick={onClick}
      className={`p-3.5 rounded-xl border backdrop-blur transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-slate-500 hover:scale-[1.01] active:scale-[0.99]' : ''
      } ${variantStyles[variant]}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-medium text-slate-300 truncate">{title}</span>
        <div className="p-1.5 rounded-lg bg-slate-800/80">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        {badge && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-[11px] text-slate-400 mt-1 truncate">{subtitle}</p>}
    </div>
  );
};
