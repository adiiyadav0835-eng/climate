/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SimulationState,
  DisasterType,
  HazardZone,
  RoadSegment,
  CandidateSite,
  EmergencyRequest
} from '../types/index.ts';

export interface PresetOption {
  id: string;
  type: DisasterType;
  title: string;
  description: string;
  severityLabel: string;
}

export const SCENARIO_PRESETS: PresetOption[] = [
  {
    id: 'preset-normal',
    type: 'normal',
    title: 'Baseline Normal Operations',
    description: 'Clear skies, all roads unblocked, standard emergency call volume, standard facility load.',
    severityLabel: 'Low (0%)'
  },
  {
    id: 'preset-moderate-flood',
    type: 'flood',
    title: 'Moderate River Flood Warning',
    description: 'Upstream dams release water. Mutha and Sangam lowlands inundated. 2 critical road segments waterlogged.',
    severityLabel: 'Moderate (65%)'
  },
  {
    id: 'preset-severe-flood',
    type: 'flood',
    title: 'Severe Urban Inundation (100-Year Event)',
    description: 'Catastrophic flash floods. Mutha and Mula river basins severely overflowing. 5 bridges/causeways blocked.',
    severityLabel: 'Severe (95%)'
  },
  {
    id: 'preset-cyclone',
    type: 'cyclone',
    title: 'Cyclone Kyarr Gale Warning (115 km/h)',
    description: 'Tropical cyclone outer squall band. Tree fall and structural roof collapses across eastern and southern corridors.',
    severityLabel: 'High Wind (115 km/h)'
  },
  {
    id: 'preset-heatwave',
    type: 'heatwave',
    title: 'Severe Heatwave Alert (44.5°C)',
    description: 'Extended extreme heat dome. Spike in heat exhaustion, dehydration, and pediatric respiratory distress in dense bastis.',
    severityLabel: 'Extreme Heat (44.5°C)'
  }
];

