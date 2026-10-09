/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CloudRain,
  Wind,
  Flame,
  Settings2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { SimulationState, DisasterType, HazardZone } from '../../types/index.ts';
import { SCENARIO_PRESETS, ScenarioService } from '../../services/scenarioService.ts';

interface ScenariosViewProps {
  state: SimulationState;
  onUpdateState: (newState: SimulationState) => void;
  onRecalculatePlan: () => void;
}

export const ScenariosView: React.FC<ScenariosViewProps> = ({
  state,
  onUpdateState,
  onRecalculatePlan
}) => {
  const [activeTab, setActiveTab] = useState<DisasterType>(state.scenario.currentScenario);

  // Local controls for slider adjustments
  const handleFloodSlider = (val: number) => {
    const updated = ScenarioService.updateFloodSeverity(state, val);
    onUpdateState(updated);
  };

  const handleCycloneWindSlider = (val: number) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.scenario.cycloneWindIntensity = val;
    next.scenario.currentScenario = 'cyclone';

    // If wind > 90 km/h, block exposed roads
    if (val >= 80) {
      next.roadSegments = next.roadSegments.map(s => {
        if (s.id === 'S11' || s.id === 'S28') {
          return {
            ...s,
            isBlocked: true,
            hazardExposure: 'Severe',
            roadCondition: 'Debris-strewn',
            blockReason: `High gale winds (${val} km/h) blew debris across corridor.`
          };
        }
        return s;
      });
    } else {
      next.roadSegments = next.roadSegments.map(s => {
        if (s.blockReason?.includes('debris')) {
          return { ...s, isBlocked: false, roadCondition: 'Good', blockReason: undefined };
        }
        return s;
      });
    }

    onUpdateState(next);
  };

  const handleCycloneDirectionChange = (dir: any) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.scenario.cycloneDirection = dir;
    onUpdateState(next);
  };

  const handleHeatwaveTempSlider = (temp: number) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.scenario.heatwaveTemperatureC = temp;
    next.scenario.currentScenario = 'heatwave';

    // If temp >= 42°C, escalate heatstroke calls
    if (temp >= 40) {
      next.emergencyRequests = next.emergencyRequests.map(r => {
        if (r.category === 'Heatstroke' || r.category === 'Respiratory') {
          return {
            ...r,
            severity: temp >= 43 ? 'Critical' : 'High',
            peopleCount: Math.max(r.peopleCount, 6)
          };
        }
        return r;
      });
    }

    onUpdateState(next);
  };

  const handleApplyPreset = (presetId: string) => {
    const next = ScenarioService.applyPreset(presetId, state);
    onUpdateState(next);
    onRecalculatePlan();
  };

  const handleAddCustomZone = () => {
    const newZone: HazardZone = {
      id: `HAZ-CUSTOM-${Date.now()}`,
      type: state.scenario.currentScenario,
      name: `Custom Hazard Hotspot ${state.scenario.activeHazardZones.length + 1}`,
      center: { lat: 18.5204, lng: 73.8567 },
      radiusMeters: 1500,
      severity: 70,
      description: 'Commander-defined simulated hazard perimeter requiring area evacuation.',
      affectedRoadIds: ['S1', 'S2'],
      affectedCandidateSiteIds: []
    };

    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.scenario.activeHazardZones.push(newZone);
    onUpdateState(next);
  };

  const handleRemoveZone = (zoneId: string) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.scenario.activeHazardZones = next.scenario.activeHazardZones.filter(z => z.id !== zoneId);
    onUpdateState(next);
  };

  const handleZoneRadiusChange = (zoneId: string, radius: number) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    const target = next.scenario.activeHazardZones.find(z => z.id === zoneId);
    if (target) {
      target.radiusMeters = radius;
    }
    onUpdateState(next);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-900/60 text-cyan-300 rounded-lg">
                <CloudRain className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Disaster Scenario Simulator</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configure climate-induced hazards, adjust water levels and wind intensity, and trigger network recalculations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded border border-amber-800">
              SIMULATED CLIMATE FORCING ONLY
            </span>
            <button
              onClick={onRecalculatePlan}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-medium text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Apply & Recalculate</span>
            </button>
          </div>
        </div>

        {/* Preset Cards Strip */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Standard Scenario Presets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {SCENARIO_PRESETS.map(preset => {
              const isCurrent = state.scenario.scenarioPresetName === preset.title;
              return (
                <div
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition relative flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-lg ring-1 ring-cyan-500'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-600 hover:bg-slate-800/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {preset.type}
                      </span>
                      {isCurrent && (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-white mb-1">{preset.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{preset.description}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Severity:</span>
                    <span className="font-semibold text-cyan-300">{preset.severityLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Hazard Parameter Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {/* Disaster Type Selector Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-6">
            <button
              onClick={() => setActiveTab('flood')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'flood'
                  ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <CloudRain className="w-4 h-4" />
              <span>A. Flood Simulation</span>
            </button>
            <button
              onClick={() => setActiveTab('cyclone')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'cyclone'
                  ? 'bg-purple-900/60 text-purple-300 border border-purple-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Wind className="w-4 h-4" />
              <span>B. Cyclone Gale Impact</span>
            </button>
            <button
              onClick={() => setActiveTab('heatwave')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'heatwave'
                  ? 'bg-amber-900/60 text-amber-300 border border-amber-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>C. Heatwave Thermal Stress</span>
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>D. Custom Scenario</span>
            </button>
          </div>

          {/* Active Tab Panel */}
          {activeTab === 'flood' && (
            <div className="space-y-6">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    River Discharge & Flood Severity Slider
                  </label>
                  <span className="text-lg font-bold text-white">{state.scenario.floodSeverity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={state.scenario.floodSeverity}
                  onChange={e => handleFloodSlider(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                  <span>Normal (0%)</span>
                  <span>Moderate Spill (50%)</span>
                  <span>Bridge Inundation (70%)</span>
                  <span>100-Year Catastrophe (100%)</span>
                </div>
                <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                  <strong>Consequences:</strong> At severity ≥ 50%, Sinhagad road underpass (S14) is blocked. At ≥ 60%, Yerawada low bridge (S5) is submerged. Candidate site SITE-06 is automatically marked unsafe and excluded from clinic placement.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cyclone' && (
            <div className="space-y-6">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                      Simulated Wind Gale Intensity (km/h)
                    </label>
                    <span className="text-lg font-bold text-white">{state.scenario.cycloneWindIntensity} km/h</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="160"
                    step="5"
                    value={state.scenario.cycloneWindIntensity}
                    onChange={e => handleCycloneWindSlider(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>15 km/h (Breeze)</span>
                    <span>75 km/h (Gale)</span>
                    <span>115 km/h (Cyclone)</span>
                    <span>160 km/h (Cat 3 Severe)</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Gale Impact Vector / Trajectory
                  </label>
                  <select
                    value={state.scenario.cycloneDirection}
                    onChange={e => handleCycloneDirectionChange(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  >
                    {['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'].map(d => (
                      <option key={d} value={d}>
                        Vector: {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'heatwave' && (
            <div className="space-y-6">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Simulated Ambient Temperature (°C)
                  </label>
                  <span className="text-lg font-bold text-amber-300">{state.scenario.heatwaveTemperatureC} °C</span>
                </div>
                <input
                  type="range"
                  min="28"
                  max="48"
                  step="0.5"
                  value={state.scenario.heatwaveTemperatureC}
                  onChange={e => handleHeatwaveTempSlider(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>28°C (Normal)</span>
                  <span>38°C (Elevated)</span>
                  <span>42°C (Heatwave Alert)</span>
                  <span>48°C (Extreme Disaster)</span>
                </div>
                <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                  <strong>Consequences:</strong> Prioritizes Mobile Medical Units with active misting/cooling equipment toward dense unshaded urban bastis (Swargate and Hadapsar labor corridors).
                </p>
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Create and resize custom hazard polygons, toggle specific road segments, and configure operational constraints.
              </p>
              <button
                onClick={handleAddCustomZone}
                className="px-3 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-700 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom Hazard Zone</span>
              </button>
            </div>
          )}

          {/* Active Hazard Zones List */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Active Hazard Overlays ({state.scenario.activeHazardZones.length})
              </h4>
              <button
                onClick={handleAddCustomZone}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Hazard Zone</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {state.scenario.activeHazardZones.map(zone => (
                <div
                  key={zone.id}
                  className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">{zone.name}</span>
                    <button
                      onClick={() => handleRemoveZone(zone.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition"
                      title="Remove Hazard Zone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">{zone.description}</p>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Impact Radius:</span>
                      <span className="font-semibold text-slate-200">{(zone.radiusMeters / 1000).toFixed(1)} km</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="4000"
                      step="100"
                      value={zone.radiusMeters}
                      onChange={e => handleZoneRadiusChange(zone.id, Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>
              ))}

              {state.scenario.activeHazardZones.length === 0 && (
                <div className="col-span-2 text-center py-6 text-slate-500 text-xs">
                  No active hazard zones under baseline conditions.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
