/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ResourceInventoryItem, MedicalSupplyDepot, RoadNode, RoadSegment } from '../types/index.ts';
import { RoutingService } from './routingService.ts';

export interface StockTransferResult {
  success: boolean;
  message: string;
  transferredAmount?: number;
  routeDistanceKm?: number;
  routeTimeMinutes?: number;
}

export interface ReplenishmentRecommendation {
  itemId: string;
  itemName: string;
  depotId: string;
  currentAvailable: number;
  minimumThreshold: number;
  recommendedOrderQuantity: number;
  urgency: 'Low' | 'Medium' | 'Critical';
  reason: string;
}

export class InventoryService {
  /**
   * Allocates quantity to a clinic or camp without exceeding available stock
   */
  public static allocateItem(
    items: ResourceInventoryItem[],
    itemId: string,
    quantityToAllocate: number
  ): { updatedItems: ResourceInventoryItem[]; success: boolean; message: string } {
    if (quantityToAllocate <= 0) {
      return { updatedItems: items, success: false, message: 'Allocation quantity must be greater than zero.' };
    }

    const item = items.find(i => i.id === itemId);
    if (!item) {
      return { updatedItems: items, success: false, message: `Item ${itemId} not found.` };
    }

    if (quantityToAllocate > item.quantityAvailable) {
      return {
        updatedItems: items,
        success: false,
        message: `Cannot allocate ${quantityToAllocate} ${item.unit}. Only ${item.quantityAvailable} ${item.unit} available in depot.`
      };
    }

    const updatedItems = items.map(i => {
      if (i.id === itemId) {
        const newAvailable = i.quantityAvailable - quantityToAllocate;
        const newAllocated = i.quantityAllocated + quantityToAllocate;
        let replenishmentStatus = i.replenishmentStatus;

        if (newAvailable <= 0) replenishmentStatus = 'Critical Shortage';
        else if (newAvailable < i.minimumThreshold) replenishmentStatus = 'Low';
        else replenishmentStatus = 'Adequate';

        return {
          ...i,
          quantityAvailable: newAvailable,
          quantityAllocated: newAllocated,
          replenishmentStatus
        };
      }
      return i;
    });

    return {
      updatedItems,
      success: true,
      message: `Successfully allocated ${quantityToAllocate} ${item.unit} of ${item.name}.`
    };
  }

  /**
   * Simulates disaster consumption of supplies
   */
  public static simulateConsumption(
    items: ResourceInventoryItem[],
    burnRateMultiplier: number = 1.0
  ): ResourceInventoryItem[] {
    return items.map(item => {
      // Consume a portion of allocated supplies or emergency reserves
      const consumption = Math.min(item.quantityAvailable, Math.round((item.quantityAvailable * 0.15) * burnRateMultiplier));
      const newAvailable = Math.max(0, item.quantityAvailable - consumption);
      
      let replenishmentStatus = item.replenishmentStatus;
      if (newAvailable === 0) replenishmentStatus = 'Critical Shortage';
      else if (newAvailable < item.minimumThreshold) replenishmentStatus = 'Low';
      else replenishmentStatus = 'Adequate';

      return {
        ...item,
        quantityAvailable: newAvailable,
        replenishmentStatus
      };
    });
  }

  /**
   * Transfers inventory between depots across accessible road graph routes
   */
  public static transferBetweenDepots(
    items: ResourceInventoryItem[],
    itemId: string,
    fromDepotId: string,
    toDepotId: string,
    amount: number,
    depots: MedicalSupplyDepot[],
    nodes: RoadNode[],
    segments: RoadSegment[]
  ): { updatedItems: ResourceInventoryItem[]; result: StockTransferResult } {
    if (fromDepotId === toDepotId) {
      return { updatedItems: items, result: { success: false, message: 'Source and destination depots cannot be the same.' } };
    }

    const fromDepot = depots.find(d => d.id === fromDepotId);
    const toDepot = depots.find(d => d.id === toDepotId);

    if (!fromDepot || !toDepot) {
      return { updatedItems: items, result: { success: false, message: 'Invalid depot specified.' } };
    }

    // Verify routing connectivity between depots
    const route = RoutingService.calculateRoute(fromDepot.nearestNodeId, toDepot.nearestNodeId, nodes, segments, {
      hazardAware: true
    });

    if (!route.isReachable) {
      return {
        updatedItems: items,
        result: {
          success: false,
          message: `Cannot transfer supplies: Road network between ${fromDepot.name} and ${toDepot.name} is completely severed by flood closures.`
        }
      };
    }

    const sourceItem = items.find(i => i.id === itemId && i.storageDepotId === fromDepotId);
    if (!sourceItem) {
      return { updatedItems: items, result: { success: false, message: `Item ${itemId} not present in source depot.` } };
    }

    if (amount > sourceItem.quantityAvailable) {
      return {
        updatedItems: items,
        result: {
          success: false,
          message: `Transfer quantity (${amount}) exceeds available depot stock (${sourceItem.quantityAvailable} ${sourceItem.unit}).`
        }
      };
    }

    // Deduct from source and add to destination
    const updated = items.map(i => {
      if (i.id === itemId && i.storageDepotId === fromDepotId) {
        const newAvail = i.quantityAvailable - amount;
        return {
          ...i,
          quantityAvailable: newAvail,
          replenishmentStatus: newAvail < i.minimumThreshold ? ('Low' as const) : ('Adequate' as const)
        };
      }
      return i;
    });

    return {
      updatedItems: updated,
      result: {
        success: true,
        message: `Dispatched ${amount} ${sourceItem.unit} from ${fromDepot.name} to ${toDepot.name}. Safe convoy route: ${route.totalDistanceKm} km, ~${route.estimatedTravelTimeMinutes} mins.`,
        transferredAmount: amount,
        routeDistanceKm: route.totalDistanceKm,
        routeTimeMinutes: route.estimatedTravelTimeMinutes
      }
    };
  }

  /**
   * Generates replenishment recommendations for items below thresholds
   */
  public static getReplenishmentRecommendations(items: ResourceInventoryItem[]): ReplenishmentRecommendation[] {
    const list: ReplenishmentRecommendation[] = [];

    for (const item of items) {
      if (item.quantityAvailable < item.minimumThreshold) {
        const deficit = item.minimumThreshold - item.quantityAvailable;
        const reorderQty = deficit + Math.round(item.minimumThreshold * 0.5);
        const isCritical = item.quantityAvailable === 0 || item.quantityAvailable < item.minimumThreshold * 0.3;

        list.push({
          itemId: item.id,
          itemName: item.name,
          depotId: item.storageDepotId,
          currentAvailable: item.quantityAvailable,
          minimumThreshold: item.minimumThreshold,
          recommendedOrderQuantity: reorderQty,
          urgency: isCritical ? 'Critical' : 'Medium',
          reason: `Stock level (${item.quantityAvailable} ${item.unit}) below safe operational safety reserve (${item.minimumThreshold} ${item.unit}). Deficit: ${deficit} ${item.unit}.`
        });
      }
    }

    return list;
  }
}
