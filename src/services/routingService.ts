/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RoadNode, RoadSegment, RouteResult, Coordinates } from '../types/index.ts';

interface GraphEdge {
  segmentId: string;
  fromNodeId: string;
  toNodeId: string;
  distanceKm: number;
  baseTravelTimeMin: number;
  isBlocked: boolean;
  hazardExposure: string;
  roadCondition: string;
}

export class RoutingService {
  /**
   * Builds an undirected graph representation from the road segments
   */
  private static buildAdjacencyList(segments: RoadSegment[]): Map<string, GraphEdge[]> {
    const adj = new Map<string, GraphEdge[]>();

    for (const seg of segments) {
      const edgeForward: GraphEdge = {
        segmentId: seg.id,
        fromNodeId: seg.fromNodeId,
        toNodeId: seg.toNodeId,
        distanceKm: seg.distanceKm,
        baseTravelTimeMin: seg.normalTravelTimeMinutes,
        isBlocked: seg.isBlocked,
        hazardExposure: seg.hazardExposure,
        roadCondition: seg.roadCondition
      };

      const edgeBackward: GraphEdge = {
        segmentId: seg.id,
        fromNodeId: seg.toNodeId,
        toNodeId: seg.fromNodeId,
        distanceKm: seg.distanceKm,
        baseTravelTimeMin: seg.normalTravelTimeMinutes,
        isBlocked: seg.isBlocked,
        hazardExposure: seg.hazardExposure,
        roadCondition: seg.roadCondition
      };

      if (!adj.has(seg.fromNodeId)) adj.set(seg.fromNodeId, []);
      if (!adj.has(seg.toNodeId)) adj.set(seg.toNodeId, []);

      adj.get(seg.fromNodeId)!.push(edgeForward);
      adj.get(seg.toNodeId)!.push(edgeBackward);
    }

    return adj;
  }

  /**
   * Calculates the edge traversal cost in minutes
   */
  private static calculateEdgeCost(
    edge: GraphEdge,
    hazardAware: boolean,
    penalizedSegmentIds: Set<string> = new Set()
  ): number | null {
    // Blocked segments cannot be traversed
    if (edge.isBlocked) {
      return null;
    }

    let cost = edge.baseTravelTimeMin;

    if (hazardAware) {
      // Penalize hazardous roads to encourage safe routing
      switch (edge.hazardExposure) {
        case 'Moderate':
          cost *= 1.35; // +35% delay due to caution/slowdown
          break;
        case 'Severe':
          cost *= 2.5; // +150% delay
          break;
        case 'Critical':
          cost *= 5.0; // severe penalty; avoid if any alternative exists
          break;
        default:
          break;
      }

      if (edge.roadCondition === 'Waterlogged') cost += 4;
      if (edge.roadCondition === 'Debris-strewn') cost += 6;
      if (edge.roadCondition === 'Flooded') cost += 20;
    }

    // Additional penalty if requested for finding alternative paths
    if (penalizedSegmentIds.has(edge.segmentId)) {
      cost += 50; // heavily penalize to force diverse path
    }

    return cost;
  }

  /**
   * Dijkstra shortest-path algorithm
   */
  public static calculateRoute(
    fromNodeId: string,
    toNodeId: string,
    nodes: RoadNode[],
    segments: RoadSegment[],
    options: {
      hazardAware?: boolean;
      penalizedSegmentIds?: Set<string>;
    } = {}
  ): RouteResult {
    const hazardAware = options.hazardAware ?? true;
    const penalizedSegmentIds = options.penalizedSegmentIds ?? new Set<string>();

    const nodeMap = new Map<string, RoadNode>(nodes.map(n => [n.id, n]));
    if (!nodeMap.has(fromNodeId) || !nodeMap.has(toNodeId)) {
      return {
        pathNodeIds: [],
        pathCoordinates: [],
        totalDistanceKm: 0,
        estimatedTravelTimeMinutes: 0,
        traversedSegmentIds: [],
        isHazardAware: hazardAware,
        hazardSegmentsCount: 0,
        isReachable: false,
        failureReason: `Origin node (${fromNodeId}) or destination node (${toNodeId}) does not exist in network.`
      };
    }

    if (fromNodeId === toNodeId) {
      const coord = { lat: nodeMap.get(fromNodeId)!.lat, lng: nodeMap.get(fromNodeId)!.lng };
      return {
        pathNodeIds: [fromNodeId],
        pathCoordinates: [coord],
        totalDistanceKm: 0,
        estimatedTravelTimeMinutes: 0,
        traversedSegmentIds: [],
        isHazardAware: hazardAware,
        hazardSegmentsCount: 0,
        isReachable: true
      };
    }

    const adj = this.buildAdjacencyList(segments);
    const distances = new Map<string, number>();
    const previousNode = new Map<string, string>();
    const previousSegment = new Map<string, string>();
    const visited = new Set<string>();

    for (const node of nodes) {
      distances.set(node.id, Infinity);
    }
    distances.set(fromNodeId, 0);

    // Simple priority queue using array sorting
    const unvisitedNodes = new Set<string>(nodes.map(n => n.id));

    while (unvisitedNodes.size > 0) {
      // Find unvisited node with minimum distance
      let current: string | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisitedNodes) {
        const dist = distances.get(nodeId) ?? Infinity;
        if (dist < minDistance) {
          minDistance = dist;
          current = nodeId;
        }
      }

      if (current === null || minDistance === Infinity) {
        // Remaining unvisited nodes are unreachable
        break;
      }

      if (current === toNodeId) {
        // Reached destination!
        break;
      }

      unvisitedNodes.delete(current);
      visited.add(current);

      const edges = adj.get(current) || [];
      for (const edge of edges) {
        if (visited.has(edge.toNodeId)) continue;

        const edgeCost = this.calculateEdgeCost(edge, hazardAware, penalizedSegmentIds);
        if (edgeCost === null) continue; // blocked

        const newDist = (distances.get(current) ?? 0) + edgeCost;
        if (newDist < (distances.get(edge.toNodeId) ?? Infinity)) {
          distances.set(edge.toNodeId, newDist);
          previousNode.set(edge.toNodeId, current);
          previousSegment.set(edge.toNodeId, edge.segmentId);
        }
      }
    }

