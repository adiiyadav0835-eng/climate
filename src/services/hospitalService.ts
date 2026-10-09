/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hospital, RoadNode, RoadSegment, RouteResult, EmergencyRequest } from '../types/index.ts';
import { RoutingService } from './routingService.ts';

export interface HospitalRecommendation {
  hospitalId: string;
  hospitalName: string;
  isEligible: boolean;
  score: number;
  availableBeds: number;
  totalBeds: number;
  occupancyPercent: number;
  routeResult: RouteResult;
  capabilityMatches: string[];
  rejectionReason?: string;
  recommendationExplanation: string;
}

export class HospitalService {
  /**
   * Evaluates and ranks hospitals for a given emergency incident
   */
  public static rankHospitalsForIncident(
    incident: EmergencyRequest,
    hospitals: Hospital[],
    nodes: RoadNode[],
    segments: RoadSegment[]
  ): {
    recommendations: HospitalRecommendation[];
    selectedHospital: HospitalRecommendation | null;
    noHospitalWarning?: string;
  } {
    const results: HospitalRecommendation[] = [];

    for (const hosp of hospitals) {
      // 1. Check basic eligibility criteria
      const hasBeds = hosp.availableBeds > 0;
      const isOperational = hosp.status === 'Operational' || hosp.status === 'Limited Access';
      const isPhysicallyAccessible = hosp.isAccessible;

      // 2. Check route accessibility
      const route = RoutingService.calculateRoute(
        incident.nearestNodeId,
        hosp.nearestNodeId,
        nodes,
        segments,
        { hazardAware: true }
      );

      let isEligible = true;
      let rejectionReason: string | undefined;

      if (!hasBeds) {
        isEligible = false;
        rejectionReason = `Hospital at 100% capacity (${hosp.currentPatientLoad}/${hosp.totalBeds} beds occupied). No available admission slots.`;
      } else if (!isOperational) {
        isEligible = false;
        rejectionReason = `Hospital status is '${hosp.status}'. Admissions currently suspended.`;
      } else if (!isPhysicallyAccessible) {
        isEligible = false;
        rejectionReason = `Facility compound is marked inaccessible due to severe localized flooding.`;
      } else if (!route.isReachable) {
        isEligible = false;
        rejectionReason = `No open road route from incident (${incident.nearestNodeId}) to hospital (${hosp.nearestNodeId}). All corridors blocked.`;
      }

      // Check capabilities
      const matches: string[] = [];
      if (incident.category === 'Trauma' && hosp.capabilities.some(c => c.includes('Trauma'))) {
        matches.push('Trauma Center');
      }
      if (incident.category === 'Cardiac' && hosp.capabilities.some(c => c.includes('Cardiac') || c.includes('ICU'))) {
        matches.push('Cardiac/ICU');
      }
      if (incident.category === 'Drowning/Water' && hosp.capabilities.some(c => c.includes('ICU') || c.includes('Emergency'))) {
        matches.push('Critical Emergency/ICU');
      }
      if (incident.category === 'Heatstroke' && hosp.capabilities.some(c => c.includes('Emergency'))) {
        matches.push('Emergency Rehydration');
      }

      // Composite ranking score: lower travel time + higher available beds
      let score = 0;
      if (isEligible) {
        const timeFactor = Math.max(0, 100 - route.estimatedTravelTimeMinutes * 3);
        const bedFactor = Math.min(50, hosp.availableBeds * 1.5);
        const capabilityBonus = matches.length * 20;
        score = Math.round((timeFactor + bedFactor + capabilityBonus) * 10) / 10;
      }

      const occupancy = Math.round((hosp.currentPatientLoad / hosp.totalBeds) * 100);

      let explanation = '';
      if (!isEligible) {
        explanation = `DISQUALIFIED: ${rejectionReason}`;
      } else {
        explanation = `Ranked with score ${score}. Travel time: ${route.estimatedTravelTimeMinutes} min (${route.totalDistanceKm} km). Available beds: ${hosp.availableBeds}. Matched capabilities: ${matches.join(', ') || 'General'}.`;
      }

      results.push({
        hospitalId: hosp.id,
        hospitalName: hosp.name,
        isEligible,
        score,
        availableBeds: hosp.availableBeds,
        totalBeds: hosp.totalBeds,
        occupancyPercent: occupancy,
        routeResult: route,
        capabilityMatches: matches,
        rejectionReason,
        recommendationExplanation: explanation
      });
    }

    // Sort eligible first by score descending
    results.sort((a, b) => {
      if (a.isEligible && !b.isEligible) return -1;
      if (!a.isEligible && b.isEligible) return 1;
      return b.score - a.score;
    });

    const selectedHospital = results.find(r => r.isEligible) || null;
    let noHospitalWarning: string | undefined;

    if (!selectedHospital) {
      noHospitalWarning = `CRITICAL ALERT: No eligible hospital found for incident ${incident.id}! All hospitals are either at capacity, unreachable, or in diversion. Human command review and inter-district triage escalation required immediately.`;
    }

    return { recommendations: results, selectedHospital, noHospitalWarning };
  }
}
