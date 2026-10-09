/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Megaphone, PlusCircle, HeartHandshake, ShieldCheck, MapPin } from 'lucide-react';
import { SimulationState } from '../types/index.ts';

interface DistrictGaugesWidgetProps {
  state: SimulationState;
  onOpenNewIncident: () => void;
  onOpenAutoDispatch: () => void;
  onOpenMCDAPlanner: () => void;
}

export const DistrictGaugesWidget: React.FC<DistrictGaugesWidgetProps> = ({
  state,
  onOpenNewIncident,
  onOpenAutoDispatch,
  onOpenMCDAPlanner
}) => {
  // Calculate real values from simulation
  const totalIncidents = state.emergencyRequests.length;
  const activeIncidents = state.emergencyRequests.filter(i => i.status !== 'Resolved').length;
  const criticalCount = state.emergencyRequests.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length;
  const highCount = state.emergencyRequests.filter(i => i.severity === 'High' && i.status !== 'Resolved').length;
  const mediumCount = state.emergencyRequests.filter(i => i.severity === 'Moderate' && i.status !== 'Resolved').length;
  const lowCount = state.emergencyRequests.filter(i => i.severity === 'Low' && i.status !== 'Resolved').length;

  // Circular gauge values
  const gauge1Percent = Math.min(100, Math.round((criticalCount + highCount) * 11) + 20); // Flood containment
  const gauge2Percent = Math.min(100, Math.round((state.hospitals.reduce((acc, h) => acc + h.availableBeds, 0) / 180) * 100)); // Bed buffer

  const circleRadius = 38;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset1 = circleCircumference - (gauge1Percent / 100) * circleCircumference;
  const strokeDashoffset2 = circleCircumference - (gauge2Percent / 100) * circleCircumference;

  return (
    <div className="bg-[#0d131f]/95 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-4">
      {/* Top District Card Strip (Styled as in Image 1) */}
      <div>
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">
              {state.selectedDistrict}
            </h3>
          </div>
          <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
            METRO SECTOR 01
          </span>
        </div>

        {/* 3 Metric Counts */}
        <div className="grid grid-cols-3 gap-2 text-center bg-[#090d16]/80 p-2.5 rounded-xl border border-slate-800/80 mb-3">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Accumulative</span>
            <span className="text-lg font-bold text-white">{totalIncidents}</span>
          </div>
          <div className="border-x border-slate-800/80">
            <span className="text-[10px] text-slate-400 block font-medium">Active Triage</span>
            <span className="text-lg font-bold text-cyan-400">{activeIncidents}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Critical</span>
            <span className="text-lg font-bold text-rose-400">{criticalCount}</span>
          </div>
        </div>

        {/* Circular Dials (Matching Image 1 Gauges) */}
        <div className="grid grid-cols-2 gap-3 py-1">
          {/* Dial 1 */}
          <div className="bg-[#111827]/80 rounded-xl p-3 border border-slate-800 flex flex-col items-center text-center">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r={circleRadius}
                  stroke="#1f2937"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={circleRadius}
                  stroke="#00f2fe"
                  strokeWidth="7"
                  strokeDasharray={circleCircumference}
                  strokeDashoffset={strokeDashoffset1}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-base font-bold text-white">{gauge1Percent}%</span>
              </div>
            </div>
            <span className="text-xs font-bold text-cyan-300 mt-1 uppercase tracking-tight">PS. DEPOK BASIN</span>
            <span className="text-[10px] text-slate-400">In Area: {activeIncidents * 4} peoples</span>
            <span className="text-[9px] text-slate-500">Total: 50 peoples</span>
          </div>

          {/* Dial 2 */}
          <div className="bg-[#111827]/80 rounded-xl p-3 border border-slate-800 flex flex-col items-center text-center">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r={circleRadius}
                  stroke="#1f2937"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={circleRadius}
                  stroke="#3b82f6"
                  strokeWidth="7"
                  strokeDasharray={circleCircumference}
                  strokeDashoffset={strokeDashoffset2}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-base font-bold text-white">{gauge2Percent}%</span>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-300 mt-1 uppercase tracking-tight">HOSPITAL BUFFER</span>
            <span className="text-[10px] text-slate-400">Vacant: {state.hospitals.reduce((acc, h) => acc + h.availableBeds, 0)} Beds</span>
            <span className="text-[9px] text-slate-500">Total: 180 Capacity</span>
          </div>
        </div>
      </div>

      {/* Incident Risk Level Strip (Matching Image 1) */}
      <div className="bg-[#090d16]/80 p-2.5 rounded-xl border border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
          Incident Risk Level Breakdown
        </span>
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
            <span>{criticalCount + highCount} HIGH</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
            <span>{mediumCount} MEDIUM</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50"></span>
            <span>{lowCount} LOW</span>
          </div>
        </div>
      </div>

      {/* 3 Vibrant SaaS Action Buttons (Matching Image 1: Orange, Cyan, Magenta) */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {/* Button 1: Emergency Services (Orange) */}
        <button
          onClick={onOpenAutoDispatch}
          className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 text-white flex flex-col items-center text-center shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
        >
          <Megaphone className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-extrabold uppercase leading-tight">EMERGENCY SERVICES</span>
        </button>

        {/* Button 2: New Report (Cyan) */}
        <button
          onClick={onOpenNewIncident}
          className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white flex flex-col items-center text-center shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
        >
          <PlusCircle className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-extrabold uppercase leading-tight">NEW REPORT</span>
        </button>

        {/* Button 3: New Responses (Magenta) */}
        <button
          onClick={onOpenMCDAPlanner}
          className="p-2.5 rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-700 text-white flex flex-col items-center text-center shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
        >
          <HeartHandshake className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-extrabold uppercase leading-tight">NEW RESPONSES</span>
        </button>
      </div>
    </div>
  );
};
