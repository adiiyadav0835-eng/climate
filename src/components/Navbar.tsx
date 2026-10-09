/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Sparkles,
  Ambulance as AmbulanceIcon,
  Activity,
  Bed,
  ShieldAlert,
  Search,
  Bell,
  Radio,
  ChevronRight
} from 'lucide-react';
import { SimulationState } from '../types/index.ts';

interface NavbarProps {
  state: SimulationState;
  onResetSimulation: () => void;
  onRecalculatePlan: () => void;
  onOpenAssistant: () => void;
  onToggleEmergencyMode: () => void;
  onOpenAlerts?: () => void;
  activeView: string;
  onNavigate: (viewId: string) => void;
  unreadAlertsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  state,
  onResetSimulation,
  onRecalculatePlan,
  onOpenAssistant,
  onToggleEmergencyMode,
  onOpenAlerts,
  activeView,
  onNavigate,
  unreadAlertsCount
}) => {
  const activeEmergencies = state.emergencyRequests.filter(e => e.status !== 'Resolved').length;
  const criticalEmergencies = state.emergencyRequests.filter(e => e.severity === 'Critical' && e.status !== 'Resolved').length;
  const availableAmbulances = state.ambulances.filter(a => a.status === 'Available').length;
  const blockedRoads = state.roadSegments.filter(s => s.isBlocked).length;
  const totalAvailableBeds = state.hospitals.reduce((acc, h) => acc + h.availableBeds, 0);

  // Risk styling
  const riskColor =
    state.overallRiskLevel === 'CRITICAL' || state.overallRiskLevel === 'HIGH'
      ? 'bg-rose-950/90 text-rose-300 border-rose-700/80'
      : state.overallRiskLevel === 'MEDIUM'
      ? 'bg-amber-950/90 text-amber-300 border-amber-700/80'
      : 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80';

  return (
    <header className="bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800/80 text-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xl z-30 select-none">
      {/* Left: Breadcrumbs & Risk Badge (Matching Image 2 & Image 1) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-cyan-500 to-blue-700 rounded-lg text-white shadow-md shadow-cyan-500/20">
            <ShieldAlert className="w-5 h-5 text-cyan-200" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="hover:text-white transition cursor-pointer" onClick={() => onNavigate('command-center')}>Main Center</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-cyan-400 font-semibold">City Operations Overview</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-bold text-base tracking-tight text-white">CAERN</span>
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                | 12 OKTOBER 2026 10:56
              </span>
              {/* Overall Risk Level Badge (Matching Image 1) */}
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${riskColor}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span>
                <span>RISK LEVEL: {state.overallRiskLevel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mandatory persistent simulation disclaimer */}
        <div className="hidden xl:flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/80">
          <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse" />
          <span>SIMULATION MODE — NOT FOR REAL-WORLD DISPATCH</span>
        </div>
      </div>

      {/* Center: Search Bar (Matching Image 2) */}
      <div className="hidden md:flex items-center flex-1 max-w-xs mx-2">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search incidents, assets, locations..."
            className="w-full bg-[#111827]/90 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Right Controls: Emergency Mode Toggle + Notifications + AI Assistant + Quick Actions */}
      <div className="flex items-center gap-2">
        {/* Emergency Mode Pill Toggle (Matching Top-Right Reference Image) */}
        <button
          onClick={onToggleEmergencyMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-md ${
            state.emergencyModeActive
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
          title="Toggle High-Alert Emergency Mode"
        >
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Emergency Mode</span>
          <span className="w-2 h-2 rounded-full bg-white ml-0.5"></span>
        </button>

        {/* Notification Bell with Badge */}
        {onOpenAlerts && (
          <button
            onClick={onOpenAlerts}
            className="relative p-2 rounded-xl bg-[#111827] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Real-Time Alerts Feed"
          >
            <Bell className="w-4 h-4 text-cyan-400" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-bold animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        )}

        {/* Recalculate Button */}
        <button
          onClick={onRecalculatePlan}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-cyan-600/20 transition cursor-pointer"
          title="Recalculate whole dispatch plan"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Recalculate</span>
        </button>

        {/* AI Assistant */}
        <button
          onClick={onOpenAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-semibold text-xs shadow transition cursor-pointer"
          title="AI Decision Support"
        >
          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
          <span className="hidden lg:inline">Assistant</span>
        </button>

        {/* Reset Simulation Button */}
        <button
          onClick={onResetSimulation}
          className="p-2 rounded-xl bg-[#111827] hover:bg-rose-950/60 border border-slate-700 text-slate-400 hover:text-rose-300 transition cursor-pointer"
          title="Reset Simulation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
