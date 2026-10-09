/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Ambulance as AmbulanceIcon,
  Bed,
  ShieldCheck,
  Activity,
  Flame,
  CloudRain,
  MapPin,
  Clock,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Wind,
  CheckCircle,
  Radio
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import {
  SimulationState,
  EmergencyRequest,
  CandidateSite,
  Hospital,
  Ambulance,
  RouteResult,
  AlertNotification
} from '../../types/index.ts';
import { GISMap } from '../GISMap.tsx';
import { RealTimeAlertsWidget } from '../RealTimeAlertsWidget.tsx';
import { TimelineController } from '../TimelineController.tsx';
import { DistrictGaugesWidget } from '../DistrictGaugesWidget.tsx';
import { SCENARIO_PRESETS, ScenarioService } from '../../services/scenarioService.ts';
import { HAZARD_EVOLUTION_STAGES } from '../../data/seedData.ts';

interface CommandCenterViewProps {
  state: SimulationState;
  onNavigate: (viewId: string) => void;
  onSelectIncident: (inc: EmergencyRequest) => void;
  onSelectSite: (site: CandidateSite) => void;
  onSelectHospital: (hosp: Hospital) => void;
  onSelectAmbulance: (amb: Ambulance) => void;
  onToggleRoadBlock: (segmentId: string) => void;
  onApplyPreset: (presetId: string) => void;
  onRecalculate: () => void;
  onReset: () => void;
  onUpdateState: (newState: SimulationState) => void;
  activeRoute: RouteResult | null;
  alternativeRoute: RouteResult | null;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  state,
  onNavigate,
  onSelectIncident,
  onSelectSite,
  onSelectHospital,
  onSelectAmbulance,
  onToggleRoadBlock,
  onApplyPreset,
  onRecalculate,
  onReset,
  onUpdateState,
  activeRoute,
  alternativeRoute
}) => {
  // Real calculated metrics from simulation state
  const activeEmergencies = state.emergencyRequests.filter(e => e.status !== 'Resolved');
  const criticalCount = activeEmergencies.filter(e => e.severity === 'Critical').length;
  const highCount = activeEmergencies.filter(e => e.severity === 'High').length;
  const availableAmbs = state.ambulances.filter(a => a.status === 'Available').length;
  const blockedRoadsCount = state.roadSegments.filter(s => s.isBlocked).length;
  const totalBedsAvailable = state.hospitals.reduce((acc, h) => acc + h.availableBeds, 0);
  const totalBedsTotal = state.hospitals.reduce((acc, h) => acc + h.totalBeds, 0);
  const safetyIndex = Math.max(10, Math.round(100 - blockedRoadsCount * 12 - (state.scenario.floodSeverity * 0.4)));

  // Data for "INCIDENT CATEGORIES" bar chart (matching Left Image 1)
  const categoryCountMap: Record<string, number> = {};
  state.emergencyRequests.forEach(r => {
    categoryCountMap[r.category] = (categoryCountMap[r.category] || 0) + 1;
  });

  const incidentCategoriesData = [
    { category: 'Trauma', count: categoryCountMap['Trauma'] || 4 },
    { category: 'Drowning', count: categoryCountMap['Drowning/Water'] || 3 },
    { category: 'Cardiac', count: categoryCountMap['Cardiac'] || 2 },
    { category: 'Respir.', count: categoryCountMap['Respiratory'] || 3 },
    { category: 'Maternal', count: categoryCountMap['Maternal'] || 1 },
    { category: 'Heat', count: categoryCountMap['Heatstroke'] || 2 },
    { category: 'General', count: categoryCountMap['General'] || 3 }
  ];

  // Data for Traffic Flow / Emergency Response mini-trend (matching Top-Right Image 2)
  const trafficTrendData = [
    { time: '00:00', flow: 92, response: 7.2 },
    { time: '04:00', flow: 88, response: 7.8 },
    { time: '08:00', flow: 64, response: 11.4 },
    { time: '10:00', flow: 48, response: 14.8 },
    { time: '12:00', flow: 36, response: 18.2 },
    { time: '16:00', flow: 52, response: 13.5 }
  ];

  // Timeline handlers
  const handleSelectTimelineStage = (stageIndex: number) => {
    const updated = ScenarioService.applyTimelineStage(stageIndex, state, HAZARD_EVOLUTION_STAGES);
    onUpdateState(updated);
  };

  const handleTogglePlayTimeline = () => {
    const next = { ...state, isPlayingTimeline: !state.isPlayingTimeline };
    onUpdateState(next);
  };

  const handleChangeTimelineSpeed = (speed: number) => {
    const next = { ...state, timelineSpeed: speed };
    onUpdateState(next);
  };

  // Alert Click handler: jumps to affected road or incident
  const handleSelectAlert = (alert: AlertNotification) => {
    if (alert.targetSegmentId) {
      onToggleRoadBlock(alert.targetSegmentId);
    }
  };

  const handleMarkAllAlertsRead = () => {
    const updatedAlerts = state.alerts.map(a => ({ ...a, isRead: true }));
    onUpdateState({ ...state, alerts: updatedAlerts });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#070b12] text-slate-100 p-4 space-y-4">
      {/* 1. TOP SAAS KPI STATS STRIP (Matching Top-Right Reference Image) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* KPI 1: Active Cases */}
        <div
          onClick={() => onNavigate('emergencies')}
          className="bg-[#0d131f]/95 border border-slate-800/80 hover:border-cyan-500/50 p-3.5 rounded-2xl cursor-pointer transition shadow-xl"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-medium">Active Incidents</span>
            <span className="text-[10px] text-rose-400 font-bold bg-rose-950/60 px-1.5 py-0.5 rounded">▲ 12%</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{activeEmergencies.length}</span>
            <span className="text-[11px] text-slate-400">cases</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="text-rose-400 font-semibold">{criticalCount} Critical</span>
            <span>{highCount} High Priority</span>
          </div>
        </div>

        {/* KPI 2: Safety Flow Index */}
        <div
          onClick={() => onNavigate('routing')}
          className="bg-[#0d131f]/95 border border-slate-800/80 hover:border-cyan-500/50 p-3.5 rounded-2xl cursor-pointer transition shadow-xl"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-medium">Network Safety Index</span>
            <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded">▲ 8%</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-cyan-300 tracking-tight">{safetyIndex}</span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            <span>{state.roadSegments.length - blockedRoadsCount} of {state.roadSegments.length} Roads Passable</span>
          </div>
        </div>

        {/* KPI 3: Hospital Facility Capacity */}
        <div
          onClick={() => onNavigate('hospitals')}
          className="bg-[#0d131f]/95 border border-slate-800/80 hover:border-cyan-500/50 p-3.5 rounded-2xl cursor-pointer transition shadow-xl"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-medium">Hospital Buffer Capacity</span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded">92 / 100</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-blue-400 tracking-tight">{totalBedsAvailable}</span>
            <span className="text-xs text-slate-500">Open Beds</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            <span>{Math.round(((totalBedsTotal - totalBedsAvailable) / totalBedsTotal) * 100)}% Bed Saturation</span>
          </div>
        </div>

        {/* KPI 4: Air Quality & Hazard Index */}
        <div
          onClick={() => onNavigate('scenarios')}
          className="bg-[#0d131f]/95 border border-slate-800/80 hover:border-cyan-500/50 p-3.5 rounded-2xl cursor-pointer transition shadow-xl"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-medium">Air & Hydro Index</span>
            <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded">Hourly</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-400 tracking-tight">43</span>
            <span className="text-xs text-slate-500">AQI</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            <span>Discharge: {Math.round(state.scenario.floodSeverity * 500)} cusecs</span>
          </div>
        </div>

        {/* KPI 5: Fleet Utilization / Tickets */}
        <div
          onClick={() => onNavigate('fleet')}
          className="bg-[#0d131f]/95 border border-slate-800/80 hover:border-cyan-500/50 p-3.5 rounded-2xl cursor-pointer transition shadow-xl"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-medium">Fleet Ready</span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded">▲ 22</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">{availableAmbs}</span>
            <span className="text-xs text-slate-500">/ {state.ambulances.length} Units</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            <span>{state.ambulances.length - availableAmbs} Dispatched En Route</span>
          </div>
        </div>
      </div>

      {/* 2. EVOLVING HAZARD TIMELINE CONTROLLER STRIP */}
      <TimelineController
        currentStageIndex={state.timelineStageIndex}
        isPlaying={state.isPlayingTimeline}
        speed={state.timelineSpeed}
        onSelectStage={handleSelectTimelineStage}
        onTogglePlay={handleTogglePlayTimeline}
        onChangeSpeed={handleChangeTimelineSpeed}
      />

      {/* 3. MAIN DASHBOARD GRID (3 COLUMNS: District & Gauges + GIS Map + Real Time Alerts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (3.5 cols): District Gauges + Incident Categories Bar Chart (Matching Image 1) */}
        <div className="lg:col-span-4 space-y-4">
          <DistrictGaugesWidget
            state={state}
            onOpenNewIncident={() => onNavigate('emergencies')}
            onOpenAutoDispatch={() => onNavigate('fleet')}
            onOpenMCDAPlanner={() => onNavigate('temporary-resources')}
          />

          {/* Incident Categories Chart (Matching Left Image 1) */}
          <div className="bg-[#0d131f]/95 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                INCIDENT CATEGORIES
              </h3>
              <span className="text-[10px] text-slate-400">Demand Breakdown</span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incidentCategoriesData}>
                  <XAxis dataKey="category" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      color: '#f8fafc'
                    }}
                  />
                  {/* Vibrant Teal Bars Matching Reference Image 1 */}
                  <Bar dataKey="count" fill="#00f2fe" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Center Column (5 cols): Embedded GIS Operations Map (Matching Image 2 / Image 3) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-[#0d131f]/95 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl h-[560px] relative flex flex-col">
            {/* Map Header Floating Overlay */}
            <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
              <div className="bg-[#090d16]/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-xl flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="font-bold text-white">Live City Operations Map</span>
                <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950 px-1.5 py-0.5 rounded">
                  {state.scenario.scenarioPresetName.split(' ')[0]}
                </span>
              </div>
            </div>

            <GISMap
              state={state}
              activeRoute={activeRoute}
              alternativeRoute={alternativeRoute}
              onSelectIncident={onSelectIncident}
              onSelectSite={onSelectSite}
              onSelectHospital={onSelectHospital}
              onSelectAmbulance={onSelectAmbulance}
              onToggleRoadBlock={onToggleRoadBlock}
              className="w-full h-full"
            />
          </div>

          {/* Traffic Flow & Response Time Curve (Matching Bottom-Right Image 2) */}
          <div className="bg-[#0d131f]/95 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                Traffic Flow & Emergency Response Curve
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">▲ 8% recovery</span>
            </div>

            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trafficTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#1e293b',
                      borderRadius: '0.5rem',
                      fontSize: '10px'
                    }}
                  />
                  <Line type="monotone" dataKey="flow" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="response" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column (3.5 cols): Real Time Alerts Table (Matching Top-Right Image 2) */}
        <div className="lg:col-span-3 space-y-4">
          <RealTimeAlertsWidget
            alerts={state.alerts}
            onSelectAlert={handleSelectAlert}
            onMarkAllRead={handleMarkAllAlertsRead}
          />

          {/* Quick Scenario Selector Card */}
          <div className="bg-[#0d131f]/95 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-slate-300 text-[11px]">
                Hazard Condition Presets
              </span>
              <button
                onClick={() => onNavigate('scenarios')}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
              >
                Detailed Controls →
              </button>
            </div>

            <div className="space-y-1.5">
              {SCENARIO_PRESETS.map(p => {
                const isActive = state.scenario.scenarioPresetName === p.title;
                return (
                  <button
                    key={p.id}
                    onClick={() => onApplyPreset(p.id)}
                    className={`w-full p-2 rounded-xl text-left border transition cursor-pointer flex items-center justify-between text-xs ${
                      isActive
                        ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 font-bold'
                        : 'bg-[#111827]/70 border-slate-800/70 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{p.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-1">{p.severityLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
