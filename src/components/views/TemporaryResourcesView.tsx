/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Tent,
  Sliders,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Send,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  MapPin,
  ArrowRight
} from 'lucide-react';
import {
  SimulationState,
  ResourceType,
  CandidateSite,
  CandidateScoreBreakdown,
  McdaWeights,
  TemporaryResource
} from '../../types/index.ts';
import { McdaService } from '../../services/mcdaService.ts';

interface TemporaryResourcesViewProps {
  state: SimulationState;
  onUpdateState: (newState: SimulationState) => void;
  onSelectSiteOnMap: (site: CandidateSite) => void;
}

export const TemporaryResourcesView: React.FC<TemporaryResourcesViewProps> = ({
  state,
  onUpdateState,
  onSelectSiteOnMap
}) => {
  const [selectedResourceType, setSelectedResourceType] = useState<ResourceType>('Field Clinic');
  const [availableResourceCount, setAvailableResourceCount] = useState<number>(2);
  const [showWeightSliders, setShowWeightSliders] = useState<boolean>(false);
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);

  // Weights from state or defaults
  const weights: McdaWeights = state.weights;

  // Run MCDA evaluations
  const evaluations: CandidateScoreBreakdown[] = McdaService.evaluateCandidateSites(
    state.candidateSites,
    selectedResourceType,
    weights,
    state.emergencyRequests,
    state.hospitals
  );

  // Run greedy spatial selection
  const { selectedSiteIds, uncoveredDemands } = McdaService.selectOptimalSites(
    evaluations,
    state.candidateSites,
    availableResourceCount
  );

  const handleWeightChange = (key: keyof McdaWeights, value: number) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.weights[key] = value;
    onUpdateState(next);
  };

  const handleResetWeights = () => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.weights = {
      demandCoverage: 0.30,
      vulnerabilityCoverage: 0.15,
      accessibility: 0.20,
      healthcareGap: 0.15,
      logisticsSuitability: 0.10,
      hazardRisk: 0.10
    };
    onUpdateState(next);
  };

  // Deploy resource to site
  const handleDeployResource = (siteId: string) => {
    const availableResource = state.temporaryResources.find(
      r => r.type === selectedResourceType && r.status === 'Available'
    );

    if (!availableResource) {
      alert(`No available inventory of '${selectedResourceType}'. All units deployed or under maintenance.`);
      return;
    }

    const next = JSON.parse(JSON.stringify(state)) as SimulationState;

    // Update site
    next.candidateSites = next.candidateSites.map(s => {
      if (s.id === siteId) {
        return { ...s, deployedResourceId: availableResource.id };
      }
      return s;
    });

    // Update resource
    next.temporaryResources = next.temporaryResources.map(r => {
      if (r.id === availableResource.id) {
        return {
          ...r,
          status: 'Deployed' as const,
          siteId: siteId,
          deployedAt: new Date().toISOString()
        };
      }
      return r;
    });

    // Deduct initial medical supply kits from inventory
    if (next.inventory.length > 0) {
      next.inventory[0].quantityAvailable = Math.max(0, next.inventory[0].quantityAvailable - 25);
      next.inventory[0].quantityAllocated += 25;
    }

    onUpdateState(next);
  };

  // Withdraw / Relocate deployed resource
  const handleWithdrawResource = (siteId: string) => {
    const site = state.candidateSites.find(s => s.id === siteId);
    if (!site?.deployedResourceId) return;

    const resId = site.deployedResourceId;
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;

    next.candidateSites = next.candidateSites.map(s => {
      if (s.id === siteId) {
        return { ...s, deployedResourceId: undefined };
      }
      return s;
    });

    next.temporaryResources = next.temporaryResources.map(r => {
      if (r.id === resId) {
        return { ...r, status: 'Available' as const, siteId: undefined };
      }
      return r;
    });

    onUpdateState(next);
  };

  // Toggle safety manually on candidate site to test exclusion
  const handleToggleSiteSafety = (siteId: string) => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.candidateSites = next.candidateSites.map(s => {
      if (s.id === siteId) {
        const isNowUnsafe = s.safetyStatus !== 'Unsafe';
        return {
          ...s,
          safetyStatus: isNowUnsafe ? 'Unsafe' : 'Safe',
          hazardExposure: isNowUnsafe ? 'Inundated' : 'None',
          isAccessible: !isNowUnsafe,
          exclusionReason: isNowUnsafe ? 'Manual safety exclusion test by commander.' : undefined
        };
      }
      return s;
    });
    onUpdateState(next);
  };

  // Total population covered by selected sites
  const totalCoveredPopulation = selectedSiteIds.reduce((sum, sId) => {
    const s = state.candidateSites.find(site => site.id === sId);
    return sum + (s ? s.estimatedPopulationServed : 0);
  }, 0);

  const availableUnitsOfType = state.temporaryResources.filter(
    r => r.type === selectedResourceType && r.status === 'Available'
  ).length;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-900/60 text-purple-300 rounded-lg">
                <Tent className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Temporary Medical Resource Planner</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multi-Criteria Decision Analysis (MCDA) for field clinics, relief camps, mobile units, and supply depots.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowWeightSliders(!showWeightSliders)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>{showWeightSliders ? 'Hide Criteria Weights' : 'Configure MCDA Weights'}</span>
            </button>
          </div>
        </div>

        {/* Configurable MCDA Weights Panel (Collapsible) */}
        {showWeightSliders && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-cyan-300">
                  MCDA Formula Weights Configuration
                </h3>
              </div>
              <button
                onClick={handleResetWeights}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Weights reflect multi-stakeholder priorities. Default formula: Demand (0.30) + Access (0.20) + Gap (0.15) + Vulnerability (0.15) + Logistics (0.10) + Hazard Safety (0.10).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Demand: {Math.round(weights.demandCoverage * 100)}%
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.60"
                  step="0.05"
                  value={weights.demandCoverage}
                  onChange={e => handleWeightChange('demandCoverage', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Road Access: {Math.round(weights.accessibility * 100)}%
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.50"
                  step="0.05"
                  value={weights.accessibility}
                  onChange={e => handleWeightChange('accessibility', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Healthcare Gap: {Math.round(weights.healthcareGap * 100)}%
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.40"
                  step="0.05"
                  value={weights.healthcareGap}
                  onChange={e => handleWeightChange('healthcareGap', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Vulnerability: {Math.round(weights.vulnerabilityCoverage * 100)}%
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.40"
                  step="0.05"
                  value={weights.vulnerabilityCoverage}
                  onChange={e => handleWeightChange('vulnerabilityCoverage', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Logistics: {Math.round(weights.logisticsSuitability * 100)}%
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.30"
                  step="0.05"
                  value={weights.logisticsSuitability}
                  onChange={e => handleWeightChange('logisticsSuitability', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Hazard Safety: {Math.round(weights.hazardRisk * 100)}%
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.30"
                  step="0.05"
                  value={weights.hazardRisk}
                  onChange={e => handleWeightChange('hazardRisk', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Resource Selector & Availability Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Resource Type */}
            <div>
              <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider mb-1.5">
                Resource Category To Optimize
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Field Clinic', 'Relief Camp', 'Mobile Medical Unit', 'Medical Supply Depot'] as ResourceType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedResourceType(t)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium transition cursor-pointer text-left truncate ${
                      selectedResourceType === t
                        ? 'bg-purple-900/70 border border-purple-500 text-purple-200'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Available Units Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Units Available To Deploy
                </label>
                <span className="text-base font-bold text-cyan-400">
                  {availableResourceCount} Units ({availableUnitsOfType} ready in reserve)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={availableResourceCount}
                onChange={e => setAvailableResourceCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>1 Unit (Extreme Scarcity)</span>
                <span>2 Units</span>
                <span>3 Units</span>
                <span>5 Units (Full Deployment)</span>
              </div>
            </div>

            {/* Impact Metric Summary */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Est. Population Protected:</span>
                <span className="font-bold text-white">{totalCoveredPopulation.toLocaleString()} people</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Uncovered Demand Clusters:</span>
                <span className={`font-bold ${uncoveredDemands > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {uncoveredDemands} pending requests
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Safety Constraint:</span>
                <span className="text-emerald-400 font-semibold">Flooded Sites Auto-Excluded</span>
              </div>
            </div>
          </div>
        </div>

        {/* Candidate Site Ranking Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Ranked Candidate Sites for {selectedResourceType} ({evaluations.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Greedy Spatial Coverage Optimization Enforced
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {evaluations.map((evalItem, rankIdx) => {
              const site = state.candidateSites.find(s => s.id === evalItem.siteId)!;
              const isRecommended = selectedSiteIds.includes(evalItem.siteId);
              const isDeployed = !!site.deployedResourceId;
              const isExpanded = expandedSiteId === evalItem.siteId;

              return (
                <div
                  key={evalItem.siteId}
                  className={`p-4 transition ${
                    !evalItem.isEligible
                      ? 'bg-rose-950/20 opacity-70'
                      : isRecommended
                      ? 'bg-purple-950/20'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Site Info */}
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          !evalItem.isEligible
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : isRecommended
                            ? 'bg-purple-900 text-purple-200 border border-purple-600'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {evalItem.isEligible ? `#${rankIdx + 1}` : '✕'}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-white">{site.name}</h4>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                            {site.zone}
                          </span>

                          {/* Status badges */}
                          {isDeployed && (
                            <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-800">
                              CURRENTLY DEPLOYED
                            </span>
                          )}

                          {isRecommended && !isDeployed && (
                            <span className="text-[10px] bg-purple-950 text-purple-200 px-2 py-0.5 rounded font-bold border border-purple-700">
                              RECOMMENDED OPTIMAL
                            </span>
                          )}

                          {!evalItem.isEligible && (
                            <span className="text-[10px] bg-red-950 text-red-300 px-2 py-0.5 rounded font-bold border border-red-800">
                              DISQUALIFIED: CRITICAL SAFETY EXCLUSION
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{evalItem.explanation}</p>

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 mt-2">
                          <span>Pop. Served: <strong className="text-slate-200">{site.estimatedPopulationServed.toLocaleString()}</strong></span>
                          <span>Emergency Demand: <strong className="text-slate-200">{site.nearbyEmergencyDemand}</strong></span>
                          <span>Travel to Hosp: <strong className="text-slate-200">{site.travelTimeToNearestHospitalMin}m</strong></span>
                          <span>Max Capacity: <strong className="text-slate-200">{site.capacityMaxPeople}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Score & Actions */}
                    <div className="flex items-center gap-3 lg:justify-end shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">MCDA Score</span>
                        <span
                          className={`text-xl font-bold ${
                            !evalItem.isEligible
                              ? 'text-red-400 line-through'
                              : isRecommended
                              ? 'text-purple-300'
                              : 'text-slate-300'
                          }`}
                        >
                          {evalItem.finalScore} / 100
                        </span>
                      </div>

                      {/* Deploy or Withdraw Buttons */}
                      {isDeployed ? (
                        <button
                          onClick={() => handleWithdrawResource(site.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-semibold transition cursor-pointer"
                        >
                          Withdraw Resource
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeployResource(site.id)}
                          disabled={!evalItem.isEligible}
                          className="px-3 py-1.5 rounded-lg bg-purple-800 hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold transition cursor-pointer shadow"
                        >
                          Deploy {selectedResourceType}
                        </button>
                      )}

                      {/* Safety toggle for testing exclusion */}
                      <button
                        onClick={() => handleToggleSiteSafety(site.id)}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] transition cursor-pointer"
                        title="Toggle Unsafe status to verify constraint exclusion"
                      >
                        {site.safetyStatus === 'Unsafe' ? 'Mark Safe' : 'Mark Unsafe'}
                      </button>

                      <button
                        onClick={() => setExpandedSiteId(isExpanded ? null : evalItem.siteId)}
                        className="p-1 rounded text-slate-400 hover:text-white"
                        title="View Score Criteria Breakdown"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detailed Audit Breakdown */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 bg-slate-950/80 p-3 rounded-xl text-xs space-y-2">
                      <div className="font-bold text-[11px] text-cyan-300 uppercase tracking-wider">
                        Criteria Audit Breakdown (Normalized Values 0.0 – 1.0)
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[11px]">
                        <div>Demand: <strong>{evalItem.rawDemandCoverage}</strong></div>
                        <div>Vulnerability: <strong>{evalItem.rawVulnerabilityCoverage}</strong></div>
                        <div>Accessibility: <strong>{evalItem.rawAccessibility}</strong></div>
                        <div>Healthcare Gap: <strong>{evalItem.rawHealthcareGap}</strong></div>
                        <div>Logistics: <strong>{evalItem.rawLogisticsSuitability}</strong></div>
                        <div>Hazard Risk: <strong>{evalItem.rawHazardRisk}</strong></div>
                      </div>
                      {evalItem.disqualificationReason && (
                        <div className="text-rose-400 text-[11px] font-semibold mt-1">
                          Safety Constraint Triggered: {evalItem.disqualificationReason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
