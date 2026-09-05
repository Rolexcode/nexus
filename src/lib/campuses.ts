export const NEXUS_CAMPUS_ID = "lasu-epe";

export type Campus = {
  id: string;
  name: string;
};

export type Institution = {
  id: string;
  name: string;
  shortName: string;
  campuses: Campus[];
};

export const institutions: Institution[] = [
  {
    id: "lasu",
    name: "Lagos State University",
    shortName: "LASU",
    campuses: [
      { id: "lasu-epe", name: "Epe Campus" },
      { id: "lasu-ojo", name: "Ojo Campus" },
      { id: "lasu-ikeja", name: "Ikeja Campus" },
    ],
  },
  {
    id: "unilag",
    name: "University of Lagos",
    shortName: "UNILAG",
    campuses: [{ id: "unilag-akoka", name: "Akoka Campus" }],
  },
  {
    id: "yabatech",
    name: "Yaba College of Technology",
    shortName: "YABATECH",
    campuses: [{ id: "yabatech-yaba", name: "Yaba Campus" }],
  },
];

export function getInstitution(institutionId: string) {
  return institutions.find((institution) => institution.id === institutionId);
}

export function getCampus(campusId: string) {
  for (const institution of institutions) {
    const campus = institution.campuses.find((item) => item.id === campusId);
    if (campus) return campus;
  }
  return undefined;
}

export function isNexusCampusMember(campusId: string) {
  return campusId === NEXUS_CAMPUS_ID;
}
