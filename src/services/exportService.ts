/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SimulationState } from '../types/index.ts';

export class ExportService {
  /**
   * Generates a downloadable JSON file of the complete simulation state
   */
  public static exportJSON(state: SimulationState): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `caern_simulation_export_${state.scenario.currentScenario}_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  /**
   * Generates a downloadable CSV of all emergency incidents
   */
  public static exportIncidentsCSV(state: SimulationState): void {
    const headers = [
      'Incident ID',
      'Location Name',
      'Latitude',
      'Longitude',
      'Nearest Node',
      'Category',
      'Severity',
      'People Needing Help',
      'Wait Time (Min)',
      'Required Capability',
      'Status',
      'Assigned Ambulance',
      'Time Received',
      'Notes'
    ];

    const rows = state.emergencyRequests.map(req => [
      req.id,
      `"${req.locationName.replace(/"/g, '""')}"`,
      req.coordinates.lat,
      req.coordinates.lng,
      req.nearestNodeId,
      req.category,
      req.severity,
      req.peopleCount,
      req.waitingTimeMinutes,
      req.requiredCapability,
      req.status,
      req.assignedAmbulanceId || 'None',
      req.timeReceived,
      `"${(req.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `caern_emergency_incidents_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Generates a downloadable CSV of temporary resource sites & evaluations
   */
  public static exportCandidateSitesCSV(state: SimulationState): void {
    const headers = [
      'Site ID',
      'Name',
      'Zone',
      'Latitude',
      'Longitude',
      'Safety Status',
      'Hazard Exposure',
      'Road Accessible',
      'Est Population Served',
      'Nearby Demand',
      'Travel Time to Hospital (Min)',
      'Max Capacity',
      'Supported Types',
      'Deployed Resource',
      'Exclusion Reason'
    ];

    const rows = state.candidateSites.map(s => [
      s.id,
      `"${s.name.replace(/"/g, '""')}"`,
      s.zone,
      s.coordinates.lat,
      s.coordinates.lng,
      s.safetyStatus,
      s.hazardExposure,
      s.isAccessible ? 'Yes' : 'No',
      s.estimatedPopulationServed,
      s.nearbyEmergencyDemand,
      s.travelTimeToNearestHospitalMin,
      s.capacityMaxPeople,
      `"${s.supportedTypes.join('; ')}"`,
      s.deployedResourceId || 'None',
      `"${(s.exclusionReason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `caern_temporary_resource_sites_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
