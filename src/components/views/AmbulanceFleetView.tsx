/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Ambulance as AmbulanceIcon,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Send,
  Navigation,
  Fuel,
  Users,
  Compass,
  ArrowRight
} from 'lucide-react';
import { SimulationState, Ambulance, AmbulanceStatus, AmbulanceCapability, EmergencyRequest } from '../../types/index.ts';
import { AmbulanceService, StandbyRecommendation } from '../../services/ambulanceService.ts';
import { RoutingService } from '../../services/routingService.ts';

interface AmbulanceFleetViewProps {
  state: SimulationState;
  onUpdateState: (newState: SimulationState) => void;
  onInspectRoute: (amb: Ambulance) => void;
}

export const AmbulanceFleetView: React.FC<AmbulanceFleetViewProps> = ({
  state,
  onUpdateState,
  onInspectRoute
}) => {
  const [selectedAmbulance, setSelectedAmbulance] = useState<Ambulance | null>(null);
  const [dispatchTargetIncidentId, setDispatchTargetIncidentId] = useState<string>('');

  const standbyRecs: StandbyRecommendation[] = AmbulanceService.calculateStandbyRepositioning(
    state.ambulances,
    state.roadNodes,
    state.roadSegments,
    state.emergencyRequests
  );

  const handleStatusChange = (ambId: string, status: AmbulanceStatus) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.ambulances = next.ambulances.map(a => {
      if (a.id === ambId) {
        return {
          ...a,
          status,
          assignedIncidentId: status === 'Available' ? undefined : a.assignedIncidentId,
          currentRouteNodeIds: status === 'Available' ? undefined : a.currentRouteNodeIds
        };
      }
      return a;
    });
    onUpdateState(next);
  };

  const handleManualDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAmbulance || !dispatchTargetIncidentId) return;

    const incident = state.emergencyRequests.find(i => i.id === dispatchTargetIncidentId);
    if (!incident) return;

    // Calculate route
    const route = RoutingService.calculateRoute(
      selectedAmbulance.currentNodeId,
      incident.nearestNodeId,
      state.roadNodes,
      state.roadSegments,
      { hazardAware: true }
    );

    if (!route.isReachable) {
      alert(`Cannot dispatch: Destination node ${incident.nearestNodeId} is unreachable from ${selectedAmbulance.currentNodeId} due to blocked roads.`);
      return;
    }

    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.ambulances = next.ambulances.map(a => {
      if (a.id === selectedAmbulance.id) {
        return {
          ...a,
          status: 'Assigned' as const,
          assignedIncidentId: incident.id,
          estimatedResponseTimeMinutes: route.estimatedTravelTimeMinutes,
          currentRouteNodeIds: route.pathNodeIds
        };
      }
      return a;
    });

    next.emergencyRequests = next.emergencyRequests.map(i => {
      if (i.id === incident.id) {
        return {
          ...i,
          status: 'Assigned' as const,
          assignedAmbulanceId: selectedAmbulance.id
        };
      }
      return i;
    });

    onUpdateState(next);
    setSelectedAmbulance(null);
  };

  const handleApplyRepositioning = (rec: StandbyRecommendation) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    const targetNode = state.roadNodes.find(n => n.id === rec.recommendedNodeId);
    if (!targetNode) return;

    next.ambulances = next.ambulances.map(a => {
      if (a.id === rec.ambulanceId) {
        return {
          ...a,
          currentNodeId: rec.recommendedNodeId,
          currentCoordinates: { lat: targetNode.lat, lng: targetNode.lng },
          lastUpdate: new Date().toISOString()
        };
      }
      return a;
    });

    onUpdateState(next);
  };

  const unassignedIncidents = state.emergencyRequests.filter(
    i => (i.status === 'New' || i.status === 'Unreachable')
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-900/60 text-emerald-300 rounded-lg">
                <AmbulanceIcon className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Ambulance Fleet Management</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Real-time vehicle status, equipment capabilities, and strategic high-ground standby repositioning.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Constraint:</span>
            <span className="font-semibold text-emerald-400">1:1 Vehicle to Incident Binding Enforced</span>
          </div>
        </div>

        {/* Standby Coverage Recommendations Banner */}
        {standbyRecs.length > 0 && (
          <div className="bg-slate-900/90 border border-cyan-800/80 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-xs text-cyan-300 uppercase tracking-wider">
                Recommended Standby Repositioning (Coverage Optimization)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              The coverage positioning algorithm recommends moving idle vehicles toward elevated high-ground nodes near unresolved demand clusters:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {standbyRecs.map((rec, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between font-bold text-slate-200 mb-1">
                      <span>{rec.callSign}</span>
                      <span className="text-[10px] text-cyan-400">+{rec.travelTimeToStandbyMin}m transit</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">{rec.coverageImprovementReason}</p>
                    <div className="text-[10px] text-slate-300 bg-slate-900 p-1.5 rounded mb-2">
                      Move: <strong>Node {rec.currentNodeId}</strong> → <strong>Node {rec.recommendedNodeId} ({rec.recommendedNodeName})</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplyRepositioning(rec)}
                    className="w-full py-1.5 px-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>Reposition Unit</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ambulance Fleet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {state.ambulances.map(amb => {
            const isAvail = amb.status === 'Available';
            const isAssigned = amb.status === 'Assigned' || amb.status === 'En Route';

            return (
              <div
                key={amb.id}
                className={`bg-slate-900 border rounded-2xl p-4 transition flex flex-col justify-between ${
                  isAvail
                    ? 'border-emerald-900/60 hover:border-emerald-700'
                    : isAssigned
                    ? 'border-cyan-800 hover:border-cyan-600'
                    : 'border-slate-800 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-white">{amb.id}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isAvail
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : isAssigned
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {amb.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-cyan-300 mb-1">{amb.callSign}</h4>

                  <div className="space-y-1 text-xs text-slate-300 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Equipment Class:</span>
                      <span className="font-semibold text-slate-200">{amb.capability}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Current Station:</span>
                      <span className="text-slate-200">Node {amb.currentNodeId}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Fuel Level:</span>
                      <div className="flex items-center gap-1 font-semibold text-slate-200">
                        <Fuel className="w-3 h-3 text-amber-400" />
                        <span>{amb.fuelPercent}%</span>
                      </div>
                    </div>

                    <div className="pt-1 text-[11px] text-slate-400 truncate">
                      Crew: {amb.crewName}
                    </div>
                  </div>

                  {amb.assignedIncidentId && (
                    <div className="mt-3 p-2 rounded-lg bg-cyan-950/70 border border-cyan-800/80 text-[11px]">
                      <div className="font-bold text-cyan-300">Assigned: {amb.assignedIncidentId}</div>
                      <div className="text-slate-300">
                        Est. Transit: {amb.estimatedResponseTimeMinutes} mins
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    {isAvail ? (
                      <button
                        onClick={() => setSelectedAmbulance(amb)}
                        className="flex-1 py-1.5 px-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-xs font-medium transition cursor-pointer"
                      >
                        Dispatch Unit
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(amb.id, 'Available')}
                        className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition cursor-pointer"
                      >
                        Recall / Mark Available
                      </button>
                    )}

                    <select
                      value={amb.status}
                      onChange={e => handleStatusChange(amb.id, e.target.value as AmbulanceStatus)}
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300"
                    >
                      <option value="Available">Available</option>
                      <option value="Assigned">Assigned</option>
                      <option value="En Route">En Route</option>
                      <option value="Out of Service">Out of Service</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Manual Dispatch Modal */}
        {selectedAmbulance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <h3 className="font-bold text-white text-base mb-1">
                Dispatch {selectedAmbulance.callSign}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Current base: Node {selectedAmbulance.currentNodeId} • Class: {selectedAmbulance.capability}
              </p>

              <form onSubmit={handleManualDispatch} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Select Incident to Assign
                  </label>
                  <select
                    required
                    value={dispatchTargetIncidentId}
                    onChange={e => setDispatchTargetIncidentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  >
                    <option value="">-- Choose an open emergency --</option>
                    {unassignedIncidents.map(inc => (
                      <option key={inc.id} value={inc.id}>
                        [{inc.severity}] {inc.id}: {inc.locationName} ({inc.peopleCount} victims, Node {inc.nearestNodeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAmbulance(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!dispatchTargetIncidentId}
                    className="px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-medium cursor-pointer"
                  >
                    Confirm Dispatch & Route
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
