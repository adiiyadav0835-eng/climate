/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Route as RouteIcon,
  Navigation,
  AlertTriangle,
  Clock,
  Compass,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { SimulationState, RouteResult } from '../../types/index.ts';
import { RoutingService } from '../../services/routingService.ts';

interface RoutingViewProps {
  state: SimulationState;
  onUpdateState: (newState: SimulationState) => void;
  onSetMapRoute: (primary: RouteResult | null, alt: RouteResult | null) => void;
}

export const RoutingView: React.FC<RoutingViewProps> = ({
  state,
  onUpdateState,
  onSetMapRoute
}) => {
  const [startNodeId, setStartNodeId] = useState<string>('N1');
  const [endNodeId, setEndNodeId] = useState<string>('N8');
  const [activeEvacDestId, setActiveEvacDestId] = useState<string>('EVAC-1');

  // Compute live route with alternative & baseline
  const { primaryRoute, alternativeRoute, baselineRoute } = RoutingService.calculateRouteWithAlternative(
    startNodeId,
    endNodeId,
    state.roadNodes,
    state.roadSegments
  );

  const startNode = state.roadNodes.find(n => n.id === startNodeId);
  const endNode = state.roadNodes.find(n => n.id === endNodeId);

  // Toggle road block
  const handleToggleRoad = (segmentId: string) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.roadSegments = next.roadSegments.map(s => {
      if (s.id === segmentId) {
        const isBlocked = !s.isBlocked;
        return {
          ...s,
          isBlocked,
          blockReason: isBlocked ? 'Manual commander closure' : undefined,
          roadCondition: isBlocked ? 'Waterlogged' : 'Good'
        };
      }
      return s;
    });

    onUpdateState(next);
  };

  const handleApplyToMap = () => {
    onSetMapRoute(primaryRoute, alternativeRoute);
  };

  const blockedSegments = state.roadSegments.filter(s => s.isBlocked);

  // Evacuation routing
  const selectedEvacDest = state.evacuationDestinations.find(e => e.id === activeEvacDestId);
  const evacRoute = selectedEvacDest
    ? RoutingService.calculateRoute(
        startNodeId,
        selectedEvacDest.nearestNodeId,
        state.roadNodes,
        state.roadSegments,
        { hazardAware: true }
      )
    : null;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-900/60 text-cyan-300 rounded-lg">
                <RouteIcon className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Safe Routing & Evacuation Engine</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dijkstra graph router with dynamic flood penalties, alternative corridor generation, and road closures.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyToMap}
              className="px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-medium text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>Project Route Onto GIS Map</span>
            </button>
          </div>
        </div>

        {/* Route Calculator Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
            {/* Origin Node */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Origin Road Node
              </label>
              <select
                value={startNodeId}
                onChange={e => setStartNodeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {state.roadNodes.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.id}: {n.name} ({n.zone}) {n.isHighGround ? '▲ High Ground' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Node */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Destination Road Node
              </label>
              <select
                value={endNodeId}
                onChange={e => setEndNodeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {state.roadNodes.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.id}: {n.name} ({n.zone}) {n.isHighGround ? '▲ High Ground' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Evacuation Hub Preset */}
            <div>
              <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                Safe Evacuation Destination
              </label>
              <select
                value={activeEvacDestId}
                onChange={e => {
                  setActiveEvacDestId(e.target.value);
                  const dest = state.evacuationDestinations.find(d => d.id === e.target.value);
                  if (dest) setEndNodeId(dest.nearestNodeId);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {state.evacuationDestinations.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} (Cap: {d.capacity.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Route Calculation Results: Primary vs Alternative vs Baseline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Primary Recommended Route (Hazard-Aware) */}
          <div className="bg-slate-900 border border-emerald-900/70 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
                  <h3 className="font-bold text-sm text-emerald-400">1. Recommended Safe Route</h3>
                </div>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                  Hazard-Aware
                </span>
              </div>

              {primaryRoute.isReachable ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400">Est. Travel Time</span>
                      <p className="text-xl font-bold text-white">{primaryRoute.estimatedTravelTimeMinutes} min</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Total Distance</span>
                      <p className="text-xl font-bold text-white">{primaryRoute.totalDistanceKm} km</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Turn-by-Turn Waypoints:</span>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300">
                      {primaryRoute.pathNodeIds.join(' ➔ ')}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Traversed segments: {primaryRoute.traversedSegmentIds.join(', ')} ({primaryRoute.hazardSegmentsCount} hazardous segments with reduced speed).
                  </p>
                </div>
              ) : (
                <div className="bg-rose-950/60 border border-rose-800 rounded-xl p-4 text-xs text-rose-200">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>DESTINATION UNREACHABLE</span>
                  </div>
                  <p>{primaryRoute.failureReason}</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500">
              Computed via Dijkstra with waterlogged road penalties.
            </div>
          </div>

          {/* Alternative Route */}
          <div className="bg-slate-900 border border-amber-900/60 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <h3 className="font-bold text-sm text-amber-400">2. Alternative Detour Route</h3>
                </div>
                <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded font-semibold">
                  Fallback Detour
                </span>
              </div>

              {alternativeRoute && alternativeRoute.isReachable ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400">Est. Travel Time</span>
                      <p className="text-xl font-bold text-white">{alternativeRoute.estimatedTravelTimeMinutes} min</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Total Distance</span>
                      <p className="text-xl font-bold text-white">{alternativeRoute.totalDistanceKm} km</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Turn-by-Turn Waypoints:</span>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-amber-300">
                      {alternativeRoute.pathNodeIds.join(' ➔ ')}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Provides secondary corridor if primary route becomes congested or submerged.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No distinct alternative route exists for this node pair under current closures.
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500">
              Generated by penalizing primary segment graph costs.
            </div>
          </div>

          {/* Baseline Comparison (Unimpeded Normal Route) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                  <h3 className="font-bold text-sm text-slate-300">3. Normal Baseline Comparison</h3>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold">
                  Unimpeded
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400">Normal Travel Time</span>
                    <p className="text-xl font-bold text-slate-300">{baselineRoute.estimatedTravelTimeMinutes} min</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Normal Distance</span>
                    <p className="text-xl font-bold text-slate-300">{baselineRoute.totalDistanceKm} km</p>
                  </div>
                </div>

                {primaryRoute.isReachable && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1">
                    <span className="text-slate-400 block font-semibold">Disaster Impact Delay:</span>
                    <p className="text-amber-400 font-bold">
                      +{Math.max(0, Math.round((primaryRoute.estimatedTravelTimeMinutes - baselineRoute.estimatedTravelTimeMinutes) * 10) / 10)} mins extra transit time (+{Math.max(0, Math.round((primaryRoute.totalDistanceKm - baselineRoute.totalDistanceKm) * 10) / 10)} km detour)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500">
              Comparison between normal conditions and hazard delays.
            </div>
          </div>
        </div>

        {/* Road Segment Block/Unblock Interactive Manager */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-white">Road Segment Access & Blockage Controls</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any road segment to simulate a fallen bridge, flash flood blockage, or debris clearance.
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-800 text-slate-300">
              {blockedSegments.length} of {state.roadSegments.length} Segments Blocked
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
            {state.roadSegments.map(seg => {
              const isBlocked = seg.isBlocked;
              return (
                <div
                  key={seg.id}
                  onClick={() => handleToggleRoad(seg.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    isBlocked
                      ? 'bg-rose-950/40 border-rose-800/80 hover:bg-rose-900/50'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="pr-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                      <span>[{seg.id}]</span>
                      <span className="truncate">{seg.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {seg.distanceKm} km • {seg.normalTravelTimeMinutes} min • {seg.roadCondition}
                    </div>
                    {isBlocked && (
                      <p className="text-[10px] text-rose-300 font-semibold mt-1">
                        {seg.blockReason || 'Closed due to hazard'}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    {isBlocked ? (
                      <span className="px-2 py-1 bg-red-900 text-red-200 rounded text-[10px] font-bold">
                        BLOCKED
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-[10px]">
                        OPEN
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