export class ScenarioService {
  /**
   * Applies a preset scenario and updates affected road segments, candidate sites, and hazards
   */
  public static applyPreset(
    presetId: string,
    currentState: SimulationState
  ): SimulationState {
    const next = JSON.parse(JSON.stringify(currentState)) as SimulationState;

    switch (presetId) {
      case 'preset-normal': {
        next.scenario.currentScenario = 'normal';
        next.scenario.scenarioPresetName = 'Baseline Normal Operations';
        next.scenario.floodSeverity = 0;
        next.scenario.cycloneWindIntensity = 15;
        next.scenario.heatwaveTemperatureC = 28;
        next.scenario.activeHazardZones = [];

        // Unblock all roads and reset conditions
        next.roadSegments = next.roadSegments.map(s => ({
          ...s,
          isBlocked: false,
          hazardExposure: 'None',
          roadCondition: 'Good',
          floodDepthCm: 0,
          blockReason: undefined
        }));

        // Reset candidate sites safety
        next.candidateSites = next.candidateSites.map(site => ({
          ...site,
          safetyStatus: 'Safe',
          hazardExposure: 'None',
          isAccessible: true,
          exclusionReason: undefined
        }));
        break;
      }

      case 'preset-moderate-flood': {
        next.scenario.currentScenario = 'flood';
        next.scenario.scenarioPresetName = 'Moderate River Flood Warning';
        next.scenario.floodSeverity = 65;
        next.scenario.cycloneWindIntensity = 35;
        next.scenario.heatwaveTemperatureC = 30;

        next.scenario.activeHazardZones = [
          {
            id: 'HAZ-FLOOD-1',
            type: 'flood',
            name: 'Mutha Riverbank Flood Zone (Khadakwasla Surge)',
            center: { lat: 18.4735, lng: 73.8275 },
            radiusMeters: 1700,
            severity: 65,
            description: 'Riverbank overspill near Sinhagad underpass and low-lying riverfront residences.',
            affectedRoadIds: ['S14', 'S15'],
            affectedCandidateSiteIds: ['SITE-06']
          },
          {
            id: 'HAZ-FLOOD-2',
            type: 'flood',
            name: 'Sangam Bund River Confluence Basin',
            center: { lat: 18.5385, lng: 73.8775 },
            radiusMeters: 1300,
            severity: 60,
            description: 'Confluence basin water level high. Causeway closed to light traffic.',
            affectedRoadIds: ['S4', 'S5'],
            affectedCandidateSiteIds: ['SITE-03']
          }
        ];

        // Apply road closures: S14 and S5 are blocked
        next.roadSegments = next.roadSegments.map(s => {
          if (s.id === 'S14') {
            return {
              ...s,
              isBlocked: true,
              hazardExposure: 'Critical',
              roadCondition: 'Flooded',
              floodDepthCm: 50,
              blockReason: 'Sinhagad Underpass completely submerged by 50cm river backwater.'
            };
          }
          if (s.id === 'S5') {
            return {
              ...s,
              isBlocked: true,
              hazardExposure: 'Critical',
              roadCondition: 'Flooded',
              floodDepthCm: 35,
              blockReason: 'Yerawada low bridge closed due to flash river currents.'
            };
          }
          if (s.id === 'S4' || s.id === 'S15') {
            return {
              ...s,
              isBlocked: false,
              hazardExposure: 'Severe',
              roadCondition: 'Waterlogged',
              floodDepthCm: 15
            };
          }
          return {
            ...s,
            isBlocked: false,
            hazardExposure: 'None',
            roadCondition: 'Good'
          };
        });

        // Sites
        next.candidateSites = next.candidateSites.map(site => {
          if (site.id === 'SITE-06') {
            return {
              ...site,
              safetyStatus: 'Unsafe',
              hazardExposure: 'Inundated',
              isAccessible: false,
              exclusionReason: 'Direct inundation from Mutha River spill. Unsafe for shelter.'
            };
          }
          if (site.id === 'SITE-03') {
            return {
              ...site,
              safetyStatus: 'Unsafe',
              hazardExposure: 'Severe',
              isAccessible: false,
              exclusionReason: 'Access bridge S5 submerged and site within flood buffer.'
            };
          }
          return {
            ...site,
            safetyStatus: 'Safe',
            hazardExposure: 'None',
            isAccessible: true,
            exclusionReason: undefined
          };
        });
        break;
      }

      case 'preset-severe-flood': {
        next.scenario.currentScenario = 'flood';
        next.scenario.scenarioPresetName = 'Severe Urban Inundation (100-Year Event)';
        next.scenario.floodSeverity = 95;
        next.scenario.cycloneWindIntensity = 45;
        next.scenario.heatwaveTemperatureC = 29;

        next.scenario.activeHazardZones = [
          {
            id: 'HAZ-FLOOD-1',
            type: 'flood',
            name: 'Sinhagad-Warje Deep Flood Corridor',
            center: { lat: 18.4735, lng: 73.8275 },
            radiusMeters: 2800,
            severity: 95,
            description: 'Major breach of river embankments. Multiple housing bastis submerged.',
            affectedRoadIds: ['S14', 'S15', 'S33'],
            affectedCandidateSiteIds: ['SITE-06']
          },
          {
            id: 'HAZ-FLOOD-2',
            type: 'flood',
            name: 'Sangam-Yerawada-Kalyani Mega Flood Basin',
            center: { lat: 18.5400, lng: 73.8800 },
            radiusMeters: 2400,
            severity: 90,
            description: 'Both Mula & Mutha floodplains inundated. Sangam bridge, Bund Garden, and Mundhwa bypass cut off.',
            affectedRoadIds: ['S3', 'S4', 'S5', 'S8', 'S32'],
            affectedCandidateSiteIds: ['SITE-03', 'SITE-01']
          }
        ];

        // Heavy road closures
        const severeBlocked = ['S14', 'S15', 'S4', 'S5', 'S8', 'S32'];
        next.roadSegments = next.roadSegments.map(s => {
          if (severeBlocked.includes(s.id)) {
            return {
              ...s,
              isBlocked: true,
              hazardExposure: 'Critical',
              roadCondition: 'Flooded',
              floodDepthCm: 70,
              blockReason: `Severe 100-year flood inundation (${s.name}). Impassable to emergency vehicles.`
            };
          }
          if (s.id === 'S3' || s.id === 'S24') {
            return {
              ...s,
              isBlocked: false,
              hazardExposure: 'Severe',
              roadCondition: 'Waterlogged',
              floodDepthCm: 25
            };
          }
          return {
            ...s,
            isBlocked: false,
            hazardExposure: 'None',
            roadCondition: 'Good'
          };
        });

        next.candidateSites = next.candidateSites.map(site => {
          if (site.id === 'SITE-06' || site.id === 'SITE-03') {
            return {
              ...site,
              safetyStatus: 'Unsafe',
              hazardExposure: 'Inundated',
              isAccessible: false,
              exclusionReason: 'Severely flooded location. Submerged under 60cm water.'
            };
          }
          if (site.id === 'SITE-01') {
            return {
              ...site,
              safetyStatus: 'Moderate Risk',
              hazardExposure: 'Moderate',
              isAccessible: true,
              exclusionReason: undefined
            };
          }
          return site;
        });

        // Boost demand in affected Bastis
        next.emergencyRequests = next.emergencyRequests.map(req => {
          if (req.category === 'Drowning/Water' || req.id === 'INC-101' || req.id === 'INC-102') {
            return {
              ...req,
              severity: 'Critical',
              peopleCount: req.peopleCount + 4,
              waitingTimeMinutes: req.waitingTimeMinutes + 20
            };
          }
          return req;
        });
        break;
      }

      case 'preset-cyclone': {
        next.scenario.currentScenario = 'cyclone';
        next.scenario.scenarioPresetName = 'Cyclone Kyarr Gale Warning (115 km/h)';
        next.scenario.floodSeverity = 25;
        next.scenario.cycloneWindIntensity = 115;
        next.scenario.cycloneDirection = 'South-West';
        next.scenario.heatwaveTemperatureC = 27;

        next.scenario.activeHazardZones = [
          {
            id: 'HAZ-CYCLONE-1',
            type: 'cyclone',
            name: 'Eastern Corridors Gale Impact Vector',
            center: { lat: 18.5150, lng: 73.9150 },
            radiusMeters: 3500,
            severity: 85,
            description: 'Extreme squall line with winds up to 115 km/h tearing down power lines and billboards across Hadapsar, KP, and Viman Nagar.',
            affectedRoadIds: ['S10', 'S11', 'S28'],
            affectedCandidateSiteIds: ['SITE-08']
          }
        ];

        // Block roads from fallen trees and wires
        next.roadSegments = next.roadSegments.map(s => {
          if (s.id === 'S11') {
            return {
              ...s,
              isBlocked: true,
              hazardExposure: 'Severe',
              roadCondition: 'Debris-strewn',
              blockReason: 'High-voltage electric poles and banyan tree fallen across Solapur highway.'
            };
          }
          if (s.id === 'S28') {
            return {
              ...s,
              isBlocked: true,
              hazardExposure: 'Severe',
              roadCondition: 'Debris-strewn',
              blockReason: 'Factory tin roofing debris blocking Telco corridor.'
            };
          }
          return {
            ...s,
            isBlocked: false,
            hazardExposure: s.id === 'S10' ? 'Moderate' : 'None',
            roadCondition: 'Good'
          };
        });

        next.candidateSites = next.candidateSites.map(site => {
          if (site.id === 'SITE-08') {
            return {
              ...site,
              safetyStatus: 'Moderate Risk',
              hazardExposure: 'Moderate',
              exclusionReason: 'Exposed open arena vulnerable to gale roof hazards.'
            };
          }
          return {
            ...site,
            safetyStatus: 'Safe',
            hazardExposure: 'None',
            isAccessible: true,
            exclusionReason: undefined
          };
        });
        break;
      }

      case 'preset-heatwave': {
        next.scenario.currentScenario = 'heatwave';
        next.scenario.scenarioPresetName = 'Severe Heatwave Alert (44.5°C)';
        next.scenario.floodSeverity = 0;
        next.scenario.cycloneWindIntensity = 10;
        next.scenario.heatwaveTemperatureC = 44.5;
        next.scenario.heatwaveDurationDays = 5;

        next.scenario.activeHazardZones = [
          {
            id: 'HAZ-HEAT-1',
            type: 'heatwave',
            name: 'Central Urban Heat Island (Swargate & Old City)',
            center: { lat: 18.5080, lng: 73.8550 },
            radiusMeters: 2500,
            severity: 90,
            description: 'Extreme thermal stress in high-density asphalt core. Wet-bulb temp approaching 32°C.',
            affectedRoadIds: [],
            affectedCandidateSiteIds: ['SITE-05']
          },
          {
            id: 'HAZ-HEAT-2',
            type: 'heatwave',
            name: 'Bhosari-Hadapsar Industrial Heat Zone',
            center: { lat: 18.6250, lng: 73.8480 },
            radiusMeters: 2000,
            severity: 80,
            description: 'Unshaded industrial and labor shed corridors with heat stress alerts.',
            affectedRoadIds: [],
            affectedCandidateSiteIds: []
          }
        ];

        // Roads are physically open but asphalt is hot
        next.roadSegments = next.roadSegments.map(s => ({
          ...s,
          isBlocked: false,
          hazardExposure: 'None',
          roadCondition: 'Good',
          floodDepthCm: 0,
          blockReason: undefined
        }));

        // Candidate sites: Swargate Nehru complex and Kothrud auditorium have AC/shade
        next.candidateSites = next.candidateSites.map(site => ({
          ...site,
          safetyStatus: 'Safe',
          hazardExposure: 'None',
          isAccessible: true,
          exclusionReason: undefined
        }));

        // Elevate heatstroke and dehydration incidents
        next.emergencyRequests = next.emergencyRequests.map(req => {
          if (req.category === 'Heatstroke' || req.id === 'INC-110') {
            return {
              ...req,
              severity: 'Critical',
              peopleCount: 8,
              waitingTimeMinutes: 45,
              notes: 'Mass heat exhaustion in unshaded tin shed labor camp. Temperature 44°C.'
            };
          }
          if (req.category === 'Cardiac') {
            return {
              ...req,
              severity: 'Critical',
              waitingTimeMinutes: req.waitingTimeMinutes + 10
            };
          }
          return req;
        });
        break;
      }
    }

    next.lastRecalculatedAt = new Date().toISOString();
    return next;
  }