    // Reconstruct path
    if (!previousNode.has(toNodeId)) {
      return {
        pathNodeIds: [],
        pathCoordinates: [],
        totalDistanceKm: 0,
        estimatedTravelTimeMinutes: 0,
        traversedSegmentIds: [],
        isHazardAware: hazardAware,
        hazardSegmentsCount: 0,
        isReachable: false,
        failureReason: `No open, unblocked route exists between ${fromNodeId} and ${toNodeId}. Critical road segments are inundated or severed.`
      };
    }

    const pathNodeIds: string[] = [];
    const traversedSegmentIds: string[] = [];
    let curr: string | undefined = toNodeId;

    while (curr) {
      pathNodeIds.unshift(curr);
      const segId = previousSegment.get(curr);
      if (segId) {
        traversedSegmentIds.unshift(segId);
      }
      curr = previousNode.get(curr);
    }

    // Calculate actual real-world distance and travel time from segments
    const segmentMap = new Map<string, RoadSegment>(segments.map(s => [s.id, s]));
    let totalDistanceKm = 0;
    let actualTravelTimeMinutes = 0;
    let hazardSegmentsCount = 0;

    for (const segId of traversedSegmentIds) {
      const seg = segmentMap.get(segId);
      if (seg) {
        totalDistanceKm += seg.distanceKm;
        let time = seg.normalTravelTimeMinutes;
        if (hazardAware) {
          if (seg.hazardExposure === 'Moderate') time *= 1.35;
          if (seg.hazardExposure === 'Severe') time *= 2.5;
          if (seg.hazardExposure === 'Critical') time *= 4.0;
        }
        actualTravelTimeMinutes += time;
        if (seg.hazardExposure !== 'None') {
          hazardSegmentsCount++;
        }
      }
    }

    const pathCoordinates = pathNodeIds.map(nid => {
      const node = nodeMap.get(nid)!;
      return { lat: node.lat, lng: node.lng };
    });

    return {
      pathNodeIds,
      pathCoordinates,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      estimatedTravelTimeMinutes: Math.round(actualTravelTimeMinutes * 10) / 10,
      traversedSegmentIds,
      isHazardAware: hazardAware,
      hazardSegmentsCount,
      isReachable: true
    };
  }

  /**
   * Finds both a primary hazard-aware route and an alternative route
   */
  public static calculateRouteWithAlternative(
    fromNodeId: string,
    toNodeId: string,
    nodes: RoadNode[],
    segments: RoadSegment[]
  ): { primaryRoute: RouteResult; alternativeRoute: RouteResult | null; baselineRoute: RouteResult } {
    // 1. Primary hazard-aware safe route
    const primaryRoute = this.calculateRoute(fromNodeId, toNodeId, nodes, segments, { hazardAware: true });

    // 2. Baseline route (ignoring hazard penalties, just avoiding blocked roads)
    const baselineRoute = this.calculateRoute(fromNodeId, toNodeId, nodes, segments, { hazardAware: false });

    // 3. Alternative route (penalize the segments in the primary route to find a 2nd best route)
    let alternativeRoute: RouteResult | null = null;
    if (primaryRoute.isReachable && primaryRoute.traversedSegmentIds.length > 0) {
      const penalized = new Set<string>(primaryRoute.traversedSegmentIds);
      const alt = this.calculateRoute(fromNodeId, toNodeId, nodes, segments, {
        hazardAware: true,
        penalizedSegmentIds: penalized
      });

      // Only count as true alternative if reachable and has some distinct segments
      if (alt.isReachable && alt.pathNodeIds.join('-') !== primaryRoute.pathNodeIds.join('-')) {
        alternativeRoute = alt;
      }
    }

    return { primaryRoute, alternativeRoute, baselineRoute };
  }

  /**
   * Helper to find the closest road node to any lat/lng coordinate
   */
  public static findNearestNode(coord: Coordinates, nodes: RoadNode[]): RoadNode {
    let bestNode = nodes[0];
    let minDistanceSq = Infinity;

    for (const node of nodes) {
      const dLat = node.lat - coord.lat;
      const dLng = node.lng - coord.lng;
      const distSq = dLat * dLat + dLng * dLng;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        bestNode = node;
      }
    }

    return bestNode;
  }
}
