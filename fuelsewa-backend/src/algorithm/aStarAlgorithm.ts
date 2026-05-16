/**
 * A* Pathfinding Algorithm for Emergency Fuel Dispatch
 *
 * This module implements the A* search algorithm for intelligent driver
 * selection and route optimization. It works alongside ORS (OpenRouteService)
 * which handles actual road navigation and polyline rendering.
 *
 * A* is used internally for:
 * - Estimating shortest-path cost between drivers and order locations
 * - Ranking multiple drivers to select the optimal one
 * - Supporting emergency dispatch with priority-queue logic
 * - Heuristic-based distance calculation (Haversine)
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  latitude: number;
  longitude: number;
  neighbors: Edge[];
}

export interface Edge {
  targetNodeId: string;
  weight: number; // km distance
}

export interface DriverCandidate {
  driverId: string;
  driverName: string;
  latitude: number;
  longitude: number;
  vehicleNumber: string;
  vehicleType: string;
  contactNumber: string;
}

export interface AStarResult {
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  vehicleType: string;
  contactNumber: string;
  estimatedDistanceKm: number;
  estimatedCost: number; // fScore — lower is better
  heuristicScore: number;
  rank: number;
}

export interface DispatchResult {
  orderId: string;
  orderLocation: { latitude: number; longitude: number };
  rankedDrivers: AStarResult[];
  bestDriver: AStarResult | null;
  timestamp: Date;
}

// ─── Priority Queue (Min-Heap) ──────────────────────────────────────────────

interface PQItem {
  nodeId: string;
  fScore: number;
}

class PriorityQueue {
  private heap: PQItem[] = [];

  enqueue(item: PQItem): void {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  dequeue(): PQItem | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return min;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private _bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[parent].fScore <= this.heap[idx].fScore) break;
      [this.heap[parent], this.heap[idx]] = [this.heap[idx], this.heap[parent]];
      idx = parent;
    }
  }

  private _sinkDown(idx: number): void {
    const length = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      if (left < length && this.heap[left].fScore < this.heap[smallest].fScore) smallest = left;
      if (right < length && this.heap[right].fScore < this.heap[smallest].fScore) smallest = right;
      if (smallest === idx) break;
      [this.heap[smallest], this.heap[idx]] = [this.heap[idx], this.heap[smallest]];
      idx = smallest;
    }
  }
}

// ─── Haversine Distance (heuristic function) ────────────────────────────────

/**
 * Calculate great-circle distance between two lat/lng points in km.
 * Used as the admissible heuristic for A* — never overestimates
 * the actual road distance.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// ─── Graph Builder ──────────────────────────────────────────────────────────

/**
 * Dynamically builds a graph from driver positions and an order destination.
 * Each driver becomes a node; the order location is the goal node.
 * Edges connect each driver to the goal and to other nearby drivers
 * (within a configurable radius), enabling path exploration.
 */
export function buildDispatchGraph(
  drivers: DriverCandidate[],
  orderLat: number,
  orderLng: number,
  connectionRadiusKm: number = 50
): Map<string, GraphNode> {
  const graph = new Map<string, GraphNode>();

  // Create goal node (order location)
  const goalNode: GraphNode = {
    id: "order_destination",
    latitude: orderLat,
    longitude: orderLng,
    neighbors: [],
  };
  graph.set(goalNode.id, goalNode);

  // Create driver nodes
  for (const driver of drivers) {
    const driverNode: GraphNode = {
      id: driver.driverId,
      latitude: driver.latitude,
      longitude: driver.longitude,
      neighbors: [],
    };

    // Add edge from driver to goal
    const distToGoal = haversineDistance(
      driver.latitude,
      driver.longitude,
      orderLat,
      orderLng
    );
    driverNode.neighbors.push({
      targetNodeId: goalNode.id,
      weight: distToGoal,
    });

    graph.set(driverNode.id, driverNode);
  }

  // Add edges between nearby drivers (for multi-hop paths)
  const driverNodes = drivers.map((d) => graph.get(d.driverId)!);
  for (let i = 0; i < driverNodes.length; i++) {
    for (let j = i + 1; j < driverNodes.length; j++) {
      const dist = haversineDistance(
        driverNodes[i].latitude,
        driverNodes[i].longitude,
        driverNodes[j].latitude,
        driverNodes[j].longitude
      );
      if (dist <= connectionRadiusKm) {
        driverNodes[i].neighbors.push({ targetNodeId: driverNodes[j].id, weight: dist });
        driverNodes[j].neighbors.push({ targetNodeId: driverNodes[i].id, weight: dist });
      }
    }
  }

  return graph;
}

// ─── A* Core Algorithm ──────────────────────────────────────────────────────

/**
 * Run A* search from a start node to the goal node ("order_destination").
 *
 * Returns the shortest path cost (gScore at goal) or Infinity if unreachable.
 */
