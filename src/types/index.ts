/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EmergencySeverity = 'Critical' | 'High' | 'Moderate' | 'Low';
export type EmergencyStatus = 'New' | 'Assigned' | 'En Route' | 'Reached' | 'Resolved' | 'Unreachable';
export type AmbulanceStatus = 'Available' | 'Assigned' | 'Out of Service' | 'En Route';
export type AmbulanceCapability = 'ALS' | 'BLS' | 'Critical Care' | 'Mobile Triage';
export type HospitalStatus = 'Operational' | 'Full' | 'Diverting' | 'Limited Access';
export type ResourceType = 'Field Clinic' | 'Relief Camp' | 'Mobile Medical Unit' | 'Medical Supply Depot';
export type DisasterType = 'flood' | 'cyclone' | 'heatwave' | 'custom' | 'normal';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RoadNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zone: string;
  elevationMeters: number;
  isHighGround: boolean;
}

export interface RoadSegment {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  name: string;
  distanceKm: number;
  normalTravelTimeMinutes: number;
  isBlocked: boolean;
  hazardExposure: 'None' | 'Moderate' | 'Severe' | 'Critical';
  roadCondition: 'Good' | 'Potholed' | 'Waterlogged' | 'Debris-strewn' | 'Flooded';
  floodDepthCm?: number;
  blockReason?: string;
}

export interface HazardZone {
  id: string;
  type: DisasterType;
  name: string;
  center: Coordinates;
  radiusMeters: number;
  severity: number; // 0 to 100
  description: string;
  affectedRoadIds: string[];
  affectedCandidateSiteIds: string[];
}

export interface EmergencyRequest {
  id: string;
  locationName: string;
  coordinates: Coordinates;
  nearestNodeId: string;
  category: 'Trauma' | 'Respiratory' | 'Maternal' | 'Cardiac' | 'Heatstroke' | 'Drowning/Water' | 'General';
  severity: EmergencySeverity;
  peopleCount: number;
  timeReceived: string; // ISO string
  requiredCapability: AmbulanceCapability;
  status: EmergencyStatus;
  assignedAmbulanceId?: string;
  assignedHospitalId?: string;
  notes?: string;
  waitingTimeMinutes: number;
}

export interface Ambulance {
  id: string;
  callSign: string;
  currentCoordinates: Coordinates;
  currentNodeId: string;
  status: AmbulanceStatus;
  assignedIncidentId?: string;
  capability: AmbulanceCapability;
  estimatedResponseTimeMinutes?: number;
  currentRouteNodeIds?: string[];
  lastUpdate: string;
  fuelPercent: number;
  crewName: string;
}

export interface Hospital {
  id: string;
  name: string;
  coordinates: Coordinates;
  nearestNodeId: string;
  totalBeds: number;
  availableBeds: number;
  emergencyCapacity: number; // ICU/Emergency trauma slots
  currentPatientLoad: number;
  capabilities: string[]; // e.g., 'Trauma', 'Pediatrics', 'Burn', 'ICU', 'Dialysis'
  status: HospitalStatus;
  isAccessible: boolean;
  address: string;
  phone: string;
}

export interface CandidateSite {
  id: string;
  name: string;
  coordinates: Coordinates;
  nearestNodeId: string;
  zone: string;
  supportedTypes: ResourceType[];
  safetyStatus: 'Safe' | 'Moderate Risk' | 'Unsafe';
  hazardExposure: 'None' | 'Moderate' | 'Severe' | 'Inundated';
  isAccessible: boolean;
  estimatedPopulationServed: number;
  nearbyEmergencyDemand: number; // Count of nearby pending incidents
  travelTimeToNearestHospitalMin: number;
  capacityMaxPeople: number;
  waterAndPowerAccess: boolean;
  deployedResourceId?: string;
  exclusionReason?: string;
}

export interface TemporaryResource {
  id: string;
  name: string;
  type: ResourceType;
  siteId?: string;
  status: 'Available' | 'Deployed' | 'En Route' | 'Maintenance';
  personnelCount: number;
  capacity: number; // patients or sheltered people
  currentOccupancy: number;
  suppliesEquipped: boolean;
  assignedZone?: string;
  deployedAt?: string;
}

export interface ResourceInventoryItem {
  id: string;
  name: string;
  category: 'Medical' | 'Trauma' | 'PPE' | 'Hydration' | 'Equipment';
  quantityAvailable: number;
  quantityAllocated: number;
  unit: string;
  minimumThreshold: number;
  storageDepotId: string;
  expiryDate?: string;
  replenishmentStatus: 'Adequate' | 'Low' | 'Critical Shortage';
}

