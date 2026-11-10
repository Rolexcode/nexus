import { lasuEpeRoads } from "@/data/lasu-epe-roads";
export type Coordinates = [number, number];
export type CampusRoute = { coordinates: Coordinates[]; distanceMetres: number; roadNames: string[]; steps: string[] };
type Edge = { to: number; distance: number; road: string };
type Node = { point: Coordinates; edges: Edge[] };
const JOIN_METRES = 22;
const MAX_SNAP_METRES = 260;
const distance = (a: Coordinates, b: Coordinates) => {
  const r = (v: number) => v * Math.PI / 180;
  const p1 = r(a[0]), p2 = r(b[0]), dp = r(b[0] - a[0]), dl = r(b[1] - a[1]);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};
const bearing = (a: Coordinates, b: Coordinates) => {
  const r = (v: number) => v * Math.PI / 180;
  const y = Math.sin(r(b[1] - a[1])) * Math.cos(r(b[0]));
  const x = Math.cos(r(a[0])) * Math.sin(r(b[0])) - Math.sin(r(a[0])) * Math.cos(r(b[0])) * Math.cos(r(b[1] - a[1]));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};
function graph() {
  const nodes: Node[] = [];
  const getNode = (point: Coordinates) => {
    const index = nodes.findIndex((node) => distance(node.point, point) <= 2);
    if (index >= 0) return index;
    nodes.push({ point, edges: [] });
    return nodes.length - 1;
  };
  for (const road of lasuEpeRoads) {
    const ids = road.coordinates.map(getNode);
    for (let i = 0; i < ids.length - 1; i += 1) {
      const a = ids[i], b = ids[i + 1];
      if (a === b) continue;
      const metres = distance(nodes[a].point, nodes[b].point);
      nodes[a].edges.push({ to: b, distance: metres, road: road.name });
      nodes[b].edges.push({ to: a, distance: metres, road: road.name });
    }
  }
  for (let a = 0; a < nodes.length; a += 1) for (let b = a + 1; b < nodes.length; b += 1) {
    const metres = distance(nodes[a].point, nodes[b].point);
    if (metres <= JOIN_METRES) {
      nodes[a].edges.push({ to: b, distance: metres, road: "Campus junction" });
      nodes[b].edges.push({ to: a, distance: metres, road: "Campus junction" });
    }
  }
  return nodes;
}
function nearest(nodes: Node[], point: Coordinates) {
  let index = -1, metres = Infinity;
  nodes.forEach((node, i) => { const d = distance(node.point, point); if (d < metres) { index = i; metres = d; } });
  return { index, metres };
}
function turnSteps(points: Coordinates[], roads: string[]) {
  if (points.length < 2) return ["You are already at this destination."];
  const steps = [`Head along ${roads[0] || "the mapped campus path"}.`];
  let previous = roads[0] || "";
  for (let i = 1; i < points.length - 1; i += 1) {
    const road = roads[i] || previous;
    const delta = ((bearing(points[i - 1], points[i + 1]) - bearing(points[i - 1], points[i]) + 540) % 360) - 180;
    if (road && road !== previous && road !== "Campus junction") {
      steps.push(`${Math.abs(delta) < 28 ? "Continue" : delta > 0 ? "Turn right" : "Turn left"} onto ${road}.`);
      previous = road;
    } else if (Math.abs(delta) >= 48) steps.push(`${delta > 0 ? "Bear right" : "Bear left"} at the junction.`);
  }
  steps.push("Continue to your selected destination.");
  return steps;
}
export function findCampusRoute(start: Coordinates, destination: Coordinates): CampusRoute | null {
  const nodes = graph();
  if (!nodes.length) return null;
  const s = nearest(nodes, start), t = nearest(nodes, destination);
  if (s.index < 0 || t.index < 0 || s.metres > MAX_SNAP_METRES || t.metres > MAX_SNAP_METRES) return null;
  const dist = nodes.map(() => Infinity), previous: Array<{ node: number; road: string } | null> = nodes.map(() => null);
  const visited = nodes.map(() => false);
  dist[s.index] = 0;
  for (let count = 0; count < nodes.length; count += 1) {
    let u = -1, best = Infinity;
    for (let i = 0; i < nodes.length; i += 1) if (!visited[i] && dist[i] < best) { u = i; best = dist[i]; }
    if (u < 0 || u === t.index) break;
    visited[u] = true;
    for (const edge of nodes[u].edges) if (dist[u] + edge.distance < dist[edge.to]) {
      dist[edge.to] = dist[u] + edge.distance; previous[edge.to] = { node: u, road: edge.road };
    }
  }
  if (!Number.isFinite(dist[t.index])) return null;
  const ids = [t.index], roads: string[] = [];
  let cursor = t.index;
  while (cursor !== s.index) {
    const step = previous[cursor]; if (!step) return null;
    roads.push(step.road); cursor = step.node; ids.push(cursor);
  }
  ids.reverse(); roads.reverse();
  const network = ids.map((id) => nodes[id].point);
  const routeRoads = [...new Set(roads.filter((road) => road !== "Campus junction"))];
  return {
    coordinates: [start, ...network, destination],
    distanceMetres: Math.round(s.metres + dist[t.index] + t.metres),
    roadNames: routeRoads,
    steps: turnSteps(network, roads),
  };
}
