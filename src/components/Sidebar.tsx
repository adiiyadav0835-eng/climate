/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  CloudRain,
  PhoneCall,
  Ambulance,
  Route,
  Hospital,
  Tent,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onNavigate: (viewId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  badgeCounts: {
    emergencies: number;
    critical: number;
    ambulances: number;
    blockedRoads: number;
    uncoveredSites: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  badgeCounts
}) => {
  const navItems = [
    {
      id: 'command-center',
      label: 'Command Center',
      icon: LayoutDashboard,
      badge: badgeCounts.critical > 0 ? `${badgeCounts.critical} Crit` : undefined,
      badgeColor: 'bg-rose-900 text-rose-200'
    },
    {
      id: 'scenarios',
      label: 'Disaster Scenarios',
      icon: CloudRain,
      badge: undefined
    },
    {
      id: 'emergencies',
      label: 'Emergency Requests',
      icon: PhoneCall,
      badge: badgeCounts.emergencies > 0 ? `${badgeCounts.emergencies}` : undefined,
      badgeColor: 'bg-amber-900 text-amber-200'
    },
    {
      id: 'fleet',
      label: 'Ambulance Fleet',
      icon: Ambulance,
      badge: `${badgeCounts.ambulances} Avail`,
      badgeColor: 'bg-emerald-900 text-emerald-200'
    },
    {
      id: 'routing',
      label: 'Evacuation & Routing',
      icon: Route,
      badge: badgeCounts.blockedRoads > 0 ? `${badgeCounts.blockedRoads} Blocked` : undefined,
      badgeColor: 'bg-red-900 text-red-200'
    },
    {
      id: 'hospitals',
      label: 'Hospital Network',
      icon: Hospital,
      badge: undefined
    },
    {
      id: 'temporary-resources',
      label: 'Temporary Resources',
      icon: Tent,
      badge: 'MCDA',
      badgeColor: 'bg-purple-900 text-purple-200'
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      icon: BarChart3,
      badge: undefined
    },
    {
      id: 'settings',
      label: 'Settings & Data',
      icon: Settings,
      badge: 'Tests'
    }
  ];

  return (
    <aside
      className={`bg-[#090d16]/95 border-r border-slate-800/80 flex flex-col justify-between transition-all duration-200 select-none z-20 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Navigation List */}
      <div className="py-3 flex-1 overflow-y-auto">
        <div className="px-3 mb-2 flex items-center justify-between">
          {!isCollapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Operations Center
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition ml-auto"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="space-y-1 px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-950/70 to-blue-950/40 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/10 font-bold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ml-1.5 ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40">
          <p className="font-semibold text-slate-300">Pune Urban Prototype</p>
          <p className="text-[10px] text-slate-500 mt-0.5">24 Road Nodes | 36 Segments</p>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Simulation Engine Active</span>
          </div>
        </div>
      )}
    </aside>
  );
};
