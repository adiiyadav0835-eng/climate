/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SimulationState,
  RoadNode,
  RoadSegment,
  EmergencyRequest,
  Ambulance,
  Hospital,
  CandidateSite,
  TemporaryResource,
  ResourceInventoryItem,
  ReliefCamp,
  MedicalSupplyDepot,
  EvacuationDestination,
  HazardZone,
  McdaWeights,
  HazardEvolutionStage,
  AlertNotification
} from '../types/index.ts';

// Coordinated fictional network based loosely on Pune geographic landmarks
// Center: ~18.5204 N, 73.8567 E
export const INITIAL_ROAD_NODES: RoadNode[] = [
  { id: 'N1', name: 'Shivajinagar Junction', lat: 18.5314, lng: 73.8446, zone: 'Central', elevationMeters: 559, isHighGround: false },
  { id: 'N2', name: 'Deccan Gymkhana', lat: 18.5173, lng: 73.8415, zone: 'Central West', elevationMeters: 554, isHighGround: false },
  { id: 'N3', name: 'Swargate Hub', lat: 18.5018, lng: 73.8584, zone: 'South Central', elevationMeters: 550, isHighGround: false },
  { id: 'N4', name: 'Pune Station / Camp', lat: 18.5284, lng: 73.8744, zone: 'East Central', elevationMeters: 562, isHighGround: true },
  { id: 'N5', name: 'Hadapsar Crossroads', lat: 18.5089, lng: 73.9259, zone: 'East', elevationMeters: 568, isHighGround: true },
  { id: 'N6', name: 'Kothrud Depot', lat: 18.5074, lng: 73.8077, zone: 'West', elevationMeters: 580, isHighGround: true },
  { id: 'N7', name: 'Aundh Ravet Link', lat: 18.5580, lng: 73.8075, zone: 'North West', elevationMeters: 565, isHighGround: true },
  { id: 'N8', name: 'Yerawada Bridge Point', lat: 18.5539, lng: 73.8796, zone: 'North East', elevationMeters: 546, isHighGround: false },
  { id: 'N9', name: 'Viman Nagar Plaza', lat: 18.5679, lng: 73.9143, zone: 'North East', elevationMeters: 575, isHighGround: true },
  { id: 'N10', name: 'Katraj Ghat Entry', lat: 18.4485, lng: 73.8588, zone: 'South', elevationMeters: 620, isHighGround: true },
  { id: 'N11', name: 'Kalyani Nagar Bridge', lat: 18.5463, lng: 73.9034, zone: 'East', elevationMeters: 548, isHighGround: false },
  { id: 'N12', name: 'Koregaon Park North', lat: 18.5362, lng: 73.8940, zone: 'Central East', elevationMeters: 552, isHighGround: false },
  { id: 'N13', name: 'Bund Garden Sangam', lat: 18.5372, lng: 73.8782, zone: 'River Confluence', elevationMeters: 544, isHighGround: false },
  { id: 'N14', name: 'Khadki Cantt Post', lat: 18.5661, lng: 73.8340, zone: 'North', elevationMeters: 560, isHighGround: true },
  { id: 'N15', name: 'Baner High Street', lat: 18.5590, lng: 73.7868, zone: 'North West', elevationMeters: 572, isHighGround: true },
  { id: 'N16', name: 'Hinjawadi IT Corridor', lat: 18.5913, lng: 73.7389, zone: 'Far West', elevationMeters: 588, isHighGround: true },
  { id: 'N17', name: 'Warje Flyover Base', lat: 18.4812, lng: 73.7995, zone: 'South West', elevationMeters: 566, isHighGround: false },
  { id: 'N18', name: 'Sinhagad Road Riverbank', lat: 18.4725, lng: 73.8290, zone: 'South West Lowlands', elevationMeters: 545, isHighGround: false },
  { id: 'N19', name: 'Bibwewadi Main', lat: 18.4801, lng: 73.8647, zone: 'South East', elevationMeters: 570, isHighGround: true },
  { id: 'N20', name: 'Fatima Nagar Junction', lat: 18.5050, lng: 73.8980, zone: 'South East', elevationMeters: 563, isHighGround: true },
  { id: 'N21', name: 'Pashan Lake Circle', lat: 18.5385, lng: 73.7924, zone: 'West', elevationMeters: 584, isHighGround: true },
  { id: 'N22', name: 'Vishrantwadi Chowk', lat: 18.5742, lng: 73.8765, zone: 'North', elevationMeters: 568, isHighGround: true },
  { id: 'N23', name: 'Pimpri Apex Corridor', lat: 18.6279, lng: 73.8009, zone: 'North West Suburb', elevationMeters: 560, isHighGround: true },
  { id: 'N24', name: 'Bhosari Industrial Hub', lat: 18.6250, lng: 73.8480, zone: 'North Industrial', elevationMeters: 574, isHighGround: true }
];

