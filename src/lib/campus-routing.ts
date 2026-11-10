import { lasuEpeRoads } from "@/data/lasu-epe-roads";

export type Coordinates = [number, number];
export type TravelMode = "walk" | "bicycle" | "tricycle";
export type RouteStep = { instruction: string; distanceMetres: number; maneuver: "start" | "continue" | "left" | "right" | "arrive" };
export type CampusRoute = {
  coordinates: Coordinates[];
  distanceMetres: number;
  durationMinutes: number;
  roadNames: string[];
  steps: RouteStep[];
  mode: TravelMode;
  snappedStart: Coordinates;
  snappedDestination: Coordinates;
};
type Edge = { to: number; metres: number; road: string };
type Node = { point: Coordinates; edges: Edge[] };
type Segment = { a: Coordinates; b: Coordinates; road: string };
const EARTH = 6_371_000;
const MAX_SNAP_METRES = 90;
const rad = (n: number) => n * Math.PI / 180;
const distance = (a: Coordinates, b: Coordinates) => {
  const p1 = rad(a[0]), p2 = rad(b[0]), dp = rad(b[0] - a[0]), dl = rad(b[1] - a[1]);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};
const bearing = (a: Coordinates, b: Coordinates) => {
  const p1 = rad(a[0]), p2 = rad(b[0]), dl = rad(b[1] - a[1]);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};
const pointKey = (p: Coordinates) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`;
const pedestrianOnly = (road: string) => /pathway|shortcut/i.test(road);
const allowed = (road: string, mode: TravelMode) => mode !== "tricycle" || !pedestrianOnly(road);
const speed: Record<TravelMode, number> = { walk: 1.25, bicycle: 3.8, tricycle: 5.5 };

function project(point: Coordinates, a: Coordinates, b: Coordinates) {
  const lat = rad(point[0]), sx = Math.cos(lat) * EARTH, sy = EARTH;
  const bx = rad(b[1] - a[1]) * sx, by = rad(b[0] - a[0]) * sy;
  const px = rad(point[1] - a[1]) * sx, py = rad(point[0] - a[0]) * sy;
  const den = bx * bx + by * by;
  const fraction = den ? Math.max(0, Math.min(1, (px * bx + py * by) / den)) : 0;
  const snapped: Coordinates = [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];
  return { point: snapped, metres: distance(point, snapped) };
}
function buildGraph(mode: TravelMode) {
  const nodes: Node[] = [], byKey = new Map<string, number>(), segments: Segment[] = [];
  const getNode = (point: Coordinates) => {
    const key = pointKey(point), old = byKey.get(key);
    if (old !== undefined) return old;
    const id = nodes.length; nodes.push({ point, edges: [] }); byKey.set(key, id); return id;
  };
  const connect = (a: number, b: number, road: string) => {
    const metres = distance(nodes[a].point, nodes[b].point);
    if (metres < 0.5) return;
    nodes[a].edges.push({ to: b, metres, road }); nodes[b].edges.push({ to: a, metres, road });
  };
  for (const road of lasuEpeRoads) {
    if (!allowed(road.name, mode)) continue;
    for (let i = 0; i < road.coordinates.length - 1; i += 1) {
      const a = road.coordinates[i], b = road.coordinates[i + 1];
      if (distance(a, b) < 1) continue;
      segments.push({ a, b, road: road.name });
      connect(getNode(a), getNode(b), road.name);
    }
  }
  return { nodes, segments, getNode, connect };
}
function nearestSegment(point: Coordinates, segments: Segment[]) {
  let best: (Segment & { projection: Coordinates; metres: number }) | null = null;
  for (const segment of segments) {
    const snap = project(point, segment.a, segment.b);
    if (!best || snap.metres < best.metres) best = { ...segment, projection: snap.point, metres: snap.metres };
  }
  return best;
}
function makeSteps(points: Coordinates[], roads: string[]): RouteStep[] {
  if (points.length < 2) return [{ instruction: "You are already at this destination.", distanceMetres: 0, maneuver: "arrive" }];
  const legs: Array<{ metres: number; road: string; from: Coordinates; to: Coordinates }> = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const metres = distance(points[i], points[i + 1]);
    if (metres < 1) continue;
    const road = roads[i] || roads[i - 1] || "mapped campus road";
    const last = legs[legs.length - 1];
    if (last && last.road === road) { last.metres += metres; last.to = points[i + 1]; }
    else legs.push({ metres, road, from: points[i], to: points[i + 1] });
  }
  const steps: RouteStep[] = [];
  let previousBearing: number | null = null;
  legs.forEach((leg, index) => {
    const current = bearing(leg.from, leg.to);
    let maneuver: RouteStep["maneuver"] = index === 0 ? "start" : "continue";
    if (previousBearing !== null) {
      const delta = ((current - previousBearing + 540) % 360) - 180;
      if (Math.abs(delta) >= 35) maneuver = delta > 0 ? "right" : "left";
    }
    const metres = Math.round(leg.metres);
    const distanceLabel = metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${metres} m`;
    const verb = maneuver === "start" ? "Head out" : maneuver === "left" ? "Turn left" : maneuver === "right" ? "Turn right" : "Continue";
    steps.push({ instruction: `${verb} along ${leg.road} for ${distanceLabel}.`, distanceMetres: metres, maneuver });
    previousBearing = current;
  });
  steps.push({ instruction: "You have arrived at your destination.", distanceMetres: 0, maneuver: "arrive" });
  return steps;
}

