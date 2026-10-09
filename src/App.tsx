/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SimulationState, RouteResult, EmergencyRequest, CandidateSite, Hospital, Ambulance } from './types/index.ts';
import { StorageService } from './services/storageService.ts';
import { RoutingService } from './services/routingService.ts';
import { ScenarioService } from './services/scenarioService.ts';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { AIAssistantModal } from './components/AIAssistantModal.tsx';

// Views
import { CommandCenterView } from './components/views/CommandCenterView.tsx';
import { ScenariosView } from './components/views/ScenariosView.tsx';
import { EmergenciesView } from './components/views/EmergenciesView.tsx';
import { AmbulanceFleetView } from './components/views/AmbulanceFleetView.tsx';
import { RoutingView } from './components/views/RoutingView.tsx';
import { HospitalsView } from './components/views/HospitalsView.tsx';
import { TemporaryResourcesView } from './components/views/TemporaryResourcesView.tsx';
import { AnalyticsView } from './components/views/AnalyticsView.tsx';
import { SettingsView } from './components/views/SettingsView.tsx';

export default function App() {
  const [state, setState] = useState<SimulationState>(() => StorageService.loadState());
  const [activeView, setActiveView] = useState<string>('command-center');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  // Active Map Route display
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [alternativeRoute, setAlternativeRoute] = useState<RouteResult | null>(null);

  // Auto-persist state changes
  useEffect(() => {
    StorageService.saveState(state);
  }, [state]);

  // Recalculate whole response plan (routes, placements, dispatches)
  const handleRecalculatePlan = () => {
    const next = JSON.parse(JSON.stringify(state)) as SimulationState;
    next.lastRecalculatedAt = new Date().toISOString();

    // If an active route was selected, recalculate it with latest road conditions
    if (activeRoute && activeRoute.pathNodeIds.length >= 2) {
      const from = activeRoute.pathNodeIds[0];
      const to = activeRoute.pathNodeIds[activeRoute.pathNodeIds.length - 1];
      const { primaryRoute, alternativeRoute: alt } = RoutingService.calculateRouteWithAlternative(
        from,
        to,
        next.roadNodes,
        next.roadSegments
      );
      setActiveRoute(primaryRoute);
      setAlternativeRoute(alt);
    }

    setState(next);
  };

  // Reset simulation to seed defaults
  const handleResetSimulation = () => {
    if (window.confirm('Reset all disaster parameters, road closures, and fleet assignments to initial defaults?')) {
      const freshState = StorageService.resetState();
      setState(freshState);
      setActiveRoute(null);
      setAlternativeRoute(null);
    }
  };

  // Road segment toggle (from map or list)
  const handleToggleRoadBlock = (segmentId: string) => {
    const updatedSegments = ScenarioService.toggleRoadSegmentBlocked(state.roadSegments, segmentId);
    const next = { ...state, roadSegments: updatedSegments };
    setState(next);

    // Recalculate route if active route uses this segment
    if (activeRoute && activeRoute.traversedSegmentIds.includes(segmentId)) {
      const from = activeRoute.pathNodeIds[0];
      const to = activeRoute.pathNodeIds[activeRoute.pathNodeIds.length - 1];
      const { primaryRoute, alternativeRoute: alt } = RoutingService.calculateRouteWithAlternative(
        from,
        to,
        next.roadNodes,
        updatedSegments
      );
      setActiveRoute(primaryRoute);
      setAlternativeRoute(alt);
    }
  };

  // Select incident for map routing preview
  const handleSelectIncident = (inc: EmergencyRequest) => {
    // Find nearest available ambulance
    const availableAmbs = state.ambulances.filter(a => a.status === 'Available');
    const startNode = availableAmbs.length > 0 ? availableAmbs[0].currentNodeId : 'N1';

    const { primaryRoute, alternativeRoute: alt } = RoutingService.calculateRouteWithAlternative(
      startNode,
      inc.nearestNodeId,
      state.roadNodes,
      state.roadSegments
    );

    setActiveRoute(primaryRoute);
    setAlternativeRoute(alt);
    setActiveView('command-center');
  };

  // Select hospital for map route
  const handleSelectHospital = (hosp: Hospital) => {
    const { primaryRoute, alternativeRoute: alt } = RoutingService.calculateRouteWithAlternative(
      'N1',
      hosp.nearestNodeId,
      state.roadNodes,
      state.roadSegments
    );
    setActiveRoute(primaryRoute);
    setAlternativeRoute(alt);
    setActiveView('command-center');
  };

  // Select candidate site
  const handleSelectSite = (site: CandidateSite) => {
    const { primaryRoute, alternativeRoute: alt } = RoutingService.calculateRouteWithAlternative(
      'N1',
      site.nearestNodeId,
      state.roadNodes,
      state.roadSegments
    );
    setActiveRoute(primaryRoute);
    setAlternativeRoute(alt);
  };

  // Select ambulance
  const handleSelectAmbulance = (amb: Ambulance) => {
    if (amb.assignedIncidentId) {
      const inc = state.emergencyRequests.find(i => i.id === amb.assignedIncidentId);
      if (inc) {
        const { primaryRoute, alternativeRoute: alt } = RoutingService.calculateRouteWithAlternative(
          amb.currentNodeId,
          inc.nearestNodeId,
          state.roadNodes,
          state.roadSegments
        );
        setActiveRoute(primaryRoute);
        setAlternativeRoute(alt);
      }
    }
  };

  // Apply scenario preset
  const handleApplyPreset = (presetId: string) => {
    const next = ScenarioService.applyPreset(presetId, state);
    setState(next);
    handleRecalculatePlan();
  };

  // Badge counts
  const badgeCounts = {
    emergencies: state.emergencyRequests.filter(e => e.status !== 'Resolved').length,
    critical: state.emergencyRequests.filter(e => e.severity === 'Critical' && e.status !== 'Resolved').length,
    ambulances: state.ambulances.filter(a => a.status === 'Available').length,
    blockedRoads: state.roadSegments.filter(s => s.isBlocked).length,
    uncoveredSites: state.candidateSites.filter(s => s.safetyStatus === 'Unsafe').length
  };

  const unreadAlertsCount = state.alerts ? state.alerts.filter(a => !a.isRead).length : 0;

  const handleToggleEmergencyMode = () => {
    setState(prev => {
      const newMode = !prev.emergencyModeActive;
      const alertTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newAlert = {
        id: `MODE-${Date.now()}`,
        time: alertTimeStr,
        timestamp: Date.now(),
        alert: newMode ? 'Emergency Mode Activated' : 'Normal Operations Resumed',
        category: 'Public Safety' as const,
        location: 'All Municipal Sectors',
        description: newMode
          ? 'Emergency Mode triggered by Commander. All ambulance routes prioritized; field clinic staff mobilized.'
          : 'Emergency status lowered to normal monitoring advisory.',
        severity: (newMode ? 'Critical' : 'Info') as any,
        isRead: false
      };
      return {
        ...prev,
        emergencyModeActive: newMode,
        overallRiskLevel: newMode ? 'CRITICAL' : 'LOW',
        alerts: [newAlert, ...(prev.alerts || [])]
      };
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070b12] font-sans text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
      {/* Top Persistent Status Bar */}
      <Navbar
        state={state}
        onResetSimulation={handleResetSimulation}
        onRecalculatePlan={handleRecalculatePlan}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onToggleEmergencyMode={handleToggleEmergencyMode}
        onOpenAlerts={() => setActiveView('command-center')}
        unreadAlertsCount={unreadAlertsCount}
        activeView={activeView}
        onNavigate={setActiveView}
      />

      {/* Main Layout Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Navigation Sidebar */}
        <Sidebar
          activeView={activeView}
          onNavigate={setActiveView}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          badgeCounts={badgeCounts}
        />

        {/* Dynamic Section View */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-[#070b12]">
          {activeView === 'command-center' && (
            <CommandCenterView
              state={state}
              onNavigate={setActiveView}
              onSelectIncident={handleSelectIncident}
              onSelectSite={handleSelectSite}
              onSelectHospital={handleSelectHospital}
              onSelectAmbulance={handleSelectAmbulance}
              onToggleRoadBlock={handleToggleRoadBlock}
              onApplyPreset={handleApplyPreset}
              onRecalculate={handleRecalculatePlan}
              onReset={handleResetSimulation}
              onUpdateState={setState}
              activeRoute={activeRoute}
              alternativeRoute={alternativeRoute}
            />
          )}

          {activeView === 'scenarios' && (
            <ScenariosView
              state={state}
              onUpdateState={setState}
              onRecalculatePlan={handleRecalculatePlan}
            />
          )}

          {activeView === 'emergencies' && (
            <EmergenciesView
              state={state}
              onUpdateState={setState}
              onSelectIncidentForRouting={handleSelectIncident}
            />
          )}

          {activeView === 'fleet' && (
            <AmbulanceFleetView
              state={state}
              onUpdateState={setState}
              onInspectRoute={handleSelectAmbulance}
            />
          )}

          {activeView === 'routing' && (
            <RoutingView
              state={state}
              onUpdateState={setState}
              onSetMapRoute={(pri, alt) => {
                setActiveRoute(pri);
                setAlternativeRoute(alt);
                setActiveView('command-center');
              }}
            />
          )}

          {activeView === 'hospitals' && (
            <HospitalsView
              state={state}
              onUpdateState={setState}
              onSelectHospitalForRouting={handleSelectHospital}
            />
          )}

          {activeView === 'temporary-resources' && (
            <TemporaryResourcesView
              state={state}
              onUpdateState={setState}
              onSelectSiteOnMap={handleSelectSite}
            />
          )}

          {activeView === 'analytics' && <AnalyticsView state={state} />}

          {activeView === 'settings' && (
            <SettingsView
              state={state}
              onResetSimulation={handleResetSimulation}
              onUpdateState={setState}
            />
          )}
        </main>
      </div>

      {/* Emergency Planning Assistant (AI / Rule-based) Modal */}
      <AIAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        state={state}
      />
    </div>
  );
}
