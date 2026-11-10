import { NextRequest, NextResponse } from "next/server";

type Mode = "walk" | "bicycle" | "tricycle";
type Coordinates = [number, number];

const GATE: Coordinates = [6.5921591, 3.995592];
const EARTH_METRES = 6_371_000;

function distanceMetres(a: Coordinates, b: Coordinates) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const lat1 = rad(a[0]);
  const lat2 = rad(b[0]);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_METRES * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function instructionFor(step: any): { instruction: string; distanceMetres: number; maneuver: "start" | "continue" | "left" | "right" | "arrive" } {
  const type = String(step?.maneuver?.type ?? "continue");
  const modifier = String(step?.maneuver?.modifier ?? "");
  const name = typeof step?.name === "string" && step.name.trim() ? step.name.trim() : "the road";
  const metres = Math.max(0, Math.round(Number(step?.distance) || 0));
  const distanceLabel = metres >= 1000
    ? `${(metres / 1000).toFixed(1)} km`
    : `${Math.max(1, Math.round(metres / 5) * 5)} m`;

  if (type === "arrive") {
    return { instruction: "Arrive at the campus entrance.", distanceMetres: 0, maneuver: "arrive" };
  }

  if (type === "depart") {
    return { instruction: `Head out along ${name} for ${distanceLabel}.`, distanceMetres: metres, maneuver: "start" };
  }

  if (type === "roundabout" || type === "rotary") {
    const exit = Number(step?.maneuver?.exit);
    const exitText = Number.isFinite(exit) ? ` and take exit ${exit}` : "";
    return { instruction: `Enter the roundabout${exitText} onto ${name}.`, distanceMetres: metres, maneuver: "continue" };
  }

  const turn = modifier.includes("left") ? "left" : modifier.includes("right") ? "right" : null;
  if (turn) {
    return { instruction: `Turn ${turn} onto ${name} and continue for ${distanceLabel}.`, distanceMetres: metres, maneuver: turn };
  }

  return { instruction: `Continue along ${name} for ${distanceLabel}.`, distanceMetres: metres, maneuver: "continue" };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const mode = params.get("mode") as Mode | null;

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "A valid GPS starting point is required." }, { status: 400 });
  }
  if (mode !== "walk" && mode !== "bicycle" && mode !== "tricycle") {
    return NextResponse.json({ error: "Unsupported travel mode." }, { status: 400 });
  }

  const start: Coordinates = [lat, lng];
  const distanceToCampus = distanceMetres(start, GATE);
  if (distanceToCampus > 35_000) {
    return NextResponse.json({ error: "Your current location is too far from LASU Epe for campus directions." }, { status: 422 });
  }

  const profile = mode === "walk" ? "foot" : mode === "bicycle" ? "bike" : "car";
  const coordinates = `${lng},${lat};${GATE[1]},${GATE[0]}`;
  const url = `https://routing.openstreetmap.de/routed-${profile}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "NexusCampus/1.0 (LASU Epe campus navigation)" },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 0 },
    });
    if (!response.ok) {
      return NextResponse.json({ error: "The external road router is temporarily unavailable." }, { status: 502 });
    }

    const data = await response.json();
    const route = data?.routes?.[0];
    const geometry = route?.geometry?.coordinates;
    if (data?.code !== "Ok" || !Array.isArray(geometry) || geometry.length < 2) {
      return NextResponse.json({ error: "No connected public-road route to the campus entrance was found." }, { status: 422 });
    }

    const steps = (route.legs ?? [])
      .flatMap((leg: any) => leg.steps ?? [])
      .map(instructionFor)
      .filter((step: ReturnType<typeof instructionFor>) => step.distanceMetres > 0 || step.maneuver === "arrive");

    return NextResponse.json({
      coordinates: geometry.map((point: number[]) => [point[1], point[0]] as Coordinates),
      distanceMetres: Math.round(Number(route.distance) || 0),
      durationMinutes: Math.max(1, Math.ceil((Number(route.duration) || 0) / 60)),
      roadNames: [...new Set((route.legs ?? []).flatMap((leg: any) => (leg.steps ?? []).map((step: any) => step.name).filter(Boolean)))],
      steps,
      source: "OpenStreetMap road network via FOSSGIS OSRM",
      profile,
    }, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch {
    return NextResponse.json({ error: "Live directions could not be reached. Please try again." }, { status: 503 });
  }
}
