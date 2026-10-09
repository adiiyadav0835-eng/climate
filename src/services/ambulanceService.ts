/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Ambulance,
  EmergencyRequest,
  RoadNode,
  RoadSegment,
  RouteResult
} from '../types/index.ts';
import { RoutingService } from './routingService.ts';

export interface DispatchRecommendation {
  incidentId: string;
  incidentLocation: string;
  severity: string;
  ambulanceId: string;
  callSign: string;
  estimatedResponseTimeMinutes: number;
  routeResult: RouteResult;
  status: 'Ready' | 'Assigned' | 'No Route Available' | 'No Vehicle Available';
  reason: string;
}

export interface StandbyRecommendation {
  ambulanceId: string;
  callSign: string;
  currentNodeId: string;
  currentZone: string;
  recommendedNodeId: string;
  recommendedNodeName: string;
  coverageImprovementReason: string;
  travelTimeToStandbyMin: number;
}

export class AmbulanceService {
  /**
   * Prioritizes emergencies based on severity, wait time, demand count
   */
  public static prioritizeEmergencies(requests: EmergencyRequest[]): EmergencyRequest[] {
    const severityWeight: Record<string, number> = {
      Critical: 1000,
      High: 500,
      Moderate: 200,
      Low: 50
    };

    return [...requests].sort((a, b) => {
      // 1. Unresolved/New first
      if (a.status === 'Resolved' && b.status !== 'Resolved') return 1;
      if (b.status === 'Resolved' && a.status !== 'Resolved') return -1;

      // 2. Composite priority score = severity weight + (wait time * 5) + (people count * 10)
      const scoreA = (severityWeight[a.severity] || 0) + a.waitingTimeMinutes * 5 + a.peopleCount * 10;
      const scoreB = (severityWeight[b.severity] || 0) + b.waitingTimeMinutes * 5 + b.peopleCount * 10;

      return scoreB - scoreA;
    });
  }

  /**
   * Computes optimal dispatch for pending incidents using road graph routing
   */
  public static computeOptimalDispatches(
    incidents: EmergencyRequest[],
    ambulances: Ambulance[],
    nodes: RoadNode[],
    segments: RoadSegment[]
  ): {
    dispatches: DispatchRecommendation[];
    unservedIncidents: EmergencyRequest[];
  } {
    const prioritized = this.prioritizeEmergencies(
      incidents.filter(inc => inc.status === 'New' || inc.status === 'Unreachable')
    );

    // Track assigned ambulances so no ambulance is assigned to multiple incidents
    const assignedAmbulanceIds = new Set<string>(
      ambulances.filter(a => a.status === 'Assigned' || a.status === 'En Route').map(a => a.id)
    );

    const availableAmbulances = ambulances.filter(
      a => a.status === 'Available' && !assignedAmbulanceIds.has(a.id)
    );

    const dispatches: DispatchRecommendation[] = [];
    const unservedIncidents: EmergencyRequest[] = [];

    for (const incident of prioritized) {
      if (availableAmbulances.length === 0) {
        unservedIncidents.push(incident);
        continue;
      }

      // Find the best available ambulance with reachable route
      let bestAmbulance: Ambulance | null = null;
      let bestRoute: RouteResult | null = null;
      let minTravelTime = Infinity;

      for (const amb of availableAmbulances) {
        if (assignedAmbulanceIds.has(amb.id)) continue;

        // Check route from ambulance current node to incident node
        const route = RoutingService.calculateRoute(
          amb.currentNodeId,
          incident.nearestNodeId,
          nodes,
          segments,
          { hazardAware: true }
        );

        if (route.isReachable && route.estimatedTravelTimeMinutes < minTravelTime) {
          // Capability match bonus
          let capabilityPenalty = 0;
          if (incident.severity === 'Critical' && amb.capability === 'BLS') {
            capabilityPenalty = 15; // prefer ALS for critical
          }

          if (route.estimatedTravelTimeMinutes + capabilityPenalty < minTravelTime) {
            minTravelTime = route.estimatedTravelTimeMinutes + capabilityPenalty;
            bestAmbulance = amb;
            bestRoute = route;
          }
        }
      }

      if (bestAmbulance && bestRoute) {
        assignedAmbulanceIds.add(bestAmbulance.id);
        // remove from available pool for subsequent incidents
        const idx = availableAmbulances.findIndex(a => a.id === bestAmbulance!.id);
        if (idx !== -1) availableAmbulances.splice(idx, 1);

        dispatches.push({
          incidentId: incident.id,
          incidentLocation: incident.locationName,
          severity: incident.severity,
          ambulanceId: bestAmbulance.id,
          callSign: bestAmbulance.callSign,
          estimatedResponseTimeMinutes: bestRoute.estimatedTravelTimeMinutes,
          routeResult: bestRoute,
          status: 'Ready',
          reason: `Fastest safe hazard-aware response (${bestRoute.estimatedTravelTimeMinutes} min, ${bestRoute.totalDistanceKm} km)`
        });
      } else {
        unservedIncidents.push(incident);
      }
    }

    return { dispatches, unservedIncidents };
  }

  /**
   * Calculates strategic standby repositioning for idle ambulances
   */
  public static calculateStandbyRepositioning(
    ambulances: Ambulance[],
    nodes: RoadNode[],
    segments: RoadSegment[],
    incidents: EmergencyRequest[]
  ): StandbyRecommendation[] {
    const idleAmbulances = ambulances.filter(a => a.status === 'Available');
    if (idleAmbulances.length === 0) return [];

    // Count open demand near each node
    const demandPerNode = new Map<string, number>();
    for (const inc of incidents.filter(i => i.status !== 'Resolved')) {
      demandPerNode.set(inc.nearestNodeId, (demandPerNode.get(inc.nearestNodeId) || 0) + 1);
    }

    // High demand nodes or high ground nodes
    const highDemandNodes = nodes.filter(n => (demandPerNode.get(n.id) || 0) > 0 || n.isHighGround);

    const recommendations: StandbyRecommendation[] = [];

    for (const amb of idleAmbulances) {
      const currentNode = nodes.find(n => n.id === amb.currentNodeId) || nodes[0];

      // Find the best node that is safe and closer to high demand
      let bestTargetNode = currentNode;
      let maxScore = -1;
      let bestTravelTime = 0;

      for (const candidateNode of highDemandNodes) {
        if (candidateNode.id === currentNode.id) continue;

        const route = RoutingService.calculateRoute(amb.currentNodeId, candidateNode.id, nodes, segments);
        if (!route.isReachable) continue;

        const nearbyDemand = demandPerNode.get(candidateNode.id) || 0;
        const score = nearbyDemand * 10 + (candidateNode.isHighGround ? 5 : 0) - route.estimatedTravelTimeMinutes * 0.2;

        if (score > maxScore) {
          maxScore = score;
          bestTargetNode = candidateNode;
          bestTravelTime = route.estimatedTravelTimeMinutes;
        }
      }

      if (bestTargetNode.id !== currentNode.id && maxScore > 2) {
        recommendations.push({
          ambulanceId: amb.id,
          callSign: amb.callSign,
          currentNodeId: currentNode.id,
          currentZone: currentNode.zone,
          recommendedNodeId: bestTargetNode.id,
          recommendedNodeName: bestTargetNode.name,
          coverageImprovementReason: `Move to high-demand node with ${demandPerNode.get(bestTargetNode.id) || 0} active incidents & elevated safe ground`,
          travelTimeToStandbyMin: bestTravelTime
        });
      }
    }

    return recommendations;
  }
}