export function findCampusRoute(start: Coordinates, destination: Coordinates, mode: TravelMode = "walk"): CampusRoute | null {
  const { nodes, segments, getNode, connect } = buildGraph(mode);
  const startSnap = nearestSegment(start, segments), endSnap = nearestSegment(destination, segments);
  if (!startSnap || !endSnap || startSnap.metres > MAX_SNAP_METRES || endSnap.metres > MAX_SNAP_METRES) return null;
  const startA = getNode(startSnap.a), startB = getNode(startSnap.b), source = getNode(startSnap.projection);
  const endA = getNode(endSnap.a), endB = getNode(endSnap.b), target = getNode(endSnap.projection);
  connect(startA, source, startSnap.road); connect(source, startB, startSnap.road);
  connect(endA, target, endSnap.road); connect(target, endB, endSnap.road);

  const dist = nodes.map(() => Infinity), previous: Array<{ node: number; road: string } | null> = nodes.map(() => null);
  const visited = nodes.map(() => false); dist[source] = 0;
  for (let count = 0; count < nodes.length; count += 1) {
    let current = -1, best = Infinity;
    for (let i = 0; i < nodes.length; i += 1) if (!visited[i] && dist[i] < best) { current = i; best = dist[i]; }
    if (current < 0 || current === target) break;
    visited[current] = true;
    for (const edge of nodes[current].edges) if (dist[current] + edge.metres < dist[edge.to]) {
      dist[edge.to] = dist[current] + edge.metres; previous[edge.to] = { node: current, road: edge.road };
    }
  }
  if (!Number.isFinite(dist[target])) return null;
  const ids = [target], roads: string[] = []; let cursor = target;
  while (cursor !== source) {
    const link = previous[cursor]; if (!link) return null;
    roads.push(link.road); cursor = link.node; ids.push(cursor);
  }
  ids.reverse(); roads.reverse();
  const network = ids.map((id) => nodes[id].point);
  const coordinates = [start, startSnap.projection, ...network.slice(1, -1), endSnap.projection, destination];
  const metres = startSnap.metres + dist[target] + endSnap.metres;
  return {
    coordinates, distanceMetres: Math.round(metres),
    durationMinutes: Math.max(1, Math.ceil(metres / speed[mode] / 60)),
    roadNames: [...new Set(roads)],
    steps: makeSteps(network, roads), mode,
    snappedStart: startSnap.projection, snappedDestination: endSnap.projection,
  };
}
