/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  PhoneCall,
  Plus,
  Filter,
  ArrowUpDown,
  CheckCircle,
  AlertCircle,
  Trash2,
  Send,
  Clock,
  User,
  MapPin,
  Ambulance as AmbulanceIcon,
  X
} from 'lucide-react';
import {
  SimulationState,
  EmergencyRequest,
  EmergencySeverity,
  EmergencyStatus,
  AmbulanceCapability
} from '../../types/index.ts';
import { AmbulanceService } from '../../services/ambulanceService.ts';
import { RoutingService } from '../../services/routingService.ts';

interface EmergenciesViewProps {
  state: SimulationState;
  onUpdateState: (newState: SimulationState) => void;
  onSelectIncidentForRouting: (inc: EmergencyRequest) => void;
}

export const EmergenciesView: React.FC<EmergenciesViewProps> = ({
  state,
  onUpdateState,
  onSelectIncidentForRouting
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New emergency form state
  const [newLocationName, setNewLocationName] = useState('');
  const [newNearestNodeId, setNewNearestNodeId] = useState('N1');
  const [newCategory, setNewCategory] = useState<'Trauma' | 'Respiratory' | 'Maternal' | 'Cardiac' | 'Heatstroke' | 'Drowning/Water' | 'General'>('Trauma');
  const [newSeverity, setNewSeverity] = useState<EmergencySeverity>('High');
  const [newPeopleCount, setNewPeopleCount] = useState<number>(3);
  const [newCapability, setNewCapability] = useState<AmbulanceCapability>('ALS');
  const [newNotes, setNewNotes] = useState('');

  // Dispatch All Optimal recommendations
  const handleAutoDispatch = () => {
    const { dispatches } = AmbulanceService.computeOptimalDispatches(
      state.emergencyRequests,
      state.ambulances,
      state.roadNodes,
      state.roadSegments
    );

    if (dispatches.length === 0) {
      alert('No available ambulances or reachable routes for pending incidents.');
      return;
    }

    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    const dispatchMap = new Map(dispatches.map(d => [d.incidentId, d]));

    next.emergencyRequests = next.emergencyRequests.map(inc => {
      const d = dispatchMap.get(inc.id);
      if (d) {
        return {
          ...inc,
          status: 'Assigned' as const,
          assignedAmbulanceId: d.ambulanceId
        };
      }
      return inc;
    });

    next.ambulances = next.ambulances.map(amb => {
      const match = dispatches.find(d => d.ambulanceId === amb.id);
      if (match) {
        return {
          ...amb,
          status: 'Assigned' as const,
          assignedIncidentId: match.incidentId,
          estimatedResponseTimeMinutes: match.estimatedResponseTimeMinutes,
          currentRouteNodeIds: match.routeResult.pathNodeIds
        };
      }
      return amb;
    });

    onUpdateState(next);
  };

  const handleAddIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;

    const targetNode = state.roadNodes.find(n => n.id === newNearestNodeId) || state.roadNodes[0];

    const newInc: EmergencyRequest = {
      id: `INC-${100 + state.emergencyRequests.length + 1}`,
      locationName: newLocationName,
      coordinates: {
        lat: targetNode.lat + (Math.random() - 0.5) * 0.005,
        lng: targetNode.lng + (Math.random() - 0.5) * 0.005
      },
      nearestNodeId: targetNode.id,
      category: newCategory,
      severity: newSeverity,
      peopleCount: Number(newPeopleCount) || 1,
      timeReceived: new Date().toISOString(),
      requiredCapability: newCapability,
      status: 'New',
      waitingTimeMinutes: 1,
      notes: newNotes || 'Dispatched via commander incident input form.'
    };

    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.emergencyRequests.unshift(newInc);
    onUpdateState(next);

    setShowAddModal(false);
    setNewLocationName('');
    setNewNotes('');
  };

  const handleDeleteIncident = (id: string) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.emergencyRequests = next.emergencyRequests.filter(i => i.id !== id);
    // free up assigned ambulance if any
    next.ambulances = next.ambulances.map(a => {
      if (a.assignedIncidentId === id) {
        return { ...a, status: 'Available' as const, assignedIncidentId: undefined };
      }
      return a;
    });
    onUpdateState(next);
  };

  const handleStatusChange = (id: string, newStatus: EmergencyStatus) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.emergencyRequests = next.emergencyRequests.map(i => {
      if (i.id === id) {
        return { ...i, status: newStatus };
      }
      return i;
    });

    // If resolved, release ambulance
    if (newStatus === 'Resolved') {
      const inc = state.emergencyRequests.find(i => i.id === id);
      if (inc?.assignedAmbulanceId) {
        next.ambulances = next.ambulances.map(a => {
          if (a.id === inc.assignedAmbulanceId) {
            return {
              ...a,
              status: 'Available' as const,
              assignedIncidentId: undefined,
              currentRouteNodeIds: undefined
            };
          }
          return a;
        });
      }
    }

    onUpdateState(next);
  };

  // Prioritize list using algorithm
  const prioritized = AmbulanceService.prioritizeEmergencies(state.emergencyRequests);

  const filteredIncidents = prioritized.filter(inc => {
    if (filterSeverity !== 'ALL' && inc.severity !== filterSeverity) return false;
    if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
    if (
      searchTerm &&
      !inc.locationName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !inc.id.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-900/60 text-rose-300 rounded-lg">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Emergency Incident Management</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multi-criteria triage ranking: Severity, waiting latency, victim count, and route accessibility.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleAutoDispatch}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Auto-Dispatch Fleet</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-medium text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log New Incident</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by ID, location, or basti..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full max-w-xs bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400">Severity:</span>
              {['ALL', 'Critical', 'High', 'Moderate', 'Low'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterSeverity(s)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                    filterSeverity === s ? 'bg-cyan-800 text-cyan-100' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400">Status:</span>
              {['ALL', 'New', 'Assigned', 'Resolved'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                    filterStatus === st ? 'bg-cyan-800 text-cyan-100' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table of Incidents */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Priority / ID</th>
                  <th className="py-3 px-4">Location & Category</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Victims / Req</th>
                  <th className="py-3 px-4">Wait Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Ambulance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {filteredIncidents.map((inc, index) => {
                  const isCrit = inc.severity === 'Critical';
                  const isAssigned = inc.status === 'Assigned' || inc.status === 'En Route';

                  return (
                    <tr
                      key={inc.id}
                      className={`hover:bg-slate-800/50 transition ${
                        isCrit ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 font-sans">#{index + 1}</span>
                          <span>{inc.id}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{inc.locationName}</div>
                        <div className="text-[11px] text-slate-400">
                          {inc.category} • Nearest Node {inc.nearestNodeId}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inc.severity === 'Critical'
                              ? 'bg-red-900 text-red-200'
                              : inc.severity === 'High'
                              ? 'bg-amber-900 text-amber-200'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {inc.severity}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div>{inc.peopleCount} persons</div>
                        <div className="text-[10px] text-slate-400">{inc.requiredCapability}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{inc.waitingTimeMinutes} mins</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={inc.status}
                          onChange={e => handleStatusChange(inc.id, e.target.value as EmergencyStatus)}
                          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none"
                        >
                          {['New', 'Assigned', 'En Route', 'Reached', 'Resolved', 'Unreachable'].map(st => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 px-4">
                        {inc.assignedAmbulanceId ? (
                          <span className="font-semibold text-emerald-400 flex items-center gap-1">
                            <AmbulanceIcon className="w-3.5 h-3.5" />
                            {inc.assignedAmbulanceId}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => onSelectIncidentForRouting(inc)}
                          className="px-2 py-1 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-300 rounded text-[11px] font-medium transition cursor-pointer"
                          title="Inspect Dijkstra Route"
                        >
                          Route
                        </button>
                        <button
                          onClick={() => handleDeleteIncident(inc.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                          title="Delete Incident"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredIncidents.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">
              No emergency incidents found matching filters.
            </div>
          )}
        </div>

        {/* Add Incident Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h3 className="font-bold text-white text-base">Log New Emergency Request</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddIncident} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Incident Location Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Yerawada Slum Cluster 3"
                    value={newLocationName}
                    onChange={e => setNewLocationName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nearest Network Node</label>
                    <select
                      value={newNearestNodeId}
                      onChange={e => setNewNearestNodeId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    >
                      {state.roadNodes.map(n => (
                        <option key={n.id} value={n.id}>
                          {n.id}: {n.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Emergency Category</label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    >
                      {['Trauma', 'Respiratory', 'Maternal', 'Cardiac', 'Heatstroke', 'Drowning/Water', 'General'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Severity</label>
                    <select
                      value={newSeverity}
                      onChange={e => setNewSeverity(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    >
                      {['Critical', 'High', 'Moderate', 'Low'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Victims / Demand</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newPeopleCount}
                      onChange={e => setNewPeopleCount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Ambulance Class</label>
                    <select
                      value={newCapability}
                      onChange={e => setNewCapability(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    >
                      {['ALS', 'BLS', 'Critical Care', 'Mobile Triage'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Triage Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Enter special access notes, water depth, power conditions..."
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-medium cursor-pointer"
                  >
                    Add Incident
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
