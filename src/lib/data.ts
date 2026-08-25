export type PlaceCategory =
  | "Academic"
  | "Administration"
  | "Food & drink"
  | "Health"
  | "Transport"
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

export type Incident = {
  id: string;
  title: string;
  category: IncidentCategory;
  description: string;
  coordinates: [number, number];
  landmark: string;
  reportedAt: string;
  confirmations: number;
  severity: "Low" | "Medium" | "High";
  status: IncidentStatus;
  anonymous: boolean;
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
  "Business & service",
];

export const places: Place[] = [
  {
    id: "engineering-hall",
    name: "New Engineering Hall",
    category: "Academic",
    description:
      "A key academic landmark for engineering students and campus events.",
    services: ["Lecture rooms", "Engineering offices", "Event venue"],
    coordinates: [6.5932792, 3.9956701],
    landmark: "Engineering axis",
    hours: "Mon–Fri · 7:30 AM–6:00 PM",
    dataQuality: "mapped",
    walkMinutes: 4,
  },
  {
    id: "engineering-theatre",
    name: "Engineering Lecture Theatre",
    category: "Academic",
    description:
      "Large lecture and presentation venue used by the Faculty of Engineering.",
    services: ["Lectures", "Seminars", "Student events"],
    coordinates: [6.59376, 3.99615],
    landmark: "Beside New Engineering Hall",
    hours: "Mon–Fri · 8:00 AM–6:00 PM",
    announcement: "Venue schedule should be confirmed with your department.",
    dataQuality: "demo",
    walkMinutes: 5,
  },
  {
    id: "epe-library",
    name: "Epe Campus Library",
    category: "Academic",
    description:
      "Study, reference and information support for students and staff.",
    services: ["Reading space", "Reference desk", "Borrowing"],
    coordinates: [6.59472, 3.9955],
    landmark: "Central academic area",
    hours: "Mon–Fri · 8:00 AM–4:00 PM",
    dataQuality: "demo",
    walkMinutes: 7,
  },
  {
    id: "student-affairs",
    name: "Student Affairs Desk",
    category: "Administration",
    description:
      "First stop for student support, documentation and campus enquiries.",
    services: ["Student support", "Hostel enquiries", "Documentation"],
    coordinates: [6.59433, 3.99502],
    landmark: "Administration block",
    hours: "Mon–Fri · 9:00 AM–4:00 PM",
    dataQuality: "demo",
    walkMinutes: 6,
  },
  {
    id: "medical-centre",
    name: "Campus Medical Centre",
    category: "Health",
    description:
      "Campus health support for routine care and urgent assistance.",
    services: ["First aid", "Consultation", "Emergency support"],
    coordinates: [6.59507, 3.99652],
    landmark: "North-east campus axis",
    hours: "Confirm current service hours",
    dataQuality: "demo",
    walkMinutes: 9,
  },
  {
    id: "campus-cafeteria",
    name: "Campus Cafeteria",
    category: "Food & drink",
    description:
      "Affordable meals and refreshments close to the academic buildings.",
    services: ["Breakfast", "Lunch", "Takeaway"],
    coordinates: [6.59358, 3.99492],
    landmark: "Near the engineering axis",
    hours: "Mon–Sat · 7:00 AM–7:00 PM",
    announcement: "Rice, beans and pasta available today.",
    provider: "Campus Cafeteria",
    dataQuality: "demo",
    walkMinutes: 4,
  },
  {
    id: "press-point",
    name: "Press Point",
    category: "Business & service",
    description:
      "Printing and document support for assignments, forms and project work.",
    services: ["Printing", "Photocopying", "Binding", "Lamination"],
    coordinates: [6.59293, 3.99517],
    landmark: "Close to New Engineering Hall",
    hours: "Mon–Sat · 7:30 AM–7:00 PM",
    phone: "+234 800 000 0000",
    announcement: "Now offering same-day project binding.",
    provider: "Press Point",
    dataQuality: "demo",
    walkMinutes: 3,
  },
  {
    id: "campus-stationery",
    name: "Campus Stationery Store",
    category: "Business & service",
    description:
      "Everyday academic supplies for classes, studios and practical sessions.",
    services: ["Notebooks", "Drawing tools", "Calculators", "Stationery"],
    coordinates: [6.59318, 3.99455],
    landmark: "South academic walkway",
    hours: "Mon–Sat · 8:00 AM–6:30 PM",
    announcement: "New engineering drawing sets are in stock.",
    provider: "Campus Stationery",
    dataQuality: "demo",
    walkMinutes: 3,
  },
  {
    id: "transport-park",
    name: "Campus Transport Point",
    category: "Transport",
    description:
      "Pick-up and drop-off point for campus and Epe-bound transport.",
    services: ["Campus shuttle", "Epe transport", "Pick-up point"],
    coordinates: [6.59217, 3.99492],
    landmark: "Inside the main campus entrance",
    hours: "Daily · 6:30 AM–8:00 PM",
    dataQuality: "demo",
    walkMinutes: 1,
  },
];

export const categoryClass: Record<PlaceCategory, string> = {
  Academic: "academic",
  Administration: "administration",
  "Food & drink": "food",
  Health: "health",
  Transport: "transport",
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
  },
];
