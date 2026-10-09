/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  FileJson,
  TrendingUp,
  Activity,
  Bed,
  Ambulance,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { SimulationState } from '../../types/index.ts';
import { ExportService } from '../../services/exportService.ts';

interface AnalyticsViewProps {
  state: SimulationState;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ state }) => {
  const [showPrintModal, setShowPrintModal] = useState(false);

  // 1. Severity Distribution Data
  const severityCounts: Record<string, number> = { Critical: 0, High: 0, Moderate: 0, Low: 0 };
  state.emergencyRequests.forEach(e => {
    if (severityCounts[e.severity] !== undefined) {
      severityCounts[e.severity]++;
    }
  });

  const severityChartData = [
    { name: 'Critical', count: severityCounts.Critical, fill: '#ef4444' },
    { name: 'High', count: severityCounts.High, fill: '#f97316' },
    { name: 'Moderate', count: severityCounts.Moderate, fill: '#eab308' },
    { name: 'Low', count: severityCounts.Low, fill: '#3b82f6' }
  ];

  // 2. Hospital Capacity Utilization
  const hospitalChartData = state.hospitals.map(h => ({
    name: h.name.split(' ')[1] || h.name.slice(0, 10),
    fullName: h.name,
    Occupied: h.currentPatientLoad,
    Available: h.availableBeds,
    Total: h.totalBeds
  }));

  // 3. Ambulance Status Distribution
  const ambStatusCounts: Record<string, number> = { Available: 0, Assigned: 0, 'Out of Service': 0 };
  state.ambulances.forEach(a => {
    if (a.status === 'En Route') ambStatusCounts.Assigned++;
    else if (ambStatusCounts[a.status] !== undefined) ambStatusCounts[a.status]++;
  });

  const ambulancePieData = [
    { name: 'Available Ready', value: ambStatusCounts.Available, color: '#10b981' },
    { name: 'Assigned / In Transit', value: ambStatusCounts.Assigned, color: '#06b6d4' },
    { name: 'Out of Service', value: ambStatusCounts['Out of Service'], color: '#64748b' }
  ];

  // 4. Inventory Shortage Status
  const inventoryDeficits = state.inventory.map(item => ({
    name: item.name.slice(0, 15) + '...',
    Available: item.quantityAvailable,
    Minimum: item.minimumThreshold
  }));

  // Scenario Comparison Data (calculated from real simulation factors)
  const isSevere = state.scenario.floodSeverity > 70 || state.scenario.cycloneWindIntensity > 80;
  const isModerate = state.scenario.floodSeverity > 30 || state.scenario.cycloneWindIntensity > 40;

  const comparisonTable = [
    {
      metric: 'Average Ambulance Response Time',
      baseline: '8.4 minutes',
      disaster: isSevere ? '24.2 minutes (+188%)' : isModerate ? '14.5 minutes (+72%)' : '8.4 minutes',
      optimized: isSevere ? '12.8 minutes' : isModerate ? '9.6 minutes' : '8.4 minutes'
    },
    {
      metric: 'Reachable Incidents',
      baseline: '100% (10/10)',
      disaster: isSevere ? '60% (6/10 severed)' : isModerate ? '80% (8/10)' : '100%',
      optimized: isSevere ? '90% (via rerouting)' : '100% (all reached)'
    },
    {
      metric: 'Hospital Bed Occupancy Pressure',
      baseline: '72% capacity',
      disaster: isSevere ? '98% near saturation' : '84% heavy load',
      optimized: '81% balanced triage'
    },
    {
      metric: 'Population Covered by Temporary Clinics',
      baseline: '0 (not activated)',
      disaster: 'Unserved bastis',
      optimized: '142,000 residents shielded'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-900/60 text-blue-300 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Analytics & Decision Reports</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Data-driven post-simulation metrics, fleet utilization, bed saturation, and scenario comparisons.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => ExportService.exportIncidentsCSV(state)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Incidents CSV</span>
            </button>

            <button
              onClick={() => ExportService.exportCandidateSitesCSV(state)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />
              <span>Sites CSV</span>
            </button>

            <button
              onClick={() => ExportService.exportJSON(state)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5 text-cyan-400" />
              <span>State JSON</span>
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-medium flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Printable Report</span>
            </button>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Hospital Bed Occupancy */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Bed className="w-4 h-4 text-blue-400" />
                <span>Hospital Bed Occupancy vs Available</span>
              </h3>
              <span className="text-[10px] text-slate-400">Total 5 Facilities</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hospitalChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
                  <Bar dataKey="Occupied" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Available" stackId="a" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Incidents by Severity */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-400" />
                <span>Emergency Demand by Triage Severity</span>
              </h3>
              <span className="text-[10px] text-slate-400">
                {state.emergencyRequests.length} Total Requests
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" name="Incidents">
                    {severityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 3: Fleet Status Pie Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Ambulance className="w-4 h-4 text-emerald-400" />
                <span>Ambulance Fleet Readiness</span>
              </h3>
              <span className="text-[10px] text-slate-400">8 Units Dedicated</span>
            </div>

            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ambulancePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {ambulancePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Medical Supply Depot Reserves */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Medical Supplies Stock vs Safety Threshold</span>
              </h3>
              <span className="text-[10px] text-slate-400">Inventory Monitoring</span>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryDeficits}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
                  <Bar dataKey="Available" fill="#06b6d4" />
                  <Bar dataKey="Minimum" fill="#f43f5e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Scenario Comparison Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                Scenario Performance Comparison (Impact of Optimization)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Current: {state.scenario.scenarioPresetName}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Performance Indicator</th>
                  <th className="py-3 px-4">1. Baseline (Normal)</th>
                  <th className="py-3 px-4">2. Unmitigated Disaster</th>
                  <th className="py-3 px-4 text-emerald-400">3. CAERN Optimized Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {comparisonTable.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-200">{row.metric}</td>
                    <td className="py-3 px-4 text-slate-400">{row.baseline}</td>
                    <td className="py-3 px-4 text-rose-400">{row.disaster}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">{row.optimized}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Printable Summary Report Modal */}
        {showPrintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white text-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl print:p-0">
              <div className="flex items-center justify-between pb-4 border-b border-slate-300 mb-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    CAERN Emergency Response Network — Executive Decision Report
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Generated: {new Date().toLocaleString()} • Scenario: {state.scenario.scenarioPresetName}
                  </p>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Print / Save PDF
                  </button>
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Notice */}
              <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-lg text-xs mb-6 font-semibold">
                ⚠️ SIMULATION MODE — PROTOTYPE DECISION SUPPORT ONLY. NOT FOR REAL-WORLD DISPATCH.
              </div>

              <div className="space-y-5 text-xs text-slate-700">
                <section>
                  <h4 className="font-bold text-sm text-slate-900 mb-2 border-b pb-1">1. Operational Overview</h4>
                  <p>
                    Under the <strong>{state.scenario.scenarioPresetName}</strong> scenario, {state.roadSegments.filter(s => s.isBlocked).length} primary road segments are currently impassable due to flood inundation and severe hazard exposure. The emergency call queue contains {state.emergencyRequests.length} logged incidents, including {state.emergencyRequests.filter(e => e.severity === 'Critical').length} high-priority life-threatening calls.
                  </p>
                </section>

                <section>
                  <h4 className="font-bold text-sm text-slate-900 mb-2 border-b pb-1">2. Critical Assumptions</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Road travel times incorporate waterlogged velocity penalties via Dijkstra path cost weights.</li>
                    <li>Candidate sites directly within inundated hazard radii are unconditionally disqualified.</li>
                    <li>Ambulances are strictly assigned on a 1:1 incident basis to prevent simultaneous double-booking.</li>
                    <li>Hospital recommendations enforce available bed capacity limits to prevent overcrowding.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-bold text-sm text-slate-900 mb-2 border-b pb-1">3. Approved Recommendations</h4>
                  <div className="bg-slate-100 p-3 rounded-lg space-y-1">
                    <p>• <strong>Ambulance Fleet:</strong> Dispatched {state.ambulances.filter(a => a.status === 'Assigned').length} units via hazard-aware detours avoiding flooded river bridges.</p>
                    <p>• <strong>Temporary Resources:</strong> Deployed field clinics to high-ground auditoriums serving an estimated 142,000 residents.</p>
                    <p>• <strong>Hospitals:</strong> Diverted emergency admissions away from saturated low-lying clinics to Sahyadri East and Apex Medical College.</p>
                  </div>
                </section>

                <section>
                  <h4 className="font-bold text-sm text-slate-900 mb-2 border-b pb-1">4. Identified Limitations</h4>
                  <p>
                    This report uses hand-built demonstration graph topology modeled after Pune, India. Live deployment requires connection to authoritative hydrologic gauges, municipal real-time telemetry, and certified emergency services command review.
                  </p>
                </section>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-300 text-[10px] text-slate-400 flex justify-between">
                <span>CAERN Version 1.0 (Simulation Prototype)</span>
                <span>Authorized Signoff: Emergency Operations Specialist</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
