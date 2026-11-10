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
type AtomicSegment = { a: Coordinates; b: Coordinates; from: number; to: number; road: string };
type RawSegment = { a: Coordinates; b: Coordinates; pa: [number, number]; pb: [number, number]; road: string };
type Cut = { t: number; point: Coordinates };
const EARTH = 6_371_000;
const MAX_SNAP_METRES = 85;
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
const speed: Record<TravelMode, number> = { walk: 1.25, bicycle: 3.8, tricycle: 5.5 };

function interpolate(a: Coordinates, b: Coordinates, t: number): Coordinates {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
function project(point: Coordinates, a: Coordinates, b: Coordinates) {
  const lat = rad(point[0]), sx = Math.cos(lat) * EARTH, sy = EARTH;
  const bx = rad(b[1] - a[1]) * sx, by = rad(b[0] - a[0]) * sy;
  const px = rad(point[1] - a[1]) * sx, py = rad(point[0] - a[0]) * sy;
  const den = bx * bx + by * by;
  const t = den ? Math.max(0, Math.min(1, (px * bx + py * by) / den)) : 0;
  const snapped = interpolate(a, b, t);
  return { point: snapped, metres: distance(point, snapped) };
}
function cross(a: [number, number], b: [number, number]) { return a[0] * b[1] - a[1] * b[0]; }
function projectPixel(point: [number, number], a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0], dy = b[1] - a[1], den = dx * dx + dy * dy;
  const t = den ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / den)) : 0;
  const projected: [number, number] = [a[0] + dx * t, a[1] + dy * t];
  return { t, point: projected, pixels: Math.hypot(point[0] - projected[0], point[1] - projected[1]) };
}
function intersection(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
  const r: [number, number] = [b[0] - a[0], b[1] - a[1]];
  const s: [number, number] = [d[0] - c[0], d[1] - c[1]];
  const denominator = cross(r, s);
  const q: [number, number] = [c[0] - a[0], c[1] - a[1]];
  if (Math.abs(denominator) > 1e-8) {
    const t = cross(q, s) / denominator, u = cross(q, r) / denominator;
    if (t >= -1e-6 && t <= 1.000001 && u >= -1e-6 && u <= 1.000001) {
      return { t: Math.max(0, Math.min(1, t)), u: Math.max(0, Math.min(1, u)) };
    }
  }
  const angle = Math.abs(Math.atan2(cross(r, s), r[0] * s[0] + r[1] * s[1]));
  const parallel = Math.min(angle, Math.PI - angle) < rad(25);
  const candidates = [
    { point: a, t: 0, own: "a" }, { point: b, t: 1, own: "a" },
  ];
  for (const item of candidates) {
    const snap = projectPixel(item.point, c, d);
    if (snap.pixels <= (parallel ? 1.5 : 16)) return { t: item.t, u: snap.t };
  }
  for (const item of [{ point: c, t: 0 }, { point: d, t: 1 }]) {
    const snap = projectPixel(item.point, a, b);
    if (snap.pixels <= (parallel ? 1.5 : 16)) return { t: snap.t, u: item.t };
  }
  return null;
}
function buildGraph(mode: TravelMode) {
  const raw: RawSegment[] = [];
  for (const road of lasuEpeRoads) {
    if (!road.access.includes(mode)) continue;
    for (let i = 0; i < road.coordinates.length - 1; i += 1) {
      raw.push({ a: road.coordinates[i], b: road.coordinates[i + 1], pa: road.referencePixels[i], pb: road.referencePixels[i + 1], road: road.name });
    }
  }
  const cuts: Cut[][] = raw.map((segment) => [{ t: 0, point: segment.a }, { t: 1, point: segment.b }]);

  // The source map's pixel control points preserve junction topology even where
  // separately digitised WGS84 lines miss one another by a few metres.
  for (let i = 0; i < raw.length; i += 1) {
    for (let j = i + 1; j < raw.length; j += 1) {
      if (raw[i].road === raw[j].road) continue;
      const hit = intersection(raw[i].pa, raw[i].pb, raw[j].pa, raw[j].pb);
      if (!hit) continue;
      const shared = interpolate(raw[i].a, raw[i].b, hit.t);
      cuts[i].push({ t: hit.t, point: shared });
      cuts[j].push({ t: hit.u, point: shared });
    }
  }

  const nodes: Node[] = [], nodeIds = new Map<string, number>(), segments: AtomicSegment[] = [];
  const getNode = (point: Coordinates) => {
    const key = pointKey(point), old = nodeIds.get(key);
    if (old !== undefined) return old;
    const id = nodes.length; nodes.push({ point, edges: [] }); nodeIds.set(key, id); return id;
  };
  const connect = (from: number, to: number, metres: number, road: string) => {
    if (metres < 0.5) return;
    nodes[from].edges.push({ to, metres, road });
    nodes[to].edges.push({ to: from, metres, road });
  };
  raw.forEach((segment, index) => {
    const sorted = cuts[index].sort((a, b) => a.t - b.t);
    const unique = sorted.filter((cut, i) => i === 0 || Math.abs(cut.t - sorted[i - 1].t) > 1e-6);
    for (let i = 0; i < unique.length - 1; i += 1) {
      const a = unique[i].point, b = unique[i + 1].point;
      const from = getNode(a), to = getNode(b), metres = distance(a, b);
      if (from === to || metres < 0.5) continue;
      connect(from, to, metres, segment.road);
      segments.push({ a, b, from, to, road: segment.road });
    }
  });
  return { nodes, segments };
}
function nearestSegment(point: Coordinates, segments: AtomicSegment[]) {
  let best: (AtomicSegment & { projection: Coordinates; metres: number }) | null = null;
  for (const segment of segments) {
    const snap = project(point, segment.a, segment.b);
    if (!best || snap.metres < best.metres) best = { ...segment, projection: snap.point, metres: snap.metres };
  }
  return best;
}
function makeSteps(points: Coordinates[], roads: string[], startOffset: number, endOffset: number): RouteStep[] {
  const steps: RouteStep[] = [];
  if (startOffset > 3) steps.push({ instruction: `Join the mapped route in approximately ${Math.round(startOffset)} m.`, distanceMetres: Math.round(startOffset), maneuver: "start" });
  const legs: Array<{ metres: number; road: string; from: Coordinates; to: Coordinates }> = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const metres = distance(points[i], points[i + 1]);
    if (metres < 1) continue;
    const road = roads[i] || roads[i - 1] || "mapped campus road";
    const last = legs[legs.length - 1];
    if (last && last.road === road) { last.metres += metres; last.to = points[i + 1]; }
    else legs.push({ metres, road, from: points[i], to: points[i + 1] });
  }
  let previousBearing: number | null = null;
  legs.forEach((leg, index) => {
    const current = bearing(leg.from, leg.to);
    let maneuver: RouteStep["maneuver"] = steps.length === 0 && index === 0 ? "start" : "continue";
    if (previousBearing !== null) {
      const delta = ((current - previousBearing + 540) % 360) - 180;
      if (Math.abs(delta) >= 35) maneuver = delta > 0 ? "right" : "left";
    }
    const metres = Math.round(leg.metres);
    const label = metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${metres} m`;
    const verb = maneuver === "start" ? "Head out" : maneuver === "left" ? "Turn left" : maneuver === "right" ? "Turn right" : "Continue";
    steps.push({ instruction: `${verb} along ${leg.road} for ${label}.`, distanceMetres: metres, maneuver });
    previousBearing = current;
  });
  if (endOffset > 3) steps.push({ instruction: `Follow the final approach for approximately ${Math.round(endOffset)} m to the destination.`, distanceMetres: Math.round(endOffset), maneuver: "continue" });
  steps.push({ instruction: "You have arrived at your destination.", distanceMetres: 0, maneuver: "arrive" });
  return steps;
}

export function findCampusRoute(start: Coordinates, destination: Coordinates, mode: TravelMode = "walk"): CampusRoute | null {
  const { nodes, segments } = buildGraph(mode);
  const startSnap = nearestSegment(start, segments), endSnap = nearestSegment(destination, segments);
  if (!startSnap || !endSnap || startSnap.metres > MAX_SNAP_METRES || endSnap.metres > MAX_SNAP_METRES) return null;
  const source = nodes.length, target = nodes.length + 1;
  nodes.push({ point: startSnap.projection, edges: [] }, { point: endSnap.projection, edges: [] });
  const link = (from: number, to: number, road: string) => {
    const metres = distance(nodes[from].point, nodes[to].point);
    if (metres < 0.5) return;
    nodes[from].edges.push({ to, metres, road }); nodes[to].edges.push({ to: from, metres, road });
  };
  link(source, startSnap.from, startSnap.road); link(source, startSnap.to, startSnap.road);
  link(target, endSnap.from, endSnap.road); link(target, endSnap.to, endSnap.road);
  if (startSnap.from === endSnap.from && startSnap.to === endSnap.to) link(source, target, startSnap.road);

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
    const item = previous[cursor]; if (!item) return null;
    roads.push(item.road); cursor = item.node; ids.push(cursor);
  }
  ids.reverse(); roads.reverse();
  const network = ids.map((id) => nodes[id].point);
  const total = startSnap.metres + dist[target] + endSnap.metres;
  return {
    coordinates: [start, startSnap.projection, ...network.slice(1, -1), endSnap.projection, destination],
    distanceMetres: Math.round(total),
    durationMinutes: Math.max(1, Math.ceil(total / speed[mode] / 60)),
    roadNames: [...new Set(roads)],
    steps: makeSteps(network, roads, startSnap.metres, endSnap.metres),
    mode,
    snappedStart: startSnap.projection,
    snappedDestination: endSnap.projection,
  };
}