export const INITIAL_ROAD_SEGMENTS: RoadSegment[] = [
  { id: 'S1', fromNodeId: 'N1', toNodeId: 'N2', name: 'FC Road / Deccan Link', distanceKm: 2.1, normalTravelTimeMinutes: 6, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S2', fromNodeId: 'N2', toNodeId: 'N3', name: 'Tilak Road / Swargate', distanceKm: 2.4, normalTravelTimeMinutes: 7, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S3', fromNodeId: 'N1', toNodeId: 'N4', name: 'Sangam Bridge / Station Way', distanceKm: 3.5, normalTravelTimeMinutes: 9, isBlocked: false, hazardExposure: 'Moderate', roadCondition: 'Good' },
  { id: 'S4', fromNodeId: 'N4', toNodeId: 'N13', name: 'Bund Garden Cause-way', distanceKm: 1.8, normalTravelTimeMinutes: 5, isBlocked: false, hazardExposure: 'Severe', roadCondition: 'Waterlogged' },
  { id: 'S5', fromNodeId: 'N13', toNodeId: 'N8', name: 'Yerawada River Crossing Bridge', distanceKm: 2.2, normalTravelTimeMinutes: 6, isBlocked: false, hazardExposure: 'Critical', roadCondition: 'Waterlogged', floodDepthCm: 15 },
  { id: 'S6', fromNodeId: 'N8', toNodeId: 'N9', name: 'Airport Road / Viman Nagar', distanceKm: 3.8, normalTravelTimeMinutes: 8, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S7', fromNodeId: 'N4', toNodeId: 'N12', name: 'Koregaon Park Main Road', distanceKm: 2.5, normalTravelTimeMinutes: 7, isBlocked: false, hazardExposure: 'Moderate', roadCondition: 'Good' },
  { id: 'S8', fromNodeId: 'N12', toNodeId: 'N11', name: 'KP North - Kalyani Nagar Link', distanceKm: 1.9, normalTravelTimeMinutes: 5, isBlocked: false, hazardExposure: 'Severe', roadCondition: 'Good' },
  { id: 'S9', fromNodeId: 'N11', toNodeId: 'N9', name: 'Kalyani Nagar - Viman Nagar Arterial', distanceKm: 2.8, normalTravelTimeMinutes: 7, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S10', fromNodeId: 'N4', toNodeId: 'N20', name: 'Camp - Fatima Nagar Link', distanceKm: 3.6, normalTravelTimeMinutes: 9, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S11', fromNodeId: 'N20', toNodeId: 'N5', name: 'Solapur Highway Hadapsar Corridor', distanceKm: 3.2, normalTravelTimeMinutes: 7, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S12', fromNodeId: 'N3', toNodeId: 'N19', name: 'Bibwewadi Connect Highway', distanceKm: 2.7, normalTravelTimeMinutes: 6, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S13', fromNodeId: 'N19', toNodeId: 'N10', name: 'Katraj Hill Bypass', distanceKm: 4.1, normalTravelTimeMinutes: 10, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S14', fromNodeId: 'N3', toNodeId: 'N18', name: 'Sinhagad Road Underpass', distanceKm: 3.9, normalTravelTimeMinutes: 11, isBlocked: false, hazardExposure: 'Critical', roadCondition: 'Waterlogged', floodDepthCm: 30 },
  { id: 'S15', fromNodeId: 'N18', toNodeId: 'N17', name: 'Mutha Riverbank Bypass', distanceKm: 3.4, normalTravelTimeMinutes: 9, isBlocked: false, hazardExposure: 'Severe', roadCondition: 'Waterlogged' },
  { id: 'S16', fromNodeId: 'N17', toNodeId: 'N6', name: 'Warje - Kothrud Connector', distanceKm: 3.6, normalTravelTimeMinutes: 8, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S17', fromNodeId: 'N2', toNodeId: 'N6', name: 'Karve Road Flyover', distanceKm: 3.8, normalTravelTimeMinutes: 9, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S18', fromNodeId: 'N6', toNodeId: 'N21', name: 'Paud Road - Pashan Link', distanceKm: 4.2, normalTravelTimeMinutes: 10, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S19', fromNodeId: 'N21', toNodeId: 'N15', name: 'Pashan - Baner Corridor', distanceKm: 3.1, normalTravelTimeMinutes: 7, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S20', fromNodeId: 'N15', toNodeId: 'N16', name: 'Mumbai-Bangalore Hwy to Hinjawadi', distanceKm: 5.8, normalTravelTimeMinutes: 12, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S21', fromNodeId: 'N1', toNodeId: 'N7', name: 'Ganeshkhind Road to Aundh', distanceKm: 4.5, normalTravelTimeMinutes: 11, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S22', fromNodeId: 'N7', toNodeId: 'N15', name: 'Aundh - Baner Link Bridge', distanceKm: 2.3, normalTravelTimeMinutes: 5, isBlocked: false, hazardExposure: 'Moderate', roadCondition: 'Good' },
  { id: 'S23', fromNodeId: 'N1', toNodeId: 'N14', name: 'Old Mumbai Highway Khadki Segment', distanceKm: 4.3, normalTravelTimeMinutes: 10, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S24', fromNodeId: 'N14', toNodeId: 'N7', name: 'Holkar Bridge Khadki-Aundh', distanceKm: 3.2, normalTravelTimeMinutes: 7, isBlocked: false, hazardExposure: 'Severe', roadCondition: 'Potholed' },
  { id: 'S25', fromNodeId: 'N14', toNodeId: 'N22', name: 'Khadki - Vishrantwadi Underpass', distanceKm: 3.7, normalTravelTimeMinutes: 9, isBlocked: false, hazardExposure: 'Moderate', roadCondition: 'Good' },
  { id: 'S26', fromNodeId: 'N22', toNodeId: 'N8', name: 'Alandi Road - Yerawada', distanceKm: 2.9, normalTravelTimeMinutes: 7, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S27', fromNodeId: 'N14', toNodeId: 'N23', name: 'Old Highway to Pimpri', distanceKm: 7.2, normalTravelTimeMinutes: 15, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S28', fromNodeId: 'N23', toNodeId: 'N24', name: 'Telco Road Pimpri-Bhosari Link', distanceKm: 4.9, normalTravelTimeMinutes: 11, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S29', fromNodeId: 'N24', toNodeId: 'N22', name: 'Bhosari - Vishrantwadi Spine', distanceKm: 6.1, normalTravelTimeMinutes: 14, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S30', fromNodeId: 'N3', toNodeId: 'N20', name: 'Gultekdi / Salisbury Park Bypass', distanceKm: 3.0, normalTravelTimeMinutes: 7, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S31', fromNodeId: 'N19', toNodeId: 'N20', name: 'Kondhwa - Fatima Cross', distanceKm: 3.5, normalTravelTimeMinutes: 8, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S32', fromNodeId: 'N11', toNodeId: 'N5', name: 'Mundhwa Riverbank Bypass', distanceKm: 4.8, normalTravelTimeMinutes: 12, isBlocked: false, hazardExposure: 'Severe', roadCondition: 'Waterlogged' },
  { id: 'S33', fromNodeId: 'N10', toNodeId: 'N18', name: 'Ambegaon Valley Pass to Sinhagad', distanceKm: 4.6, normalTravelTimeMinutes: 13, isBlocked: false, hazardExposure: 'Moderate', roadCondition: 'Good' },
  { id: 'S34', fromNodeId: 'N17', toNodeId: 'N10', name: 'Katraj-Dehu Road Bypass South Link', distanceKm: 6.5, normalTravelTimeMinutes: 14, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S35', fromNodeId: 'N7', toNodeId: 'N23', name: 'Aundh - Pimpri Expressway', distanceKm: 6.8, normalTravelTimeMinutes: 13, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' },
  { id: 'S36', fromNodeId: 'N15', toNodeId: 'N23', name: 'Wakad Bridge to Pimpri', distanceKm: 6.4, normalTravelTimeMinutes: 12, isBlocked: false, hazardExposure: 'None', roadCondition: 'Good' }
];

export const INITIAL_EMERGENCIES: EmergencyRequest[] = [
  {
    id: 'INC-101',
    locationName: 'Sinhagad Lowland Basti (Cluster 4)',
    coordinates: { lat: 18.4740, lng: 73.8270 },
    nearestNodeId: 'N18',
    category: 'Drowning/Water',
    severity: 'Critical',
    peopleCount: 6,
    timeReceived: '2026-10-08T19:40:00Z',
    requiredCapability: 'Critical Care',
    status: 'New',
    waitingTimeMinutes: 42,
    notes: 'Elderly residents and infant trapped in waterlogged ground floor. Rising water level.'
  },
  {
    id: 'INC-102',
    locationName: 'Bund Garden Ferry Point',
    coordinates: { lat: 18.5380, lng: 73.8770 },
    nearestNodeId: 'N13',
    category: 'Trauma',
    severity: 'Critical',
    peopleCount: 3,
    timeReceived: '2026-10-08T19:55:00Z',
    requiredCapability: 'ALS',
    status: 'New',
    waitingTimeMinutes: 27,
    notes: 'Bridge railing collapsed during flash current; 2 victims submerged with blunt trauma.'
  },
  {
    id: 'INC-103',
    locationName: 'Yerawada Slum Sector 2',
    coordinates: { lat: 18.5520, lng: 73.8780 },
    nearestNodeId: 'N8',
    category: 'Respiratory',
    severity: 'High',
    peopleCount: 4,
    timeReceived: '2026-10-08T20:05:00Z',
    requiredCapability: 'ALS',
    status: 'New',
    waitingTimeMinutes: 17,
    notes: 'Severe respiratory distress exacerbated by damp conditions and power failure.'
  },
  {
    id: 'INC-104',
    locationName: 'Swargate Bus Terminal Gate 3',
    coordinates: { lat: 18.5025, lng: 73.8590 },
    nearestNodeId: 'N3',
    category: 'Cardiac',
    severity: 'Critical',
    peopleCount: 1,
    timeReceived: '2026-10-08T20:10:00Z',
    requiredCapability: 'ALS',
    status: 'New',
    waitingTimeMinutes: 12,
    notes: '62-year-old male with acute chest pain and diaphoresis in stranded waiting room.'
  },
  {
    id: 'INC-105',
    locationName: 'Mundhwa Industrial Labor Quarters',
    coordinates: { lat: 18.5290, lng: 73.9180 },
    nearestNodeId: 'N11',
    category: 'Trauma',
    severity: 'High',
    peopleCount: 5,
    timeReceived: '2026-10-08T20:12:00Z',
    requiredCapability: 'BLS',
    status: 'New',
    waitingTimeMinutes: 10,
    notes: 'Corrugated roof collapse due to high winds and heavy downpour. Lacerations and fractures.'
  },
  {
    id: 'INC-106',
    locationName: 'Kothrud Ashish Garden Society',
    coordinates: { lat: 18.5050, lng: 73.8110 },
    nearestNodeId: 'N6',
    category: 'Maternal',
    severity: 'High',
    peopleCount: 1,
    timeReceived: '2026-10-08T20:15:00Z',
    requiredCapability: 'ALS',
    status: 'New',
    waitingTimeMinutes: 7,
    notes: 'Pre-term labor at 35 weeks. Road access narrow but dry.'
  },
  {
    id: 'INC-107',
    locationName: 'Deccan Gymkhana Riverside Walk',
    coordinates: { lat: 18.5180, lng: 73.8425 },
    nearestNodeId: 'N2',
    category: 'Drowning/Water',
    severity: 'Moderate',
    peopleCount: 2,
    timeReceived: '2026-10-08T20:18:00Z',
    requiredCapability: 'BLS',
    status: 'New',
    waitingTimeMinutes: 4,
    notes: 'Civilians pulled from flooded underpass; mild hypothermia and abrasions.'
  },
  {
    id: 'INC-108',
    locationName: 'Viman Nagar Symbiosis Campus Gate',
    coordinates: { lat: 18.5665, lng: 73.9130 },
    nearestNodeId: 'N9',
    category: 'General',
    severity: 'Moderate',
    peopleCount: 8,
    timeReceived: '2026-10-08T20:20:00Z',
    requiredCapability: 'Mobile Triage',
    status: 'New',
    waitingTimeMinutes: 2,
    notes: 'Stranded hostel students needing general medical triage, dehydration treatment.'
  },
  {
    id: 'INC-109',
    locationName: 'Pimpri Finolex Colony',
    coordinates: { lat: 18.6250, lng: 73.8050 },
    nearestNodeId: 'N23',
    category: 'Respiratory',
    severity: 'Low',
    peopleCount: 2,
    timeReceived: '2026-10-08T19:30:00Z',
    requiredCapability: 'BLS',
    status: 'New',
    waitingTimeMinutes: 52,
    notes: 'Mild asthma attack; nebulization assistance needed.'
  },
  {
    id: 'INC-110',
    locationName: 'Khadki Bazar Market Shed',
    coordinates: { lat: 18.5645, lng: 73.8355 },
    nearestNodeId: 'N14',
    category: 'Heatstroke',
    severity: 'Moderate',
    peopleCount: 3,
    timeReceived: '2026-10-08T19:50:00Z',
    requiredCapability: 'Mobile Triage',
    status: 'New',
    waitingTimeMinutes: 32,
    notes: 'Warehouse workers collapsed from heat exhaustion and poor ventilation.'
  }
];

export const INITIAL_AMBULANCES: Ambulance[] = [
  {
    id: 'AMB-01',
    callSign: 'Alpha-1 (ALS Mobile ICU)',
    currentCoordinates: { lat: 18.5314, lng: 73.8446 },
    currentNodeId: 'N1',
    status: 'Available',
    capability: 'Critical Care',
    lastUpdate: '2026-10-08T20:21:00Z',
    fuelPercent: 92,
    crewName: 'Capt. R. Deshmukh & Paramedic Khan'
  },
  {
    id: 'AMB-02',
    callSign: 'Bravo-2 (Advanced Cardiac)',
    currentCoordinates: { lat: 18.5284, lng: 73.8744 },
    currentNodeId: 'N4',
    status: 'Available',
    capability: 'ALS',
    lastUpdate: '2026-10-08T20:21:00Z',
    fuelPercent: 84,
    crewName: 'Paramedic Joshi & EMT Nair'
  },
  {
    id: 'AMB-03',
    callSign: 'Charlie-3 (Trauma Response)',
    currentCoordinates: { lat: 18.5074, lng: 73.8077 },
    currentNodeId: 'N6',
    status: 'Available',
    capability: 'ALS',
    lastUpdate: '2026-10-08T20:21:00Z',
    fuelPercent: 88,
    crewName: 'Dr. Kulkarni & Paramedic Shinde'
  },
  {
    id: 'AMB-04',
    callSign: 'Delta-4 (Rapid BLS)',
    currentCoordinates: { lat: 18.5089, lng: 73.9259 },
    currentNodeId: 'N5',
    status: 'Available',
    capability: 'BLS',
    lastUpdate: '2026-10-08T20:21:00Z',
    fuelPercent: 76,
    crewName: 'EMT Patil & Driver More'
  },
  {
    id: 'AMB-05',
    callSign: 'Echo-5 (High Clearance BLS)',
    currentCoordinates: { lat: 18.5580, lng: 73.8075 },
    currentNodeId: 'N7',
    status: 'Available',
    capability: 'BLS',
    lastUpdate: '2026-10-08T20:21:00Z',
    fuelPercent: 95,
    crewName: 'EMT Waghmare & EMT Salunke'
  },
  {
    id: 'AMB-06',
    callSign: 'Foxtrot-6 (Mobile Triage Unit)',
    currentCoordinates: { lat: 18.5679, lng: 73.9143 },
    currentNodeId: 'N9',
    status: 'Available',
    capability: 'Mobile Triage',
    lastUpdate: '2026-10-08T20:21:00Z',
    fuelPercent: 80,
    crewName: 'Nurse In-charge Anita & Paramedic Verma'
  },
  {
    id: 'AMB-07',
    callSign: 'Golf-7 (Heavy Disaster ALS)',
    currentCoordinates: { lat: 18.4485, lng: 73.8588 },
    currentNodeId: 'N10',
    status: 'Available',
    capability: 'Critical Care',
    lastUpdate: '2026-10-08T20:21:00Z',
    fuelPercent: 71,
    crewName: 'Dr. Jadhav & Paramedic Gaikwad'
  },
  {
    id: 'AMB-08',
    callSign: 'Hotel-8 (Community BLS)',
    currentCoordinates: { lat: 18.5018, lng: 73.8584 },
    currentNodeId: 'N3',
    status: 'Available',
    capability: 'BLS',
    lastUpdate: '2026-10-08T20:21:00Z',
    fuelPercent: 65,
    crewName: 'EMT Thorat & Driver Chavan'
  }
];

export const INITIAL_HOSPITALS: Hospital[] = [
  {
    id: 'HOSP-1',
    name: 'Fictional Apex Government Medical College',
    coordinates: { lat: 18.5298, lng: 73.8685 },
    nearestNodeId: 'N4',
    totalBeds: 650,
    availableBeds: 48,
    emergencyCapacity: 35,
    currentPatientLoad: 602,
    capabilities: ['Trauma Level 1', 'ICU', 'Burn Unit', 'Pediatrics', 'Dialysis', 'Infectious Disease', 'Neurosurgery'],
    status: 'Operational',
    isAccessible: true,
    address: 'Near Pune Station Approach, Camp Sector (Simulated)',
    phone: '+91-20-5550-1001'
  },
  {
    id: 'HOSP-2',
    name: 'Fictional West Memorial Multispecialty',
    coordinates: { lat: 18.5090, lng: 73.8160 },
    nearestNodeId: 'N6',
    totalBeds: 320,
    availableBeds: 34,
    emergencyCapacity: 20,
    currentPatientLoad: 286,
    capabilities: ['Trauma Level 2', 'ICU', 'Cardiac', 'Pediatrics', 'Orthopedics'],
    status: 'Operational',
    isAccessible: true,
    address: 'Paud Road, Kothrud Corridor (Simulated)',
    phone: '+91-20-5550-1002'
  },
  {
    id: 'HOSP-3',
    name: 'Fictional North-West Valley General Hospital',
    coordinates: { lat: 18.5610, lng: 73.8050 },
    nearestNodeId: 'N7',
    totalBeds: 280,
    availableBeds: 18,
    emergencyCapacity: 15,
    currentPatientLoad: 262,
    capabilities: ['Trauma Level 2', 'ICU', 'Respiratory Isolation', 'General Emergency'],
    status: 'Operational',
    isAccessible: true,
    address: 'Aundh District Center (Simulated)',
    phone: '+91-20-5550-1003'
  },
  {
    id: 'HOSP-4',
    name: 'Fictional Riverbank Community Hospital',
    coordinates: { lat: 18.5410, lng: 73.8790 },
    nearestNodeId: 'N13',
    totalBeds: 190,
    availableBeds: 6,
    emergencyCapacity: 8,
    currentPatientLoad: 184,
    capabilities: ['Trauma Level 3', 'Maternal', 'General Emergency'],
    status: 'Limited Access',
    isAccessible: true,
    address: 'Sangam Bund Basin Area (Simulated)',
    phone: '+91-20-5550-1004'
  },
  {
    id: 'HOSP-5',
    name: 'Fictional Sahyadri East Emergency Center',
    coordinates: { lat: 18.5070, lng: 73.9210 },
    nearestNodeId: 'N5',
    totalBeds: 360,
    availableBeds: 52,
    emergencyCapacity: 22,
    currentPatientLoad: 308,
    capabilities: ['Trauma Level 2', 'ICU', 'Cardiac', 'Burn Unit', 'Dialysis'],
    status: 'Operational',
    isAccessible: true,
    address: 'Hadapsar Solapur Bypass (Simulated)',
    phone: '+91-20-5550-1005'
  }
];

export const INITIAL_CANDIDATE_SITES: CandidateSite[] = [
  {
    id: 'SITE-01',
    name: 'Deccan Gymkhana Sports Pavilion',
    coordinates: { lat: 18.5165, lng: 73.8400 },
    nearestNodeId: 'N2',
    zone: 'Central West',
    supportedTypes: ['Field Clinic', 'Relief Camp'],
    safetyStatus: 'Safe',
    hazardExposure: 'None',
    isAccessible: true,
    estimatedPopulationServed: 32000,
    nearbyEmergencyDemand: 4,
    travelTimeToNearestHospitalMin: 6,
    capacityMaxPeople: 450,
    waterAndPowerAccess: true
  },
  {
    id: 'SITE-02',
    name: 'Kothrud Yashwantrao Chavan Auditorium Complex',
    coordinates: { lat: 18.5065, lng: 73.8090 },
    nearestNodeId: 'N6',
    zone: 'West High Ground',
    supportedTypes: ['Field Clinic', 'Relief Camp', 'Medical Supply Depot'],
    safetyStatus: 'Safe',
    hazardExposure: 'None',
    isAccessible: true,
    estimatedPopulationServed: 48000,
    nearbyEmergencyDemand: 3,
    travelTimeToNearestHospitalMin: 3,
    capacityMaxPeople: 850,
    waterAndPowerAccess: true
  },
  {
    id: 'SITE-03',
    name: 'Sangam Lowland Riverside Grounds',
    coordinates: { lat: 18.5390, lng: 73.8760 },
    nearestNodeId: 'N13',
    zone: 'River Confluence',
    supportedTypes: ['Field Clinic', 'Mobile Medical Unit'],
    safetyStatus: 'Unsafe',
    hazardExposure: 'Severe',
    isAccessible: false,
    estimatedPopulationServed: 29000,
    nearbyEmergencyDemand: 7,
    travelTimeToNearestHospitalMin: 12,
    capacityMaxPeople: 300,
    waterAndPowerAccess: false,
    exclusionReason: 'Direct flood inundation risk and waterlogged access road S5.'
  },
  {
    id: 'SITE-04',
    name: 'Viman Nagar Community Stadium',
    coordinates: { lat: 18.5690, lng: 73.9160 },
    nearestNodeId: 'N9',
    zone: 'North East Plateau',
    supportedTypes: ['Relief Camp', 'Medical Supply Depot', 'Field Clinic'],
    safetyStatus: 'Safe',
    hazardExposure: 'None',
    isAccessible: true,
    estimatedPopulationServed: 54000,
    nearbyEmergencyDemand: 2,
    travelTimeToNearestHospitalMin: 9,
    capacityMaxPeople: 1200,
    waterAndPowerAccess: true
  },
  {
    id: 'SITE-05',
    name: 'Swargate Nehru Stadium Indoor Complex',
    coordinates: { lat: 18.5030, lng: 73.8560 },
    nearestNodeId: 'N3',
    zone: 'South Central',
    supportedTypes: ['Relief Camp', 'Field Clinic', 'Mobile Medical Unit'],
    safetyStatus: 'Safe',
    hazardExposure: 'None',
    isAccessible: true,
    estimatedPopulationServed: 65000,
    nearbyEmergencyDemand: 6,
    travelTimeToNearestHospitalMin: 8,
    capacityMaxPeople: 1500,
    waterAndPowerAccess: true
  },
  {
    id: 'SITE-06',
    name: 'Sinhagad Ekta Ground Riverside',
    coordinates: { lat: 18.4710, lng: 73.8260 },
    nearestNodeId: 'N18',
    zone: 'South West River Basin',
    supportedTypes: ['Field Clinic', 'Mobile Medical Unit'],
    safetyStatus: 'Unsafe',
    hazardExposure: 'Inundated',
    isAccessible: false,
    estimatedPopulationServed: 38000,
    nearbyEmergencyDemand: 9,
    travelTimeToNearestHospitalMin: 22,
    capacityMaxPeople: 250,
    waterAndPowerAccess: false,
    exclusionReason: 'Inundated during river dam discharge. Water depth over 45 cm.'
  },
  {
    id: 'SITE-07',
    name: 'Aundh Savitribai Phule University Outpost',
    coordinates: { lat: 18.5550, lng: 73.8110 },
    nearestNodeId: 'N7',
    zone: 'North West Elevated',
    supportedTypes: ['Field Clinic', 'Mobile Medical Unit', 'Medical Supply Depot'],
    safetyStatus: 'Safe',
    hazardExposure: 'None',
    isAccessible: true,
    estimatedPopulationServed: 41000,
    nearbyEmergencyDemand: 3,
    travelTimeToNearestHospitalMin: 4,
    capacityMaxPeople: 600,
    waterAndPowerAccess: true
  },
  {
    id: 'SITE-08',
    name: 'Hadapsar Magarpatta Exhibition Arena',
    coordinates: { lat: 18.5110, lng: 73.9280 },
    nearestNodeId: 'N5',
    zone: 'East Industrial High Ground',
    supportedTypes: ['Relief Camp', 'Medical Supply Depot', 'Field Clinic'],
    safetyStatus: 'Safe',
    hazardExposure: 'None',
    isAccessible: true,
    estimatedPopulationServed: 58000,
    nearbyEmergencyDemand: 4,
    travelTimeToNearestHospitalMin: 5,
    capacityMaxPeople: 2000,
    waterAndPowerAccess: true
  }
];

export const INITIAL_TEMPORARY_RESOURCES: TemporaryResource[] = [
  {
    id: 'TR-01',
    name: 'Field Clinic Alpha (Triage & Minor Surgery)',
    type: 'Field Clinic',
    status: 'Available',
    personnelCount: 8,
    capacity: 120,
    currentOccupancy: 0,
    suppliesEquipped: true
  },
  {
    id: 'TR-02',
    name: 'Field Clinic Bravo (Pediatric & Maternity)',
    type: 'Field Clinic',
    status: 'Available',
    personnelCount: 6,
    capacity: 90,
    currentOccupancy: 0,
    suppliesEquipped: true
  },
  {
    id: 'TR-03',
    name: 'Relief Camp Unit 1 (Mass Shelter & Food)',
    type: 'Relief Camp',
    status: 'Available',
    personnelCount: 14,
    capacity: 650,
    currentOccupancy: 0,
    suppliesEquipped: true
  },
  {
    id: 'TR-04',
    name: 'Relief Camp Unit 2 (Displaced Family Wing)',
    type: 'Relief Camp',
    status: 'Available',
    personnelCount: 12,
    capacity: 500,
    currentOccupancy: 0,
    suppliesEquipped: true
  },
  {
    id: 'TR-05',
    name: 'Mobile Medical Van X-1 (Cooling & First Aid)',
    type: 'Mobile Medical Unit',
    status: 'Available',
    personnelCount: 4,
    capacity: 45,
    currentOccupancy: 0,
    suppliesEquipped: true
  },
  {
    id: 'TR-06',
    name: 'Mobile Medical Van X-2 (Disaster Outreach)',
    type: 'Mobile Medical Unit',
    status: 'Available',
    personnelCount: 4,
    capacity: 45,
    currentOccupancy: 0,
    suppliesEquipped: true
  },
  {
    id: 'TR-07',
    name: 'Emergency Supply Pod Central (Rapid Depot)',
    type: 'Medical Supply Depot',
    status: 'Available',
    personnelCount: 5,
    capacity: 15000, // units of supplies
    currentOccupancy: 0,
    suppliesEquipped: true
  }
];

export const INITIAL_RELIEF_CAMPS: ReliefCamp[] = [
  {
    id: 'RC-1',
    name: 'Nehru Stadium Regional Relief Camp',
    coordinates: { lat: 18.5030, lng: 73.8560 },
    capacity: 1500,
    currentOccupants: 340,
    waterSupplyLitres: 18000,
    foodRationsDays: 6,
    status: 'Active'
  },
  {
    id: 'RC-2',
    name: 'Kothrud Cultural Shelter Wing',
    coordinates: { lat: 18.5065, lng: 73.8090 },
    capacity: 850,
    currentOccupants: 120,
    waterSupplyLitres: 12000,
    foodRationsDays: 8,
    status: 'Active'
  },
  {
    id: 'RC-3',
    name: 'Viman Nagar Airport Evacuation Haven',
    coordinates: { lat: 18.5690, lng: 73.9160 },
    capacity: 1200,
    currentOccupants: 45,
    waterSupplyLitres: 22000,
    foodRationsDays: 10,
    status: 'Active'
  },
  {
    id: 'RC-4',
    name: 'Magarpatta High Ground Reserve Camp',
    coordinates: { lat: 18.5110, lng: 73.9280 },
    capacity: 2000,
    currentOccupants: 0,
    waterSupplyLitres: 25000,
    foodRationsDays: 14,
    status: 'Standby'
  }
];

export const INITIAL_DEPOTS: MedicalSupplyDepot[] = [
  {
    id: 'DEPOT-1',
    name: 'Central Disaster Medical Storehouse (Shivajinagar)',
    coordinates: { lat: 18.5300, lng: 73.8460 },
    nearestNodeId: 'N1',
    storageCapacitySqM: 1200,
    isAccessible: true,
    managedBy: 'State Disaster Response Logistics'
  },
  {
    id: 'DEPOT-2',
    name: 'West Division Reserve Depot (Aundh)',
    coordinates: { lat: 18.5570, lng: 73.8080 },
    nearestNodeId: 'N7',
    storageCapacitySqM: 850,
    isAccessible: true,
    managedBy: 'Municipal Health Services'
  },
  {
    id: 'DEPOT-3',
    name: 'East Hub Medical Warehouse (Hadapsar)',
    coordinates: { lat: 18.5100, lng: 73.9240 },
    nearestNodeId: 'N5',
    storageCapacitySqM: 1400,
    isAccessible: true,
    managedBy: 'Regional Red Cross Logistics'
  },
  {
    id: 'DEPOT-4',
    name: 'South Foothills Supply Depot (Swargate)',
    coordinates: { lat: 18.5010, lng: 73.8570 },
    nearestNodeId: 'N3',
    storageCapacitySqM: 600,
    isAccessible: true,
    managedBy: 'Civil Defense Contingent'
  },
  {
    id: 'DEPOT-5',
    name: 'North Air Logistics Depot (Viman Nagar)',
    coordinates: { lat: 18.5670, lng: 73.9130 },
    nearestNodeId: 'N9',
    storageCapacitySqM: 950,
    isAccessible: true,
    managedBy: 'Civil Aviation Disaster Cell'
  }
];

export const INITIAL_EVACUATION_DESTINATIONS: EvacuationDestination[] = [
  {
    id: 'EVAC-1',
    name: 'Pune University Elevated Grounds',
    coordinates: { lat: 18.5550, lng: 73.8240 },
    nearestNodeId: 'N7',
    capacity: 4500,
    currentCount: 620,
    isApproved: true
  },
  {
    id: 'EVAC-2',
    name: 'Katraj Highland Open Complex',
    coordinates: { lat: 18.4500, lng: 73.8600 },
    nearestNodeId: 'N10',
    capacity: 3500,
    currentCount: 410,
    isApproved: true
  },
  {
    id: 'EVAC-3',
    name: 'Magarpatta Safe High-Ground Zone',
    coordinates: { lat: 18.5130, lng: 73.9300 },
    nearestNodeId: 'N5',
    capacity: 6000,
    currentCount: 890,
    isApproved: true
  },
  {
    id: 'EVAC-4',
    name: 'Bhosari Industrial Community Center',
    coordinates: { lat: 18.6240, lng: 73.8470 },
    nearestNodeId: 'N24',
    capacity: 3000,
    currentCount: 150,
    isApproved: true
  }
];

export const INITIAL_INVENTORY: ResourceInventoryItem[] = [
  {
    id: 'INV-01',
    name: 'Disaster First-Aid Trauma Kits',
    category: 'Trauma',
    quantityAvailable: 420,
    quantityAllocated: 95,
    unit: 'Kits',
    minimumThreshold: 100,
    storageDepotId: 'DEPOT-1',
    expiryDate: '2028-06-30',
    replenishmentStatus: 'Adequate'
  },
  {
    id: 'INV-02',
    name: 'Sterile Hemostatic Gauze & Bandages',
    category: 'Trauma',
    quantityAvailable: 1850,
    quantityAllocated: 600,
    unit: 'Boxes (50 ct)',
    minimumThreshold: 500,
    storageDepotId: 'DEPOT-1',
    expiryDate: '2029-01-15',
    replenishmentStatus: 'Adequate'
  },
  {
    id: 'INV-03',
    name: 'Flood Water PPE (Waders & Bio Suits)',
    category: 'PPE',
    quantityAvailable: 110,
    quantityAllocated: 85,
    unit: 'Suits',
    minimumThreshold: 120,
    storageDepotId: 'DEPOT-2',
    expiryDate: '2030-12-31',
    replenishmentStatus: 'Low'
  },
  {
    id: 'INV-04',
    name: 'Emergency IV Fluids (Normal Saline & Ringer Lactate)',
    category: 'Medical',
    quantityAvailable: 680,
    quantityAllocated: 220,
    unit: 'Liters',
    minimumThreshold: 300,
    storageDepotId: 'DEPOT-3',
    expiryDate: '2027-11-20',
    replenishmentStatus: 'Adequate'
  },
  {
    id: 'INV-05',
    name: 'Oral Rehydration Salts (ORS) & Electrolytes',
    category: 'Hydration',
    quantityAvailable: 4500,
    quantityAllocated: 1200,
    unit: 'Sachets',
    minimumThreshold: 1000,
    storageDepotId: 'DEPOT-4',
    expiryDate: '2028-03-31',
    replenishmentStatus: 'Adequate'
  },
  {
    id: 'INV-06',
    name: 'Portable Emergency Ventilators & Bag-Valve-Masks',
    category: 'Equipment',
    quantityAvailable: 28,
    quantityAllocated: 22,
    unit: 'Units',
    minimumThreshold: 30,
    storageDepotId: 'DEPOT-1',
    expiryDate: '2031-05-15',
    replenishmentStatus: 'Critical Shortage'
  },
  {
    id: 'INV-07',
    name: 'Chlorine Water Purification Tablets',
    category: 'Hydration',
    quantityAvailable: 12000,
    quantityAllocated: 3000,
    unit: 'Tablets',
    minimumThreshold: 5000,
    storageDepotId: 'DEPOT-5',
    expiryDate: '2029-09-30',
    replenishmentStatus: 'Adequate'
  },
  {
    id: 'INV-08',
    name: 'Burn Wound Gel Dressings',
    category: 'Medical',
    quantityAvailable: 340,
    quantityAllocated: 90,
    unit: 'Packs',
    minimumThreshold: 150,
    storageDepotId: 'DEPOT-3',
    expiryDate: '2027-08-10',
    replenishmentStatus: 'Adequate'
  }
];

export const INITIAL_HAZARDS: HazardZone[] = [
  {
    id: 'HAZ-FLOOD-1',
    type: 'flood',
    name: 'Mutha Riverbank Flood Zone (Khadakwasla Overflow)',
    center: { lat: 18.4735, lng: 73.8275 },
    radiusMeters: 1800,
    severity: 75,
    description: 'High water levels breaching riverbanks along Sinhagad road corridor. Roads waterlogged up to 45cm.',
    affectedRoadIds: ['S14', 'S15'],
    affectedCandidateSiteIds: ['SITE-06']
  },
  {
    id: 'HAZ-FLOOD-2',
    type: 'flood',
    name: 'Sangam Bund River Confluence Basin',
    center: { lat: 18.5385, lng: 73.8775 },
    radiusMeters: 1400,
    severity: 65,
    description: 'Confluence of Mula and Mutha rivers overflowing near Bund Garden Cause-way and Yerawada low bridge.',
    affectedRoadIds: ['S4', 'S5', 'S32'],
    affectedCandidateSiteIds: ['SITE-03']
  }
];

export const DEFAULT_MCDA_WEIGHTS: McdaWeights = {
  demandCoverage: 0.30,
  vulnerabilityCoverage: 0.15,
  accessibility: 0.20,
  healthcareGap: 0.15,
  logisticsSuitability: 0.10,
  hazardRisk: 0.10
};

export const HAZARD_EVOLUTION_STAGES: HazardEvolutionStage[] = [
  {
    stageId: 0,
    timeOffsetLabel: 'T+00:00 (Advisory Onset)',
    title: 'Initial Hydrological Advisory',
    severityPercent: 30,
    description: 'Upstream Khadakwasla dam discharge at 15,000 cusecs. Riverbank warning issued. Roads remain passable with minor waterlogging.',
    inundatedRoadIds: [],
    unreachableNodeIds: []
  },
  {
    stageId: 1,
    timeOffsetLabel: 'T+02:00 (River Surge)',
    title: 'Surge Flow & Low Bridge Inundation',
    severityPercent: 55,
    description: 'Discharge increased to 35,000 cusecs. Yerawada low bridge (S5) inundated by 25cm. Mutha river basin rising rapidly.',
    inundatedRoadIds: ['S5'],
    unreachableNodeIds: []
  },
  {
    stageId: 2,
    timeOffsetLabel: 'T+04:00 (Embankment Breach)',
    title: 'Sinhagad Embankment Overflow',
    severityPercent: 75,
    description: 'Water breaches retaining wall at Sinhagad road. S14 underpass completely flooded (55cm). Secondary bridge S4 waterlogged.',
    inundatedRoadIds: ['S5', 'S14', 'S4'],
    unreachableNodeIds: ['N18']
  },
  {
    stageId: 3,
    timeOffsetLabel: 'T+06:00 (Peak Inundation)',
    title: 'Confluence Peak Inundation (100-Yr Surge)',
    severityPercent: 95,
    description: 'Mula and Mutha confluence at Bund Garden completely overwhelmed. S32 and S15 severed. Hospital HOSP-4 access curtailed.',
    inundatedRoadIds: ['S5', 'S14', 'S4', 'S15', 'S32'],
    unreachableNodeIds: ['N18', 'N13']
  },
  {
    stageId: 4,
    timeOffsetLabel: 'T+08:00 (Receding & Triage)',
    title: 'Dam Gates Throttled — Relief & Rescue',
    severityPercent: 60,
    description: 'Upstream inflows stabilizing. Water levels receding from high ground. Search & rescue operations active across bastis.',
    inundatedRoadIds: ['S14', 'S5'],
    unreachableNodeIds: []
  }
];

export const INITIAL_ALERTS: AlertNotification[] = [
  {
    id: 'ALT-101',
    time: '10:35 AM',
    timestamp: Date.now() - 60000 * 4,
    alert: 'Flood Inundation Warning',
    category: 'Flood Breach',
    location: 'Sinhagad Basin Corridor',
    description: 'River discharge level reached 35,000 cusecs. Sinhagad underpass water depth exceeded 45cm.',
    severity: 'Critical',
    isRead: false,
    targetSegmentId: 'S14'
  },
  {
    id: 'ALT-102',
    time: '10:31 AM',
    timestamp: Date.now() - 60000 * 8,
    alert: 'Road Closure Enforced',
    category: 'Road Closure',
    location: 'Yerawada River Crossing Bridge',
    description: 'Bridge causeway completely closed to vehicular traffic due to strong cross currents.',
    severity: 'Critical',
    isRead: false,
    targetSegmentId: 'S5'
  },
  {
    id: 'ALT-103',
    time: '10:28 AM',
    timestamp: Date.now() - 60000 * 12,
    alert: 'Hospital Surge Alert',
    category: 'Hospital Surge',
    location: 'Riverbank Community Hospital',
    description: 'Facility reaching 97% capacity (only 6 beds remaining). Diverting trauma arrivals to East Hub.',
    severity: 'Warning',
    isRead: false
  },
  {
    id: 'ALT-104',
    time: '10:20 AM',
    timestamp: Date.now() - 60000 * 18,
    alert: 'Power Grid Disruption',
    category: 'Power Grid',
    location: 'West District Substation',
    description: 'Transformer trip reported in low-lying sector. Field clinics operating on diesel backup.',
    severity: 'Warning',
    isRead: true
  },
  {
    id: 'ALT-105',
    time: '10:14 AM',
    timestamp: Date.now() - 60000 * 25,
    alert: 'Air Quality & Debris Advisory',
    category: 'Air Quality',
    location: 'North Industrial Corridors',
    description: 'AQI index 82 with elevated particulate matter from industrial squall winds.',
    severity: 'Info',
    isRead: true
  },
  {
    id: 'ALT-106',
    time: '10:05 AM',
    timestamp: Date.now() - 60000 * 35,
    alert: 'Water Supply Infiltration',
    category: 'Water Supply',
    location: 'Bund Garden Pumping Station',
    description: 'Turbidity sensors alert. Chlorine booster dosing initiated across city reservoirs.',
    severity: 'Info',
    isRead: true
  }
];

export const INITIAL_SIMULATION_STATE: SimulationState = {
  version: 2,
  scenario: {
    currentScenario: 'flood',
    scenarioPresetName: 'Moderate River Flood Warning',
    floodSeverity: 65,
    cycloneWindIntensity: 45,
    cycloneDirection: 'North-East',
    heatwaveTemperatureC: 36,
    heatwaveDurationDays: 2,
    customNotes: 'Monsoon surge in upstream dams causing localized inundation along Mutha and Mula riverbanks.',
    activeHazardZones: INITIAL_HAZARDS
  },
  roadNodes: INITIAL_ROAD_NODES,
  roadSegments: INITIAL_ROAD_SEGMENTS,
  emergencyRequests: INITIAL_EMERGENCIES,
  ambulances: INITIAL_AMBULANCES,
  hospitals: INITIAL_HOSPITALS,
  candidateSites: INITIAL_CANDIDATE_SITES,
  temporaryResources: INITIAL_TEMPORARY_RESOURCES,
  inventory: INITIAL_INVENTORY,
  reliefCamps: INITIAL_RELIEF_CAMPS,
  depots: INITIAL_DEPOTS,
  evacuationDestinations: INITIAL_EVACUATION_DESTINATIONS,
  weights: DEFAULT_MCDA_WEIGHTS,
  lastRecalculatedAt: new Date().toISOString(),
  // SaaS extensions
  timelineStageIndex: 2,
  isPlayingTimeline: false,
  timelineSpeed: 1,
  emergencyModeActive: true,
  overallRiskLevel: 'HIGH',
  alerts: INITIAL_ALERTS,
  selectedDistrict: 'Pune Metropolitan Central'
};