  /**
   * Toggles a road segment blocked/unblocked manually
   */
  public static toggleRoadSegmentBlocked(
    segments: RoadSegment[],
    segmentId: string,
    reason?: string
  ): RoadSegment[] {
    return segments.map(seg => {
      if (seg.id === segmentId) {
        const isBlocked = !seg.isBlocked;
        return {
          ...seg,
          isBlocked,
          blockReason: isBlocked ? (reason || 'Emergency dispatch commander closed road due to hazard.') : undefined,
          roadCondition: isBlocked ? 'Waterlogged' : 'Good'
        };
      }
      return seg;
    });
  }

  /**
   * Adjusts flood severity dynamically with a slider
   */
  public static updateFloodSeverity(
    currentState: SimulationState,
    severity: number
  ): SimulationState {
    const next = JSON.parse(JSON.stringify(currentState)) as SimulationState;
    next.scenario.floodSeverity = severity;

    // If severity > 70, automatically block S14, S5
    // If severity > 85, block S15, S4, S32
    const shouldBlockS14 = severity >= 50;
    const shouldBlockS5 = severity >= 60;
    const shouldBlockS15 = severity >= 75;
    const shouldBlockS32 = severity >= 85;

    next.roadSegments = next.roadSegments.map(s => {
      if (s.id === 'S14') {
        return {
          ...s,
          isBlocked: shouldBlockS14,
          hazardExposure: severity > 60 ? 'Critical' : severity > 30 ? 'Moderate' : 'None',
          roadCondition: shouldBlockS14 ? 'Flooded' : 'Good',
          floodDepthCm: Math.round(severity * 0.7),
          blockReason: shouldBlockS14 ? `Water level ${Math.round(severity * 0.7)}cm exceeding vehicle intake limit.` : undefined
        };
      }
      if (s.id === 'S5') {
        return {
          ...s,
          isBlocked: shouldBlockS5,
          hazardExposure: severity > 50 ? 'Critical' : 'Moderate',
          roadCondition: shouldBlockS5 ? 'Flooded' : 'Good',
          floodDepthCm: Math.round(severity * 0.5),
          blockReason: shouldBlockS5 ? `Bridge causeway submerged (${Math.round(severity * 0.5)}cm).` : undefined
        };
      }
      if (s.id === 'S15') {
        return {
          ...s,
          isBlocked: shouldBlockS15,
          hazardExposure: severity > 70 ? 'Severe' : 'Moderate',
          roadCondition: shouldBlockS15 ? 'Waterlogged' : 'Good',
          floodDepthCm: Math.round(severity * 0.4),
          blockReason: shouldBlockS15 ? 'Riverbank flood spill' : undefined
        };
      }
      if (s.id === 'S32') {
        return {
          ...s,
          isBlocked: shouldBlockS32,
          hazardExposure: severity > 80 ? 'Critical' : 'Moderate',
          roadCondition: shouldBlockS32 ? 'Flooded' : 'Good',
          floodDepthCm: Math.round(severity * 0.45),
          blockReason: shouldBlockS32 ? 'Mundhwa canal overflow' : undefined
        };
      }
      return s;
    });

    // Update candidate site exclusion
    next.candidateSites = next.candidateSites.map(site => {
      if (site.id === 'SITE-06') {
        const isUnsafe = severity >= 40;
        return {
          ...site,
          safetyStatus: isUnsafe ? 'Unsafe' : 'Safe',
          hazardExposure: isUnsafe ? 'Inundated' : 'None',
          isAccessible: !isUnsafe,
          exclusionReason: isUnsafe ? 'Site adjacent to river embankment. Flooding predicted.' : undefined
        };
      }
      if (site.id === 'SITE-03') {
        const isUnsafe = severity >= 50;
        return {
          ...site,
          safetyStatus: isUnsafe ? 'Unsafe' : 'Safe',
          hazardExposure: isUnsafe ? 'Severe' : 'None',
          isAccessible: !isUnsafe,
          exclusionReason: isUnsafe ? 'Sangam lowlands under water warning.' : undefined
        };
      }
      return site;
    });

    next.lastRecalculatedAt = new Date().toISOString();
    return next;
  }

