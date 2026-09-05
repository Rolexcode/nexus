import type { Place } from "@/lib/data";

const EARTH_RADIUS_METRES = 6_371_000;

function radians(value: number) {
  return value * Math.PI / 180;
}

function degrees(value: number) {
  return value * 180 / Math.PI;
}

function distanceMetres(from: Place["coordinates"], to: Place["coordinates"]) {
  const latitudeDelta = radians(to[0] - from[0]);
  const longitudeDelta = radians(to[1] - from[1]);
  const fromLatitude = radians(from[0]);
  const toLatitude = radians(to[0]);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.sqrt(haversine));
}

function bearing(from: Place["coordinates"], to: Place["coordinates"]) {
  const fromLatitude = radians(from[0]);
  const toLatitude = radians(to[0]);
  const longitudeDelta = radians(to[1] - from[1]);
  const y = Math.sin(longitudeDelta) * Math.cos(toLatitude);
  const x = Math.cos(fromLatitude) * Math.sin(toLatitude)
    - Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(longitudeDelta);
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

function cardinalDirection(value: number) {
  const directions = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  return directions[Math.round(value / 45) % directions.length];
}

export type CampusDirectionPlan = {
  distanceMetres: number;
  walkingMinutes: number;
  direction: string;
  steps: string[];
};

export function buildCampusDirectionPlan(from: Place, to: Place): CampusDirectionPlan {
  const metres = Math.round(distanceMetres(from.coordinates, to.coordinates));

  if (from.id === to.id || metres < 12) {
    return {
      distanceMetres: 0,
      walkingMinutes: 0,
      direction: "here",
      steps: [`You are already at ${to.name}.`],
    };
  }

  const direction = cardinalDirection(bearing(from.coordinates, to.coordinates));
  return {
    distanceMetres: metres,
    walkingMinutes: Math.max(1, Math.ceil(metres / 75)),
    direction,
    steps: [
      `Leave ${from.name} heading ${direction} toward ${to.name}.`,
      `Use ${to.landmark} as your final landmark.`,
      `Arrive at the ${to.name} map pin.`,
    ],
  };
}
