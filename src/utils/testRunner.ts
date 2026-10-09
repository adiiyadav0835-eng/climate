/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RoutingService } from '../services/routingService.ts';
import { McdaService } from '../services/mcdaService.ts';
import { HospitalService } from '../services/hospitalService.ts';
import { AmbulanceService } from '../services/ambulanceService.ts';
import { InventoryService } from '../services/inventoryService.ts';
import { ScenarioService } from '../services/scenarioService.ts';
import { INITIAL_SIMULATION_STATE, DEFAULT_MCDA_WEIGHTS } from '../data/seedData.ts';
import { EmergencyRequest, Hospital, CandidateSite } from '../types/index.ts';

export interface TestResultItem {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  details: string;
}

export class TestRunner {
  /**
   * Executes all acceptance tests deterministically and reports results
   */
  public static runAllTests(): TestResultItem[] {
    const results: TestResultItem[] = [];

    // TEST 1: Seed Data Verification
    try {
      const state = JSON.parse(JSON.stringify(INITIAL_SIMULATION_STATE));
      const hasNodes = state.roadNodes.length >= 20;
      const hasSegments = state.roadSegments.length >= 30;
      const hasAmbulances = state.ambulances.length === 8;
      const hasHospitals = state.hospitals.length === 5;
      const passed = hasNodes && hasSegments && hasAmbulances && hasHospitals;

      results.push({
        id: 'TEST-1',
        name: 'Seed Data & Graph Integrity',
        description: 'Verify 20+ nodes, 30+ segments, 8 ambulances, 5 hospitals exist with valid properties',
        passed,
        details: passed
          ? `Verified: ${state.roadNodes.length} nodes, ${state.roadSegments.length} segments, ${state.ambulances.length} ambulances, ${state.hospitals.length} hospitals.`
          : `Failed: Incomplete seed dataset.`
      });
    } catch (err: any) {
      results.push({ id: 'TEST-1', name: 'Seed Data Integrity', description: 'Seed load', passed: false, details: err.message });
    }

    // TEST 2: Flood Simulation & Automatic Road Closures
    try {
      const state = JSON.parse(JSON.stringify(INITIAL_SIMULATION_STATE));
      const floodedState = ScenarioService.applyPreset('preset-moderate-flood', state);
      const s14 = floodedState.roadSegments.find((s: any) => s.id === 'S14');
      const s5 = floodedState.roadSegments.find((s: any) => s.id === 'S5');
      const site06 = floodedState.candidateSites.find((s: any) => s.id === 'SITE-06');

      const passed = !!s14?.isBlocked && !!s5?.isBlocked && site06?.safetyStatus === 'Unsafe';

      results.push({
        id: 'TEST-2',
        name: 'Flood Simulation Closures',
        description: 'Activate moderate flood: S14 and S5 become blocked, low-lying candidate sites marked unsafe',
        passed,
        details: passed
          ? `S14 blocked (${s14?.floodDepthCm}cm), S5 blocked (${s5?.floodDepthCm}cm), SITE-06 marked Unsafe.`
          : `Failed: Roads or sites did not reflect flood state properly.`
      });
    } catch (err: any) {
      results.push({ id: 'TEST-2', name: 'Flood Simulation', description: 'Flood preset', passed: false, details: err.message });
    }

    // TEST 3: Dijkstra Alternative Routing around Blocked Roads
    try {
      const state = JSON.parse(JSON.stringify(INITIAL_SIMULATION_STATE));
      // Route between N1 (Shivajinagar) and N8 (Yerawada)
      // When S5 (Bund Garden - Yerawada) is blocked, route must divert through N14 -> N22 -> N8
      const segmentsWithS5Blocked = state.roadSegments.map((s: any) =>
        s.id === 'S5' ? { ...s, isBlocked: true } : s
      );

      const routeBlocked = RoutingService.calculateRoute('N1', 'N8', state.roadNodes, segmentsWithS5Blocked);
      const passed = routeBlocked.isReachable && !routeBlocked.traversedSegmentIds.includes('S5');

      results.push({
        id: 'TEST-3',
        name: 'Dijkstra Hazard-Aware Rerouting',
        description: 'When primary bridge S5 is blocked, calculate valid detour avoiding S5',
        passed,
        details: passed
          ? `Successfully rerouted via alternative path: ${routeBlocked.pathNodeIds.join(' -> ')} (Time: ${routeBlocked.estimatedTravelTimeMinutes} min, Distance: ${routeBlocked.totalDistanceKm} km).`
          : `Failed to reroute around blocked bridge.`
      });
    } catch (err: any) {
      results.push({ id: 'TEST-3', name: 'Dijkstra Rerouting', description: 'Routing test', passed: false, details: err.message });
    }

    // TEST 4: Hospital Capacity Zero Exclusion
    try {
      const state = JSON.parse(JSON.stringify(INITIAL_SIMULATION_STATE));
      const testIncident: EmergencyRequest = state.emergencyRequests[0];

      // Set Hosp-1 available beds to 0
      const hospitalsModified: Hospital[] = state.hospitals.map((h: any) =>
        h.id === 'HOSP-1' ? { ...h, availableBeds: 0, currentPatientLoad: h.totalBeds } : h
      );

      const ranking = HospitalService.rankHospitalsForIncident(
        testIncident,
        hospitalsModified,
        state.roadNodes,
        state.roadSegments
      );

      const hosp1Rec = ranking.recommendations.find(r => r.hospitalId === 'HOSP-1');
      const passed = hosp1Rec !== undefined && hosp1Rec.isEligible === false && ranking.selectedHospital?.hospitalId !== 'HOSP-1';

      results.push({
        id: 'TEST-4',
        name: 'Hospital Zero Capacity Exclusion',
        description: 'Hospital with 0 available beds must be excluded from selection, with explanation',
        passed,
        details: passed
          ? `HOSP-1 correctly disqualified: "${hosp1Rec?.rejectionReason}". Fallback selected: ${ranking.selectedHospital?.hospitalName}.`
          : `Failed: Zero bed hospital was not excluded.`
      });
    } catch (err: any) {
      results.push({ id: 'TEST-4', name: 'Hospital Exclusion', description: 'Hospital test', passed: false, details: err.message });
    }

    // TEST 5: Ambulance Single-Assignment Constraint
    try {
      const state = JSON.parse(JSON.stringify(INITIAL_SIMULATION_STATE));
      const { dispatches, unservedIncidents } = AmbulanceService.computeOptimalDispatches(
        state.emergencyRequests,
        state.ambulances,
        state.roadNodes,
        state.roadSegments
      );

      // Check no ambulance is assigned more than once
      const assignedIds = dispatches.map(d => d.ambulanceId);
      const uniqueAssigned = new Set(assignedIds);
      const noDoubleAssignment = assignedIds.length === uniqueAssigned.size;
      const passed = noDoubleAssignment && dispatches.length > 0;

      results.push({
        id: 'TEST-5',
        name: 'Ambulance Single-Assignment Constraint',
        description: 'Verify no vehicle is assigned to multiple concurrent incidents',
        passed,
        details: passed
          ? `Dispatched ${dispatches.length} unique ambulances without double booking. Remaining unserved: ${unservedIncidents.length}.`
          : `Failed: Duplicate ambulance assignments detected.`
      });
    } catch (err: any) {
      results.push({ id: 'TEST-5', name: 'Ambulance Constraint', description: 'Dispatch test', passed: false, details: err.message });
    }

    // TEST 6: MCDA Safety Constraint (Unsafe Sites Excluded Regardless of Score)
    try {
      const state = JSON.parse(JSON.stringify(INITIAL_SIMULATION_STATE));
      // Give SITE-06 massive demand (e.g. 50), but mark it Unsafe
      const sitesModified: CandidateSite[] = state.candidateSites.map((s: any) =>
        s.id === 'SITE-06'
          ? { ...s, nearbyEmergencyDemand: 50, safetyStatus: 'Unsafe', hazardExposure: 'Inundated', isAccessible: false, exclusionReason: 'Inundated' }
          : s
      );

      const evaluations = McdaService.evaluateCandidateSites(
        sitesModified,
        'Field Clinic',
        DEFAULT_MCDA_WEIGHTS,
        state.emergencyRequests,
        state.hospitals
      );

      const site06Eval = evaluations.find(e => e.siteId === 'SITE-06');
      const passed = site06Eval !== undefined && site06Eval.isEligible === false && site06Eval.finalScore === 0;

      results.push({
        id: 'TEST-6',
        name: 'MCDA Critical Safety Exclusion',
        description: 'Candidate site marked Unsafe/Inundated must be disqualified with score 0 regardless of high demand',
        passed,
        details: passed
          ? `SITE-06 disqualified with score 0. Exclusion reason: "${site06Eval?.disqualificationReason}".`
          : `Failed: Unsafe site was not disqualified.`
      });
    } catch (err: any) {
      results.push({ id: 'TEST-6', name: 'MCDA Safety Constraint', description: 'MCDA test', passed: false, details: err.message });
    }

    // TEST 7: Resource Scarcity & Uncovered Demands
    try {
      const state = JSON.parse(JSON.stringify(INITIAL_SIMULATION_STATE));
      const evaluations = McdaService.evaluateCandidateSites(
        state.candidateSites,
        'Field Clinic',
        DEFAULT_MCDA_WEIGHTS,
        state.emergencyRequests,
        state.hospitals
      );

      // Select optimal with only 1 resource
      const { selectedSiteIds, uncoveredDemands } = McdaService.selectOptimalSites(
        evaluations,
        state.candidateSites,
        1
      );

      const passed = selectedSiteIds.length === 1 && uncoveredDemands > 0;

      results.push({
        id: 'TEST-7',
        name: 'Resource Scarcity & Coverage Gap',
        description: 'With only 1 clinic available, select top site and accurately expose uncovered demand',
        passed,
        details: passed
          ? `Allocated 1 site (${selectedSiteIds[0]}). Uncovered demand exposed: ${uncoveredDemands} pending requests.`
          : `Failed to expose uncovered demand.`
      });
    } catch (err: any) {
      results.push({ id: 'TEST-7', name: 'Resource Scarcity', description: 'Scarcity test', passed: false, details: err.message });
    }

    // TEST 8: Inventory Allocation & Prevention of Over-allocation
    try {
      const state = JSON.parse(JSON.stringify(INITIAL_SIMULATION_STATE));
      const item = state.inventory[0]; // quantityAvailable: 420

      // 1. Valid allocation
      const step1 = InventoryService.allocateItem(state.inventory, item.id, 50);
      const newAvail = step1.updatedItems.find(i => i.id === item.id)?.quantityAvailable;

      // 2. Over-allocation attempt (try allocating 1000)
      const step2 = InventoryService.allocateItem(step1.updatedItems, item.id, 1000);

      const passed = step1.success && newAvail === 370 && !step2.success;

      results.push({
        id: 'TEST-8',
        name: 'Inventory Allocation & Over-Allocation Guard',
        description: 'Deduct stock correctly upon allocation and strictly prevent over-allocation beyond available stock',
        passed,
        details: passed
          ? `Allocated 50 units (stock decreased from 420 to 370). Over-allocation of 1000 units rejected: "${step2.message}".`
          : `Failed inventory validation.`
      });
    } catch (err: any) {
      results.push({ id: 'TEST-8', name: 'Inventory Allocation', description: 'Inventory test', passed: false, details: err.message });
    }

    return results;
  }
}