  /**
   * Advances or jumps to a specific evolving hazard condition stage (T+00:00 to T+08:00)
   */
  public static applyTimelineStage(
    stageIndex: number,
    currentState: SimulationState,
    evolutionStages: any[]
  ): SimulationState {
    const next = JSON.parse(JSON.stringify(currentState)) as SimulationState;
    const clampedIndex = Math.max(0, Math.min(evolutionStages.length - 1, stageIndex));
    const targetStage = evolutionStages[clampedIndex];

    next.timelineStageIndex = clampedIndex;
    next.scenario.floodSeverity = targetStage.severityPercent;

    // Set overall risk level
    if (clampedIndex === 0) next.overallRiskLevel = 'LOW';
    else if (clampedIndex === 1) next.overallRiskLevel = 'MEDIUM';
    else if (clampedIndex === 2) next.overallRiskLevel = 'HIGH';
    else if (clampedIndex === 3) next.overallRiskLevel = 'CRITICAL';
    else next.overallRiskLevel = 'HIGH';

    // Update road segments
    const inundatedSet = new Set<string>(targetStage.inundatedRoadIds);
    next.roadSegments = next.roadSegments.map(s => {
      const isNowBlocked = inundatedSet.has(s.id);
      return {
        ...s,
        isBlocked: isNowBlocked,
        hazardExposure: isNowBlocked ? (clampedIndex >= 3 ? 'Critical' : 'Severe') : 'None',
        roadCondition: isNowBlocked ? 'Flooded' : 'Good',
        floodDepthCm: isNowBlocked ? Math.min(80, 20 + clampedIndex * 15) : 0,
        blockReason: isNowBlocked ? `Surge inundation at ${targetStage.timeOffsetLabel}: ${targetStage.title}` : undefined
      };
    });

    // Update candidate site safety
    next.candidateSites = next.candidateSites.map(site => {
      if (site.id === 'SITE-06') {
        const isUnsafe = clampedIndex >= 1;
        return {
          ...site,
          safetyStatus: isUnsafe ? 'Unsafe' : 'Safe',
          hazardExposure: isUnsafe ? 'Inundated' : 'None',
          isAccessible: !isUnsafe,
          exclusionReason: isUnsafe ? `Riverbank flood crest at ${targetStage.timeOffsetLabel}.` : undefined
        };
      }
      if (site.id === 'SITE-03') {
        const isUnsafe = clampedIndex >= 2;
        return {
          ...site,
          safetyStatus: isUnsafe ? 'Unsafe' : 'Safe',
          hazardExposure: isUnsafe ? 'Severe' : 'None',
          isAccessible: !isUnsafe,
          exclusionReason: isUnsafe ? `Confluence overflow at ${targetStage.timeOffsetLabel}.` : undefined
        };
      }
      return site;
    });

    // Emit live alert into alerts feed
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newAlert = {
      id: `EVOLVE-${clampedIndex}-${Date.now()}`,
      time: nowTimeStr,
      timestamp: Date.now(),
      alert: `Stage Evolution: ${targetStage.title}`,
      category: 'Flood Breach' as const,
      location: clampedIndex >= 2 ? 'Mutha-Mula River Corridors' : 'Riverbank Buffer',
      description: targetStage.description,
      severity: (clampedIndex >= 3 ? 'Critical' : clampedIndex >= 1 ? 'Warning' : 'Info') as any,
      isRead: false
    };

    next.alerts = [newAlert, ...next.alerts.slice(0, 19)]; // keep latest 20 alerts
    next.lastRecalculatedAt = new Date().toISOString();
    return next;
  }
}
