/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CandidateSite,
  CandidateScoreBreakdown,
  McdaWeights,
  ResourceType,
  EmergencyRequest,
  Hospital,
  TemporaryResource
} from '../types/index.ts';

export class McdaService {
  /**
   * Evaluates all candidate sites using Multi-Criteria Decision Analysis (MCDA)
   */
  public static evaluateCandidateSites(
    sites: CandidateSite[],
    resourceType: ResourceType,
    weights: McdaWeights,
    emergencies: EmergencyRequest[],
    hospitals: Hospital[]
  ): CandidateScoreBreakdown[] {
    const totalWeights =
      weights.demandCoverage +
      weights.vulnerabilityCoverage +
      weights.accessibility +
      weights.healthcareGap +
      weights.logisticsSuitability +
      weights.hazardRisk;

    // Normalized weights sum to 1.0
    const nw = {
      wDemand: weights.demandCoverage / (totalWeights || 1),
      wVuln: weights.vulnerabilityCoverage / (totalWeights || 1),
      wAccess: weights.accessibility / (totalWeights || 1),
      wGap: weights.healthcareGap / (totalWeights || 1),
      wLogistics: weights.logisticsSuitability / (totalWeights || 1),
      wHazard: weights.hazardRisk / (totalWeights || 1)
    };

    // Calculate maximum demand and population across all sites to normalize
    const maxDemand = Math.max(...sites.map(s => s.nearbyEmergencyDemand), 1);
    const maxPop = Math.max(...sites.map(s => s.estimatedPopulationServed), 1);
    const maxTravelToHosp = Math.max(...sites.map(s => s.travelTimeToNearestHospitalMin), 1);

    return sites.map(site => {
      // 1. Check CRITICAL SAFETY CONSTRAINTS first
      const isTypeSupported = site.supportedTypes.includes(resourceType);
      const isUnsafe = site.safetyStatus === 'Unsafe';
      const isInundated = site.hazardExposure === 'Inundated' || site.hazardExposure === 'Severe';
      const isInaccessible = !site.isAccessible;

      let isEligible = true;
      let disqualificationReason: string | undefined;

      if (!isTypeSupported) {
        isEligible = false;
        disqualificationReason = `Site does not support resource type '${resourceType}'.`;
      } else if (isUnsafe) {
        isEligible = false;
        disqualificationReason = site.exclusionReason || `Site marked unsafe due to structural or environmental hazards.`;
      } else if (isInundated) {
        isEligible = false;
        disqualificationReason = `Site is directly within flooded/severe hazard perimeter.`;
      } else if (isInaccessible) {
        isEligible = false;
        disqualificationReason = `Ingress and egress road segments to site are completely blocked.`;
      }

      // 2. Compute normalized criteria [0.0 - 1.0]
      // A. Demand Coverage: normalized by nearby unresolved emergencies
      const rawDemandCoverage = Math.min(1.0, site.nearbyEmergencyDemand / maxDemand);

      // B. Vulnerability Coverage: proxy by estimated population served & high-risk zones
      const rawVulnerabilityCoverage = Math.min(1.0, site.estimatedPopulationServed / maxPop);

      // C. Accessibility: high ground + road access
      let rawAccessibility = 0.5;
      if (site.isAccessible) rawAccessibility = 0.9;
      if (site.safetyStatus === 'Safe') rawAccessibility = 1.0;
      if (site.hazardExposure === 'Moderate') rawAccessibility = 0.4;
      if (!site.isAccessible) rawAccessibility = 0.0;

      // D. Healthcare Service Gap: greater if travel time to nearest hospital is large or nearby hospitals are full
      const rawHealthcareGap = Math.min(1.0, site.travelTimeToNearestHospitalMin / maxTravelToHosp);

      // E. Logistics Suitability: utilities + capacity
      let rawLogisticsSuitability = 0.4;
      if (site.waterAndPowerAccess) rawLogisticsSuitability += 0.4;
      if (site.capacityMaxPeople > 600) rawLogisticsSuitability += 0.2;
      rawLogisticsSuitability = Math.min(1.0, rawLogisticsSuitability);

      // F. Hazard Risk: 0.0 (safe) to 1.0 (extreme)
      let rawHazardRisk = 0.0;
      if (site.hazardExposure === 'Moderate') rawHazardRisk = 0.4;
      if (site.hazardExposure === 'Severe') rawHazardRisk = 0.8;
      if (site.hazardExposure === 'Inundated') rawHazardRisk = 1.0;
      if (site.safetyStatus === 'Moderate Risk') rawHazardRisk = Math.max(rawHazardRisk, 0.4);

      // Compute composite MCDA score
      let finalScore = 0;
      if (isEligible) {
        const weightedSum =
          nw.wDemand * rawDemandCoverage +
          nw.wVuln * rawVulnerabilityCoverage +
          nw.wAccess * rawAccessibility +
          nw.wGap * rawHealthcareGap +
          nw.wLogistics * rawLogisticsSuitability +
          nw.wHazard * (1.0 - rawHazardRisk);

        finalScore = Math.round(weightedSum * 100 * 10) / 10;
      } else {
        finalScore = 0; // Excluded sites have score 0 regardless of raw metrics
      }

      // Explanatory breakdown text
      let explanation = '';
      if (!isEligible) {
        explanation = `SAFETY EXCLUSION: ${disqualificationReason}`;
      } else {
        const topDriver = rawDemandCoverage > 0.7 ? 'High emergency demand concentration' :
                          rawHealthcareGap > 0.7 ? 'Severe healthcare access gap' :
                          rawAccessibility > 0.8 ? 'Excellent logistic accessibility' : 'Balanced regional coverage';
        explanation = `Score ${finalScore}/100. Primary justification: ${topDriver}. Serves est. ${site.estimatedPopulationServed.toLocaleString()} residents.`;
      }

      return {
        siteId: site.id,
        siteName: site.name,
        rawDemandCoverage: Math.round(rawDemandCoverage * 100) / 100,
        rawVulnerabilityCoverage: Math.round(rawVulnerabilityCoverage * 100) / 100,
        rawAccessibility: Math.round(rawAccessibility * 100) / 100,
        rawHealthcareGap: Math.round(rawHealthcareGap * 100) / 100,
        rawLogisticsSuitability: Math.round(rawLogisticsSuitability * 100) / 100,
        rawHazardRisk: Math.round(rawHazardRisk * 100) / 100,
        finalScore,
        isEligible,
        disqualificationReason,
        explanation
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Greedy coverage algorithm to select optimal candidate sites avoiding redundant cluster overlap
   */
  public static selectOptimalSites(
    scoredSites: CandidateScoreBreakdown[],
    allSites: CandidateSite[],
    maxResourcesAvailable: number
  ): { selectedSiteIds: string[]; uncoveredDemands: number } {
    const siteMap = new Map<string, CandidateSite>(allSites.map(s => [s.id, s]));
    const eligible = scoredSites.filter(s => s.isEligible && s.finalScore > 0);

    const selectedSiteIds: string[] = [];
    const coveredZones = new Set<string>();

    // 1. Pick highest scoring sites, prioritizing diverse spatial zones
    for (const scored of eligible) {
      if (selectedSiteIds.length >= maxResourcesAvailable) break;

      const site = siteMap.get(scored.siteId);
      if (!site) continue;

      // Prefer non-overlapping zones first
      if (!coveredZones.has(site.zone)) {
        selectedSiteIds.push(site.id);
        coveredZones.add(site.zone);
      }
    }

    // 2. If slots still remain, fill with next best eligible sites
    for (const scored of eligible) {
      if (selectedSiteIds.length >= maxResourcesAvailable) break;
      if (!selectedSiteIds.includes(scored.siteId)) {
        selectedSiteIds.push(scored.siteId);
      }
    }

    // Estimate unserved demand
    const coveredDemandSum = selectedSiteIds.reduce((sum, id) => {
      const site = siteMap.get(id);
      return sum + (site ? site.nearbyEmergencyDemand : 0);
    }, 0);

    const totalDemand = allSites.reduce((sum, s) => sum + s.nearbyEmergencyDemand, 0);
    const uncoveredDemands = Math.max(0, totalDemand - coveredDemandSum);

    return { selectedSiteIds, uncoveredDemands };
  }
}