export interface ReliefCamp {
  id: string;
  name: string;
  coordinates: Coordinates;
  capacity: number;
  currentOccupants: number;
  waterSupplyLitres: number;
  foodRationsDays: number;
  status: 'Active' | 'Standby' | 'Full';
}

export interface MedicalSupplyDepot {
  id: string;
  name: string;
  coordinates: Coordinates;
  nearestNodeId: string;
  storageCapacitySqM: number;
  isAccessible: boolean;
  managedBy: string;
}

export interface EvacuationDestination {
  id: string;
  name: string;
  coordinates: Coordinates;
  nearestNodeId: string;
  capacity: number;
  currentCount: number;
  isApproved: boolean;
}

export interface RouteResult {
  pathNodeIds: string[];
  pathCoordinates: Coordinates[];
  totalDistanceKm: number;
  estimatedTravelTimeMinutes: number;
  traversedSegmentIds: string[];
  isHazardAware: boolean;
  hazardSegmentsCount: number;
  isReachable: boolean;
  failureReason?: string;
}

export interface McdaWeights {
  demandCoverage: number;       // default 0.30
  vulnerabilityCoverage: number;// default 0.15
  accessibility: number;        // default 0.20
  healthcareGap: number;        // default 0.15
  logisticsSuitability: number; // default 0.10
  hazardRisk: number;           // default 0.10
}

export interface CandidateScoreBreakdown {
  siteId: string;
  siteName: string;
  rawDemandCoverage: number;
  rawVulnerabilityCoverage: number;
  rawAccessibility: number;
  rawHealthcareGap: number;
  rawLogisticsSuitability: number;
  rawHazardRisk: number;
  finalScore: number;
  isEligible: boolean;
  disqualificationReason?: string;
  explanation: string;
}

export interface DisasterScenarioState {
  currentScenario: DisasterType;
  scenarioPresetName: string;
  floodSeverity: number; // 0 to 100
  cycloneWindIntensity: number; // km/h (0 to 180)
  cycloneDirection: 'North' | 'North-East' | 'East' | 'South-East' | 'South' | 'South-West' | 'West' | 'North-West';
  heatwaveTemperatureC: number; // 30 to 48 °C
  heatwaveDurationDays: number;
  customNotes?: string;
  activeHazardZones: HazardZone[];
}

export interface HazardEvolutionStage {
  stageId: number; // 0 to 4
  timeOffsetLabel: string; // e.g., "T+00:00 (Onset)", "T+02:00 (Surge)", "T+04:00 (Peak Breach)", "T+06:00 (Peak Inundation)", "T+08:00 (Receding)"
  title: string;
  severityPercent: number;
  description: string;
  inundatedRoadIds: string[];
  unreachableNodeIds: string[];
  newIncidentTriggers?: {
    id: string;
    locationName: string;
    category: EmergencyRequest['category'];
    severity: EmergencySeverity;
    peopleCount: number;
    nearestNodeId: string;
    notes: string;
  }[];
}

export type AlertSeverity = 'Critical' | 'Warning' | 'Info';

export interface AlertNotification {
  id: string;
  time: string; // e.g. "10:35 AM"
  timestamp: number;
  alert: string; // e.g. "Flood Water Inundation", "Road Closure", "Hospital Bed Saturation"
  category: 'Air Quality' | 'Flood Breach' | 'Road Closure' | 'Power Grid' | 'Public Safety' | 'Water Supply' | 'Hospital Surge';
  location: string; // e.g. "Sinhagad Basin", "Yerawada Bridge", "North Sector"
  description: string;
  severity: AlertSeverity;
  isRead: boolean;
  targetNodeId?: string;
  targetSegmentId?: string;
  targetIncidentId?: string;
}

export interface SimulationState {
  version: number;
  scenario: DisasterScenarioState;
  roadNodes: RoadNode[];
  roadSegments: RoadSegment[];
  emergencyRequests: EmergencyRequest[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  candidateSites: CandidateSite[];
  temporaryResources: TemporaryResource[];
  inventory: ResourceInventoryItem[];
  reliefCamps: ReliefCamp[];
  depots: MedicalSupplyDepot[];
  evacuationDestinations: EvacuationDestination[];
  weights: McdaWeights;
  lastRecalculatedAt: string;
  // SaaS Evolving Condition & Alert extensions
  timelineStageIndex: number; // 0 to 4
  isPlayingTimeline: boolean;
  timelineSpeed: number; // 1, 2, 5
  emergencyModeActive: boolean;
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alerts: AlertNotification[];
  selectedDistrict: string;
}
