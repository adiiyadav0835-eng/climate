/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Hospital as HospitalIcon,
  Bed,
  Activity,
  AlertTriangle,
  CheckCircle,
  Plus,
  Minus,
  Sparkles,
  Search,
  ExternalLink
} from 'lucide-react';
import { SimulationState, Hospital, HospitalStatus, EmergencyRequest } from '../../types/index.ts';
import { HospitalService, HospitalRecommendation } from '../../services/hospitalService.ts';

interface HospitalsViewProps {
  state: SimulationState;
  onUpdateState: (newState: SimulationState) => void;
  onSelectHospitalForRouting: (hosp: Hospital) => void;
}

export const HospitalsView: React.FC<HospitalsViewProps> = ({
  state,
  onUpdateState,
  onSelectHospitalForRouting
}) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(
    state.emergencyRequests.length > 0 ? state.emergencyRequests[0].id : ''
  );

  const selectedIncident = state.emergencyRequests.find(i => i.id === selectedIncidentId) || state.emergencyRequests[0];

  // Run hospital ranking algorithm for selected incident
  const { recommendations, selectedHospital, noHospitalWarning } = selectedIncident
    ? HospitalService.rankHospitalsForIncident(
        selectedIncident,
        state.hospitals,
        state.roadNodes,
        state.roadSegments
      )
    : { recommendations: [], selectedHospital: null, noHospitalWarning: undefined };

  // Adjust available beds
  const handleUpdateBeds = (hospId: string, delta: number) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.hospitals = next.hospitals.map(h => {
      if (h.id === hospId) {
        const newAvailable = Math.max(0, Math.min(h.totalBeds, h.availableBeds + delta));
        const newLoad = h.totalBeds - newAvailable;
        let status: HospitalStatus = h.status;
        if (newAvailable === 0) status = 'Full';
        else if (status === 'Full') status = 'Operational';

        return {
          ...h,
          availableBeds: newAvailable,
          currentPatientLoad: newLoad,
          status
        };
      }
      return h;
    });

    onUpdateState(next);
  };

  const handleToggleOperatingStatus = (hospId: string, newStatus: HospitalStatus) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.hospitals = next.hospitals.map(h => {
      if (h.id === hospId) {
        return { ...h, status: newStatus };
      }
      return h;
    });
    onUpdateState(next);
  };

  const handleSetZeroBeds = (hospId: string) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.hospitals = next.hospitals.map(h => {
      if (h.id === hospId) {
        return {
          ...h,
          availableBeds: 0,
          currentPatientLoad: h.totalBeds,
          status: 'Full'
        };
      }
      return h;
    });
    onUpdateState(next);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-900/60 text-blue-300 rounded-lg">
                <HospitalIcon className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Hospital Network & Surge Allocation</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multi-criteria destination selection: Travel time, ICU/trauma slots, available beds, and road accessibility.
            </p>
          </div>

          <div className="text-xs bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Total Network Beds: </span>
            <span className="font-bold text-blue-300">
              {state.hospitals.reduce((acc, h) => acc + h.availableBeds, 0)} Open /{' '}
              {state.hospitals.reduce((acc, h) => acc + h.totalBeds, 0)} Total
            </span>
          </div>
        </div>

        {/* Live Hospital Recommendation Test Workbench */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-4">
            <div>
              <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Multi-Criteria Hospital Destination Evaluator</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select an emergency incident to test destination ranking and capacity exclusion rules.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Incident:</span>
              <select
                value={selectedIncidentId}
                onChange={e => setSelectedIncidentId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
              >
                {state.emergencyRequests.map(inc => (
                  <option key={inc.id} value={inc.id}>
                    [{inc.severity}] {inc.id}: {inc.locationName} ({inc.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Warning Banner if No Hospital Eligible */}
          {noHospitalWarning && (
            <div className="mb-4 bg-rose-950/80 border border-rose-700 rounded-xl p-3.5 text-xs text-rose-200 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">EMERGENCY DESTINATION ALERT:</strong>
                <span>{noHospitalWarning}</span>
              </div>
            </div>
          )}

          {/* Ranked Results for Incident */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendations.map((rec, idx) => {
              const isTopPick = selectedHospital?.hospitalId === rec.hospitalId;

              return (
                <div
                  key={rec.hospitalId}
                  className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between ${
                    rec.isEligible
                      ? isTopPick
                        ? 'bg-blue-950/40 border-cyan-500 ring-1 ring-cyan-500 shadow-lg'
                        : 'bg-slate-950 border-slate-800'
                      : 'bg-slate-950/50 border-rose-950/60 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-slate-500 font-bold">#{idx + 1}</span>
                        <h4 className="font-bold text-slate-200 text-xs truncate max-w-[170px]">{rec.hospitalName}</h4>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          rec.isEligible
                            ? isTopPick
                              ? 'bg-cyan-900 text-cyan-200'
                              : 'bg-slate-800 text-slate-300'
                            : 'bg-red-950 text-red-400'
                        }`}
                      >
                        {rec.isEligible ? (isTopPick ? 'TOP PICK' : `Score: ${rec.score}`) : 'DISQUALIFIED'}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-300 mt-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Available Beds:</span>
                        <span className={`font-semibold ${rec.availableBeds === 0 ? 'text-red-400' : 'text-slate-200'}`}>
                          {rec.availableBeds} / {rec.totalBeds} ({rec.occupancyPercent}% full)
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-400">Road Transit Time:</span>
                        <span className="font-semibold text-slate-200">
                          {rec.routeResult.isReachable ? `${rec.routeResult.estimatedTravelTimeMinutes} mins` : 'Unreachable'}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800/80 leading-relaxed">
                      {rec.recommendationExplanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hospital Facility Management Cards (with Capacity Editors) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.hospitals.map(hosp => {
            const occPercent = Math.round((hosp.currentPatientLoad / hosp.totalBeds) * 100);
            const isFull = hosp.availableBeds <= 0;

            return (
              <div
                key={hosp.id}
                className={`bg-slate-900 border rounded-2xl p-5 shadow-xl transition flex flex-col justify-between ${
                  isFull ? 'border-red-900/80' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                    <span className="font-bold text-xs text-white">{hosp.id}</span>
                    <select
                      value={hosp.status}
                      onChange={e => handleToggleOperatingStatus(hosp.id, e.target.value as HospitalStatus)}
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-slate-300 font-semibold"
                    >
                      <option value="Operational">Operational</option>
                      <option value="Full">Full</option>
                      <option value="Diverting">Diverting</option>
                      <option value="Limited Access">Limited Access</option>
                    </select>
                  </div>

                  <h3 className="font-bold text-sm text-cyan-300 mb-1">{hosp.name}</h3>
                  <p className="text-[11px] text-slate-400 mb-3">{hosp.address}</p>

                  {/* Bed Capacity Controls */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Available Beds:</span>
                      <span className="font-bold text-base text-white">{hosp.availableBeds}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          occPercent > 90 ? 'bg-red-500' : occPercent > 75 ? 'bg-amber-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${Math.min(100, occPercent)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Total: {hosp.totalBeds}</span>
                      <span>{occPercent}% Occupancy</span>
                    </div>

                    {/* Capacity Buttons for Testing */}
                    <div className="pt-2 flex items-center gap-1.5">
                      <button
                        onClick={() => handleUpdateBeds(hosp.id, -5)}
                        className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        title="Simulate 5 admissions (decrease available beds)"
                      >
                        <Minus className="w-3 h-3" />
                        <span>-5 Beds</span>
                      </button>

                      <button
                        onClick={() => handleUpdateBeds(hosp.id, 5)}
                        className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        title="Simulate 5 discharges (increase available beds)"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+5 Beds</span>
                      </button>

                      <button
                        onClick={() => handleSetZeroBeds(hosp.id)}
                        className="py-1 px-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded text-[10px] font-bold cursor-pointer"
                        title="Test zero bed constraint"
                      >
                        Set 0
                      </button>
                    </div>
                  </div>

                  {/* Capabilities Tags */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Treatment Capabilities:</span>
                    <div className="flex flex-wrap gap-1">
                      {hosp.capabilities.map((cap, i) => (
                        <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Nearest Node: {hosp.nearestNodeId}</span>
                  <span>Emergency Slots: {hosp.emergencyCapacity}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
