/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Play,
  Database,
  Globe,
  FileCode,
  Layers,
  BookOpen
} from 'lucide-react';
import { SimulationState } from '../../types/index.ts';
import { TestRunner, TestResultItem } from '../../utils/testRunner.ts';

interface SettingsViewProps {
  state: SimulationState;
  onResetSimulation: () => void;
  onUpdateState: (newState: SimulationState) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  onResetSimulation
}) => {
  const [testResults, setTestResults] = useState<TestResultItem[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const handleRunTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const results = TestRunner.runAllTests();
      setTestResults(results);
      setIsRunningTests(false);
    }, 400);
  };

  const allPassed = testResults ? testResults.every(t => t.passed) : false;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-800 text-slate-300 rounded-lg">
                <Settings className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Settings & Data Sources</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Simulation persistence management, automated algorithm validation suite, and external data integration guide.
            </p>
          </div>

          <button
            onClick={onResetSimulation}
            className="px-4 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Simulation to Seed Dataset</span>
          </button>
        </div>

        {/* Section 1: Automated Unit & Acceptance Test Runner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Core Algorithm Acceptance Tests</span>
                {testResults && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      allPassed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300'
                    }`}
                  >
                    {allPassed ? 'ALL TESTS PASSED (8/8)' : 'TESTS FAILED'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Executes the actual Dijkstra routing, MCDA safety exclusions, hospital capacity, and inventory constraint logic.
              </p>
            </div>

            <button
              onClick={handleRunTests}
              disabled={isRunningTests}
              className="px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow transition cursor-pointer self-start sm:self-auto"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunningTests ? 'Executing Tests...' : 'Run Automated Tests'}</span>
            </button>
          </div>

          {testResults ? (
            <div className="space-y-2.5">
              {testResults.map(test => (
                <div
                  key={test.id}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition ${
                    test.passed
                      ? 'bg-slate-950/80 border-slate-800'
                      : 'bg-rose-950/40 border-rose-800'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {test.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">
                        [{test.id}] {test.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          test.passed ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'
                        }`}
                      >
                        {test.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{test.description}</p>
                    <p className="text-[11px] font-mono text-cyan-300 mt-1 bg-slate-900/90 p-1.5 rounded border border-slate-800">
                      {test.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs">
              Click &quot;Run Automated Tests&quot; to verify routing algorithms, hospital capacity constraints, single-dispatch rules, and MCDA safety exclusions.
            </div>
          )}
        </div>

        {/* Section 2: Active Simulation Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Road Graph Topology</h4>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Road Junction Nodes:</span>
                <span className="font-bold text-white">{state.roadNodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Road Segments:</span>
                <span className="font-bold text-white">{state.roadSegments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Blocked Segments:</span>
                <span className="font-bold text-rose-400">{state.roadSegments.filter(s => s.isBlocked).length}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Resource Fleet</h4>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Ambulances:</span>
                <span className="font-bold text-white">{state.ambulances.length} Units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hospitals:</span>
                <span className="font-bold text-white">{state.hospitals.length} Centers</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Candidate Sites:</span>
                <span className="font-bold text-white">{state.candidateSites.length} Sites</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Simulation Engine</h4>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Storage Backend:</span>
                <span className="font-bold text-emerald-400">HTML5 LocalStorage</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Recalculated:</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {new Date(state.lastRecalculatedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Data Migration Guide (HDX / HOT / OpenStreetMap Integration) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">
              Data Architecture & Production Upgrade Guide (HDX / HOT / Live Feeds)
            </h3>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            The current CAERN prototype uses a hand-built graph topology inspired by Pune, Maharashtra to demonstrate graph routing, MCDA placement, and fleet dispatch without external API keys. To connect real-world geographic feeds in subsequent phases, follow these integration steps:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                <span>1. Road Network: HOT & OSM Overpass API</span>
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Extract road networks via the Humanitarian OpenStreetMap Team (HOT) Export Tool or the OpenStreetMap Overpass API using GeoJSON format. Run a topological clean step to convert intersecting ways into nodes and weighted graph segments compatible with <code>RoutingService.ts</code>.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-purple-300 flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                <span>2. Healthcare Facilities: HDX Datasets</span>
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Download WHO or Ministry of Health facility shapefiles from the Humanitarian Data Exchange (HDX). Map columns for bed count, trauma tier, and emergency oxygen supply directly to the <code>Hospital</code> and <code>CandidateSite</code> TypeScript models.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>3. Live Hazard Telemetry: GDACS & CWC</span>
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Ingest Global Disaster Alert and Coordination System (GDACS) cyclone tracks and Central Water Commission (CWC) river gauge telemetry via automated geo-RSS or REST endpoints. Inundation buffer polygons directly populate the <code>HazardZone</code> array.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
                <FileCode className="w-4 h-4" />
                <span>4. High-Performance Fast Optimizer Migration</span>
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                The current modular TypeScript implementation of Dijkstra and MCDA can be translated 1:1 to Python/NetworkX/PuLP/FastAPI for multi-million node municipal networks with minimal interface refactoring.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
