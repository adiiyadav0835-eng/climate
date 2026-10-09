/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SimulationState } from '../types/index.ts';
import { INITIAL_SIMULATION_STATE } from '../data/seedData.ts';

const STORAGE_KEY = 'caern_simulation_state_v1';

export class StorageService {
  /**
   * Loads state from localStorage or falls back safely to initial seed state
   */
  public static loadState(): SimulationState {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        return INITIAL_SIMULATION_STATE;
      }
      const parsed = JSON.parse(serialized) as SimulationState;

      // Validate core required fields
      if (
        !parsed ||
        !Array.isArray(parsed.roadNodes) ||
        !Array.isArray(parsed.roadSegments) ||
        !Array.isArray(parsed.emergencyRequests) ||
        !Array.isArray(parsed.ambulances) ||
        !Array.isArray(parsed.hospitals) ||
        !Array.isArray(parsed.candidateSites)
      ) {
        console.warn('CAERN: Corrupted state in localStorage. Resetting to initial state.');
        return INITIAL_SIMULATION_STATE;
      }

      // Safely hydrate new SaaS fields if missing from earlier storage
      if (!Array.isArray(parsed.alerts)) {
        parsed.alerts = INITIAL_SIMULATION_STATE.alerts;
      }
      if (parsed.timelineStageIndex === undefined) {
        parsed.timelineStageIndex = INITIAL_SIMULATION_STATE.timelineStageIndex;
      }
      if (!parsed.overallRiskLevel) {
        parsed.overallRiskLevel = INITIAL_SIMULATION_STATE.overallRiskLevel;
      }
      if (parsed.emergencyModeActive === undefined) {
        parsed.emergencyModeActive = INITIAL_SIMULATION_STATE.emergencyModeActive;
      }
      if (!parsed.selectedDistrict) {
        parsed.selectedDistrict = INITIAL_SIMULATION_STATE.selectedDistrict;
      }

      return parsed;
    } catch (err) {
      console.error('CAERN: Error reading from localStorage', err);
      return INITIAL_SIMULATION_STATE;
    }
  }

  /**
   * Saves state to localStorage
   */
  public static saveState(state: SimulationState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('CAERN: Failed to save simulation state to localStorage', err);
    }
  }

  /**
   * Clears saved state and restores seed data
   */
  public static resetState(): SimulationState {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('CAERN: Failed to clear localStorage', err);
    }
    return JSON.parse(JSON.stringify(INITIAL_SIMULATION_STATE));
  }
}
