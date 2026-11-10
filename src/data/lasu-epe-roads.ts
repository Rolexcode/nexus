/**
 * First-pass LASU Epe road/path centre-lines digitised from
 * "ID DESIGN TEAM MAP OF LASU EPE.pdf".
 *
 * Coordinates are WGS84 [latitude, longitude] for Leaflet.
 * This is a visual reference network, NOT field-verified routing data.
 */
export type CampusRoad = {
  id: string;
  name: string;
  coordinates: [number, number][];
  referencePixels: [number, number][];
  access: ("walk" | "bicycle" | "tricycle")[];
};

export const lasuEpeRoads: CampusRoad[] = [
  { id: "main-entrance-road", name: "Main Entrance Road", referencePixels: [[650,105],[655,165],[650,220],[625,260],[605,310]], access: ["walk", "bicycle", "tricycle"], coordinates: [
    [6.5944326, 3.9960943], [6.5937672, 3.9961502], [6.5931572, 3.9960943], [6.5927136, 3.9958152], [6.5921591, 3.995592],
  ] },
  { id: "library-road", name: "Library Road", referencePixels: [[120,540],[175,515],[235,470],[300,430],[380,414],[455,410],[520,390],[565,355],[605,310]], access: ["walk", "bicycle", "tricycle"], coordinates: [
    [6.5896083, 3.9901774], [6.5898856, 3.9907914], [6.5903846, 3.9914612], [6.5908283, 3.9921869], [6.5910057, 3.99308], [6.5910501, 3.9939173], [6.5912719, 3.994643], [6.59166, 3.9951454], [6.5921591, 3.995592],
  ] },
  { id: "downhill-road", name: "Downhill Road", referencePixels: [[605,310],[560,365],[605,405],[622,450],[625,520],[625,600],[620,700],[620,800]], access: ["walk", "bicycle", "tricycle"], coordinates: [
    [6.5921591, 3.995592], [6.5915491, 3.9950896], [6.5911055, 3.995592], [6.5906064, 3.9957817], [6.5898301, 3.9958152], [6.5889429, 3.9958152], [6.5878339, 3.9957594], [6.5867249, 3.9957594],
  ] },
  { id: "engineering-road", name: "Engineering Road", referencePixels: [[760,150],[758,215],[760,275],[765,335],[765,405]], access: ["walk", "bicycle", "tricycle"], coordinates: [
    [6.5939335, 3.9973224], [6.5932127, 3.9973001], [6.5925472, 3.9973224], [6.5918818, 3.9973782], [6.5911055, 3.9973782],
  ] },
  { id: "agric-road", name: "Agric Road", referencePixels: [[610,260],[680,260],[755,260],[830,260],[910,260],[1000,260],[1100,260]], access: ["walk", "bicycle", "tricycle"], coordinates: [
    [6.5927136, 3.9956478], [6.5927136, 3.9964293], [6.5927136, 3.9972666], [6.5927136, 3.9981039], [6.5927136, 3.998997], [6.5927136, 4.0000018], [6.5927136, 4.0011182],
  ] },
  { id: "pathway", name: "Pathway", referencePixels: [[620,420],[675,425],[720,410],[760,390]], access: ["walk", "bicycle"], coordinates: [
    [6.5909392, 3.9957594], [6.5908837, 3.9963734], [6.5910501, 3.9968758], [6.5912719, 3.9973224],
  ] },
  { id: "library-shortcut", name: "Library Shortcut", referencePixels: [[250,620],[330,620],[410,630],[480,645],[530,675],[585,710]], access: ["walk", "bicycle"], coordinates: [
    [6.5887211, 3.9916287], [6.5887211, 3.9925218], [6.5886102, 3.993415], [6.5884438, 3.9941964], [6.5881111, 3.9947546], [6.587723, 3.9953687],
  ] },
  { id: "staff-road", name: "Staff Road", referencePixels: [[620,690],[700,690],[780,690],[860,690],[940,690],[1015,690]], access: ["walk", "bicycle", "tricycle"], coordinates: [
    [6.5879448, 3.9957594], [6.5879448, 3.9966525], [6.5879448, 3.9975457], [6.5879448, 3.9984388], [6.5879448, 3.9993319], [6.5879448, 4.0001692],
  ] },
  { id: "pds-road", name: "PDS Road", referencePixels: [[620,800],[680,800],[740,800],[800,800]], access: ["walk", "bicycle", "tricycle"], coordinates: [
    [6.5867249, 3.9957594], [6.5867249, 3.9964293], [6.5867249, 3.9970991], [6.5867249, 3.997769],
  ] },
  { id: "hostel-road", name: "Hostel Road", referencePixels: [[760,800],[835,800],[910,800],[985,800],[1050,800]], access: ["walk", "bicycle", "tricycle"], coordinates: [
    [6.5867249, 3.9973224], [6.5867249, 3.9981597], [6.5867249, 3.998997], [6.5867249, 3.9998343], [6.5867249, 4.00056],
  ] },
  { id: "downtown-road-1", name: "Downtown Road North", referencePixels: [[950,845],[1010,845],[1080,845],[1160,845]], access: ["walk", "bicycle", "tricycle"], coordinates: [
    [6.5862258, 3.9994436], [6.5862258, 4.0001134], [6.5862258, 4.0008949], [6.5862258, 4.001788],
  ] },
  { id: "downtown-road-2", name: "Downtown Road Central", referencePixels: [[950,900],[1020,900],[1090,900],[1160,900]], access: ["walk", "bicycle", "tricycle"], coordinates: [
    [6.5856158, 3.9994436], [6.5856158, 4.0002251], [6.5856158, 4.0010065], [6.5856158, 4.001788],
  ] },
  { id: "downtown-road-3", name: "Downtown Road South", referencePixels: [[950,955],[1020,955],[1090,955],[1160,955]], access: ["walk", "bicycle", "tricycle"], coordinates: [
    [6.5850059, 3.9994436], [6.5850059, 4.0002251], [6.5850059, 4.0010065], [6.5850059, 4.001788],
  ] },
  { id: "army-road", name: "Army Road", referencePixels: [[35,800],[120,800],[210,800],[300,800],[350,835],[360,900],[430,950],[520,990],[600,1025],[700,1040],[820,1040],[950,1040]], access: ["walk", "bicycle", "tricycle"], coordinates: [
    [6.5867249, 3.9892284], [6.5867249, 3.9901774], [6.5867249, 3.9911821], [6.5867249, 3.9921869], [6.5863367, 3.9927451], [6.5856158, 3.9928567], [6.5850613, 3.9936382], [6.5846177, 3.994643], [6.5842295, 3.9955361], [6.5840632, 3.9966525], [6.5840632, 3.9979922], [6.5840632, 3.9994436],
  ] },
];
