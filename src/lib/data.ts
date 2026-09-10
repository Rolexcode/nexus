export type PlaceCategory =
  | "Academic"
  | "Administration"
  | "Food & drink"
  | "Health"
  | "Transport"
  | "Community"
  | "Business & service";

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  description: string;
  services: string[];
  coordinates: [number, number];
  landmark: string;
  hours: string;
  phone?: string;
  announcement?: string;
  provider?: string;
  dataQuality: "mapped" | "demo";
  walkMinutes: number;
};

export type IncidentCategory =
  | "Infrastructure"
  | "Electrical hazard"
  | "Environment"
  | "Safety"
  | "Water";

export type IncidentStatus = "Reported" | "Verified" | "In progress" | "Resolved";

export type IncidentStatusEvent = {
  status: IncidentStatus;
  at: string;
  by: "student" | "admin";
};

export type AttestationKind = "still-happening" | "saw-it-too" | "looks-resolved";

export type IncidentAttestation = {
  id: string;
  incidentId: string;
  userId: string;
  campusId: string;
  kind: AttestationKind;
  createdAt: string;
};

export type Incident = {
  id: string;
  title: string;
  category: IncidentCategory;
  description: string;
  coordinates: [number, number];
  landmark: string;
  reportedAt: string;
  createdAt?: string;
  confirmations: number;
  severity: "Low" | "Medium" | "High";
  status: IncidentStatus;
  statusHistory?: IncidentStatusEvent[];
  anonymous: boolean;
  campusId: string;
  reportedBy?: string;
  evidenceLabel?: string;
};

export const CAMPUS_CENTER: [number, number] = [6.5942497, 3.9959479];
export const CAMPUS_GATE: [number, number] = [6.59195, 3.99485];

export const categories: Array<"All" | PlaceCategory> = [
  "All",
  "Academic",
  "Administration",
  "Food & drink",
  "Health",
  "Transport",
  "Community",
  "Business & service",
];

export const categoryClass: Record<PlaceCategory, string> = {
  Academic: "academic",
  Administration: "administration",
  "Food & drink": "food",
  Health: "health",
  Transport: "transport",
  Community: "community",
  "Business & service": "business",
};

export const incidentCategories: IncidentCategory[] = [
  "Infrastructure",
  "Electrical hazard",
  "Environment",
  "Safety",
  "Water",
];

export const initialIncidents: Incident[] = [
  {
    id: "incident-burst-pipe",
    title: "Burst pipe beside hostel walkway",
    category: "Water",
    description: "Water is flowing across the footpath and making the surface slippery.",
    coordinates: [6.59482, 3.99494],
    landmark: "Behind the hostel-facing walkway",
    reportedAt: "37 min ago",
    confirmations: 8,
    severity: "High",
    status: "Verified",
    anonymous: true,
    campusId: "lasu-epe",
    evidenceLabel: "1 photo attached",
  },
  {
    id: "incident-streetlight",
    title: "Streetlight not working",
    category: "Electrical hazard",
    description: "The walkway becomes very dark after evening lectures.",
    coordinates: [6.59372, 3.99428],
    landmark: "South walkway near Engineering Hall",
    reportedAt: "2 hr ago",
    confirmations: 5,
    severity: "High",
    status: "In progress",
    anonymous: true,
    campusId: "lasu-epe",
  },
  {
    id: "incident-waste",
    title: "Waste point overflowing",
    category: "Environment",
    description: "The bin is full and waste is spreading toward the food area.",
    coordinates: [6.59348, 3.99502],
    landmark: "Near Campus Cafeteria",
    reportedAt: "4 hr ago",
    confirmations: 3,
    severity: "Medium",
    status: "Reported",
    anonymous: false,
    campusId: "lasu-epe",
    evidenceLabel: "2 photos attached",
  },
  {
    id: "incident-road",
    title: "Damaged section of access road",
    category: "Infrastructure",
    description: "A deep edge is difficult to see at night and affects vehicles entering campus.",
    coordinates: [6.59224, 3.99473],
    landmark: "Inside the main campus entrance",
    reportedAt: "Yesterday",
    confirmations: 11,
    severity: "Medium",
    status: "Verified",
    anonymous: true,
    campusId: "lasu-epe",
  },
  {
    id: "incident-snake",
    title: "Snake sighting near tall grass",
    category: "Safety",
    description: "A snake was seen moving into the overgrown area beside the path.",
    coordinates: [6.59518, 3.99604],
    landmark: "North-east path near the medical axis",
    reportedAt: "Yesterday",
    confirmations: 2,
    severity: "High",
    status: "Resolved",
    anonymous: true,
    campusId: "lasu-epe",
  },
];