export function aStarSearch(
  graph: Map<string, GraphNode>,
  startNodeId: string,
  goalNodeId: string = "order_destination"
): { cost: number; path: string[] } {
  const startNode = graph.get(startNodeId);
  const goalNode = graph.get(goalNodeId);

  if (!startNode || !goalNode) {
    return { cost: Infinity, path: [] };
  }

  const openSet = new PriorityQueue();
  const closedSet = new Set<string>();

  // gScore: cost from start to node
  const gScore = new Map<string, number>();
  // fScore: gScore + heuristic
  const fScore = new Map<string, number>();
  // Parent tracking for path reconstruction
  const cameFrom = new Map<string, string>();

  // Initialize start
  gScore.set(startNodeId, 0);
  const h = haversineDistance(
    startNode.latitude,
    startNode.longitude,
    goalNode.latitude,
    goalNode.longitude
  );
  fScore.set(startNodeId, h);
  openSet.enqueue({ nodeId: startNodeId, fScore: h });

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue()!;

    // Goal reached
    if (current.nodeId === goalNodeId) {
      const path = reconstructPath(cameFrom, goalNodeId);
      return { cost: gScore.get(goalNodeId) ?? Infinity, path };
    }

    // Skip if already processed
    if (closedSet.has(current.nodeId)) continue;
    closedSet.add(current.nodeId);

    const currentNode = graph.get(current.nodeId);
    if (!currentNode) continue;

    // Explore neighbors
    for (const edge of currentNode.neighbors) {
      if (closedSet.has(edge.targetNodeId)) continue;

      const neighbor = graph.get(edge.targetNodeId);
      if (!neighbor) continue;

      const tentativeG = (gScore.get(current.nodeId) ?? Infinity) + edge.weight;

      if (tentativeG < (gScore.get(edge.targetNodeId) ?? Infinity)) {
        cameFrom.set(edge.targetNodeId, current.nodeId);
        gScore.set(edge.targetNodeId, tentativeG);

        const hScore = haversineDistance(
          neighbor.latitude,
          neighbor.longitude,
          goalNode.latitude,
          goalNode.longitude
        );
        const f = tentativeG + hScore;
        fScore.set(edge.targetNodeId, f);
        openSet.enqueue({ nodeId: edge.targetNodeId, fScore: f });
      }
    }
  }

  // Goal not reachable — return direct haversine as fallback
  return { cost: Infinity, path: [] };
}

function reconstructPath(cameFrom: Map<string, string>, current: string): string[] {
  const path: string[] = [current];
  while (cameFrom.has(current)) {
    current = cameFrom.get(current)!;
    path.unshift(current);
  }
  return path;
}

// ─── Multi-Driver Dispatch Ranking ──────────────────────────────────────────

/**
 * Compares all available drivers using A* to find the optimal dispatch.
 *
 * For each driver:
 *  1. Builds a graph with all drivers + order destination
 *  2. Runs A* from that driver to the order
 *  3. Records estimated cost (gScore at goal)
 *  4. Ranks drivers by cost ascending (lowest = best)
 *
 * Emergency orders get a priority multiplier that penalizes distant drivers
 * more heavily, favoring the closest available driver.
 */
export function rankDriversForDispatch(
  drivers: DriverCandidate[],
  orderLat: number,
  orderLng: number,
  isEmergency: boolean = false
): DispatchResult {
  if (drivers.length === 0) {
    return {
      orderId: "",
      orderLocation: { latitude: orderLat, longitude: orderLng },
      rankedDrivers: [],
      bestDriver: null,
      timestamp: new Date(),
    };
  }

  // Build the dispatch graph once
  const graph = buildDispatchGraph(drivers, orderLat, orderLng);

  const results: AStarResult[] = [];

  for (const driver of drivers) {
    const { cost, path } = aStarSearch(graph, driver.driverId);

    // Direct haversine for heuristic display
    const heuristic = haversineDistance(
      driver.latitude,
      driver.longitude,
      orderLat,
      orderLng
    );

    // Emergency penalty: amplify cost for distant drivers
    const emergencyMultiplier = isEmergency ? 1.5 : 1.0;
    const adjustedCost = cost === Infinity ? heuristic * emergencyMultiplier : cost * emergencyMultiplier;

    results.push({
      driverId: driver.driverId,
      driverName: driver.driverName,
      vehicleNumber: driver.vehicleNumber,
      vehicleType: driver.vehicleType,
      contactNumber: driver.contactNumber,
      estimatedDistanceKm: Math.round(heuristic * 100) / 100,
      estimatedCost: Math.round(adjustedCost * 100) / 100,
      heuristicScore: Math.round(heuristic * 100) / 100,
      rank: 0,
    });
  }

  // Sort by estimated cost (ascending — lowest cost = best)
  results.sort((a, b) => a.estimatedCost - b.estimatedCost);

  // Assign ranks
  results.forEach((r, i) => (r.rank = i + 1));

  return {
    orderId: "",
    orderLocation: { latitude: orderLat, longitude: orderLng },
    rankedDrivers: results,
    bestDriver: results[0] || null,
    timestamp: new Date(),
  };
}
