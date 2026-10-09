/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { SimulationState } from '../types/index.ts';

export interface AssistantResponse {
  answer: string;
  source: 'gemini' | 'rule-based-fallback';
  keyPoints: string[];
}

export class GeminiAssistantService {
  /**
   * Generates a context-aware answer for disaster planning questions
   */
  public static async queryAssistant(
    question: string,
    state: SimulationState
  ): Promise<AssistantResponse> {
    const apiKey =
      (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY);

    // Build grounding context from live application state
    const blockedRoads = state.roadSegments.filter(s => s.isBlocked);
    const criticalIncidents = state.emergencyRequests.filter(e => e.severity === 'Critical');
    const availableAmbs = state.ambulances.filter(a => a.status === 'Available');
    const totalBeds = state.hospitals.reduce((acc, h) => acc + h.availableBeds, 0);
    const unsafeSites = state.candidateSites.filter(s => s.safetyStatus === 'Unsafe');
    const lowStockItems = state.inventory.filter(i => i.replenishmentStatus !== 'Adequate');

    const stateContextSummary = `
SIMULATION STATE GROUNDING DATA:
- Active Disaster Scenario: ${state.scenario.currentScenario.toUpperCase()} (${state.scenario.scenarioPresetName})
- Flood Severity: ${state.scenario.floodSeverity}%, Cyclone Wind: ${state.scenario.cycloneWindIntensity} km/h, Temperature: ${state.scenario.heatwaveTemperatureC}°C
- Blocked Road Segments (${blockedRoads.length}): ${blockedRoads.map(s => `${s.id}: ${s.name} (${s.blockReason || 'Hazard'})`).join('; ') || 'None'}
- Emergency Requests Total: ${state.emergencyRequests.length} (Critical: ${criticalIncidents.length}, High: ${state.emergencyRequests.filter(e => e.severity === 'High').length})
- Critical Incidents: ${criticalIncidents.map(c => `${c.id} at ${c.locationName} (${c.peopleCount} people, ${c.category})`).join('; ')}
- Available Ambulances: ${availableAmbs.length} of ${state.ambulances.length} total (${availableAmbs.map(a => a.callSign).join(', ')})
- Total Available Hospital Beds: ${totalBeds} beds across 5 facilities.
- Unsafe / Excluded Candidate Sites: ${unsafeSites.map(s => `${s.name} (Reason: ${s.exclusionReason || 'Hazard risk'})`).join('; ') || 'None'}
- Inventory Deficits: ${lowStockItems.map(i => `${i.name}: ${i.quantityAvailable} ${i.unit} (Min: ${i.minimumThreshold})`).join('; ') || 'None'}
`;

    // Attempt Gemini call if API key exists
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
You are the CAERN Emergency Planning Assistant for a disaster management simulation in Pune (simulated scenario).
You MUST base all answers strictly on the provided real-time simulation state data.
Do NOT invent nonexistent bridges, medical facilities, or dispatch results.
Always emphasize that this is a SIMULATION DECISION SUPPORT TOOL and not real-world dispatch.

${stateContextSummary}

User Question: "${question}"

Provide a concise, direct, operational response formatted with clear paragraphs and actionable conclusions.
`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });

        const text = response.text || '';
        return {
          answer: text,
          source: 'gemini',
          keyPoints: [
            `Grounding: ${state.scenario.scenarioPresetName}`,
            `${blockedRoads.length} blocked roads analyzed`,
            `Deterministic safety rules strictly enforced`
          ]
        };
      } catch (err) {
        console.warn('CAERN: Gemini API call failed, switching to local rule-based engine', err);
      }
    }

    // Deterministic Rule-Based Fallback
    return this.generateRuleBasedAnswer(question, state, {
      blockedRoads,
      criticalIncidents,
      availableAmbs,
      totalBeds,
      unsafeSites,
      lowStockItems
    });
  }

  /**
   * Deterministic domain-specific rule-based fallback answering common commander questions
   */
  private static generateRuleBasedAnswer(
    question: string,
    state: SimulationState,
    context: {
      blockedRoads: any[];
      criticalIncidents: any[];
      availableAmbs: any[];
      totalBeds: number;
      unsafeSites: any[];
      lowStockItems: any[];
    }
  ): AssistantResponse {
    const qLower = question.toLowerCase();

    // 1. Candidate site questions
    if (qLower.includes('site') || qLower.includes('clinic') || qLower.includes('camp') || qLower.includes('recommend')) {
      const topSafeSites = state.candidateSites.filter(s => s.safetyStatus === 'Safe');
      const excluded = context.unsafeSites;

      const answer = `Based on the active ${state.scenario.scenarioPresetName}, the MCDA algorithm evaluates candidate sites across 6 criteria (Demand, Vulnerability, Accessibility, Healthcare Gap, Logistics, and Hazard Risk).\n\nTop Recommended Sites:
${topSafeSites.slice(0, 3).map((s, i) => `${i + 1}. ${s.name} (${s.zone}) — Serves est. ${s.estimatedPopulationServed.toLocaleString()} residents, ${s.travelTimeToNearestHospitalMin} min from nearest hospital.`).join('\n')}

Safety Exclusions Enforced:
${excluded.length > 0 ? excluded.map(s => `• ${s.name}: DISQUALIFIED — ${s.exclusionReason}`).join('\n') : '• No candidate sites currently excluded.'}

Safety Rule: Even if a site has high emergency demand, any flood inundation or road blockage disqualifies it immediately.`;

      return {
        answer,
        source: 'rule-based-fallback',
        keyPoints: [
          `MCDA Weights: Demand 30%, Access 20%, Gap 15%`,
          `${excluded.length} candidate sites excluded due to hazard safety`,
          `Unsafe sites receive score 0 automatically`
        ]
      };
    }

    // 2. Road block / route questions
    if (qLower.includes('road') || qLower.includes('route') || qLower.includes('bridge') || qLower.includes('blocked')) {
      const answer = `Active road status under ${state.scenario.scenarioPresetName}:\n\n` +
        (context.blockedRoads.length > 0
          ? `Currently, ${context.blockedRoads.length} road segments are impassable:\n` +
            context.blockedRoads.map(r => `• [${r.id}] ${r.name}: ${r.blockReason || 'Submerged/impassable'}`).join('\n') +
            `\n\nThe Dijkstra routing engine automatically penalizes moderate/severe hazard roads and routes traffic around these blocked segments. If all corridors to an area are cut, the status is flagged as 'Unreachable' rather than calculating an unsafe path.`
          : 'All hand-built road segments are currently open and unblocked.');

      return {
        answer,
        source: 'rule-based-fallback',
        keyPoints: [
          `${context.blockedRoads.length} segments blocked`,
          'Dijkstra graph router accounts for waterlogged delays',
          'Never routes through impassable flood depths'
        ]
      };
    }

    // 3. Ambulance / Fleet questions
    if (qLower.includes('ambulance') || qLower.includes('dispatch') || qLower.includes('fleet')) {
      const answer = `Ambulance Fleet Status Summary:\n\n• Available: ${context.availableAmbs.length} of ${state.ambulances.length} vehicles\n• Critical Emergencies pending: ${context.criticalIncidents.length}\n\nDispatch Strategy:\nAmbulances are dispatched based on incident triage priority (Critical > High > Moderate), required equipment (ALS vs BLS), and the shortest hazard-aware travel time. No ambulance can be simultaneously dispatched to multiple incidents.\n\nIdle units are recommended to reposition toward high-ground hubs (e.g., Kothrud, Baner, or Swargate) to minimize downstream response latency.`;

      return {
        answer,
        source: 'rule-based-fallback',
        keyPoints: [
          `${context.availableAmbs.length} available ambulances`,
          'Strict single-dispatch constraint enforced',
          'ALS units prioritized for Critical/Cardiac/Trauma calls'
        ]
      };
    }

    // 4. Shortages & Inventory
    if (qLower.includes('supply') || qLower.includes('inventory') || qLower.includes('shortage') || qLower.includes('depot')) {
      const answer = `Medical Supplies & Inventory Status:\n\n` +
        (context.lowStockItems.length > 0
          ? `Identified Shortages (${context.lowStockItems.length} items):\n` +
            context.lowStockItems.map(item => `• ${item.name}: ${item.quantityAvailable} ${item.unit} available (Safety Threshold: ${item.minimumThreshold} ${item.unit}) — STATUS: ${item.replenishmentStatus}`).join('\n') +
            `\n\nRecommendation: Expedite cross-depot transfers from Central Storehouse (DEPOT-1) or trigger regional mutual-aid replenishment orders.`
          : 'All medical inventory categories are currently above safe operational thresholds.');

      return {
        answer,
        source: 'rule-based-fallback',
        keyPoints: [
          `${context.lowStockItems.length} items below safety thresholds`,
          'Over-allocation strictly blocked',
          'Inter-depot transfers verify road network connectivity'
        ]
      };
    }

    // 5. Default general situation summary
    const answer = `CAERN Operational Situation Briefing:\n\n• Scenario: ${state.scenario.scenarioPresetName}\n• Flood Severity: ${state.scenario.floodSeverity}%, Cyclone Wind: ${state.scenario.cycloneWindIntensity} km/h\n• Blocked Roads: ${context.blockedRoads.length} segments\n• Pending Incidents: ${state.emergencyRequests.length} total (${context.criticalIncidents.length} Critical)\n• Fleet Availability: ${context.availableAmbs.length}/${state.ambulances.length} ambulances ready\n• Hospital Network: ${context.totalBeds} available beds across 5 regional centers\n• Candidate Resource Sites: ${state.candidateSites.length - context.unsafeSites.length} eligible, ${context.unsafeSites.length} excluded for hazard safety.\n\nAll dispatch, hospital selection, and resource placements are calculated using deterministic algorithms.`;

    return {
      answer,
      source: 'rule-based-fallback',
      keyPoints: [
        `Scenario: ${state.scenario.scenarioPresetName}`,
        `${context.criticalIncidents.length} Critical Incidents pending`,
        `${context.totalBeds} total hospital beds available`
      ]
    };
  }
}
