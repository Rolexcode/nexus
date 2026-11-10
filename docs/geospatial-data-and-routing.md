# Nexus geospatial data and routing methodology

## Scope

Nexus is a campus-first map for LASU Epe. The routing stack combines the team's digitised campus reference network with OpenStreetMap-based routing for the approach to the campus entrance. It is not a claim that every campus footpath has been surveyed or that Nexus has Google Maps' live traffic coverage.

## Data used

### Internal LASU Epe paths

- Source reference named in the repository's campus road data: `ID DESIGN TEAM MAP OF LASU EPE.pdf`.
- Current implementation: `src/data/lasu-epe-roads.ts`.
- The file contains 14 first-pass road/path centre-lines with WGS84 latitude/longitude coordinates, access flags, and source-image pixel control points used to preserve junction topology.
- These are digitised reference lines. The source file itself explicitly says they are not field-verified routing data.
- Campus places are held in `src/data/lasu-epe.ts`. Place coordinates and labels should be field-checked before being described as survey-grade.

### External approach roads

- Routing service: FOSSGIS OSRM at `https://routing.openstreetmap.de`.
- Data source: OpenStreetMap contributors.
- Profiles: `routed-foot` for walking, `routed-bike` for bicycle, and `routed-car` for tricycle/road-vehicle approach.
- The API returns road-following GeoJSON geometry, distance, duration and turn steps.
- Nexus uses this external network to route a nearby live GPS position to the LASU Epe Main Gate, then continues along the internal campus network to the selected destination.
- The public FOSSGIS service is community infrastructure, subject to fair-use limits and availability; it is not a dedicated production SLA. It does not provide live traffic.

### Regional GIS reference

A public ArcGIS FeatureServer titled **DIGITAL_MAPPING_GROUP_6__MAP_OF_EPE_WFL1** describes Epe-wide layers including primary roads, buildings, schools, waterways, vegetation and boundaries. Its primary road layer (ID 2) and road layer (ID 12) are attributed to OpenStreetMap. This is useful regional context, but it is not represented as the LASU campus team's original survey and is not silently merged into the internal campus graph.

- Service: https://services8.arcgis.com/oTalEaSXAuyNT7xf/ArcGIS/rest/services/DIGITAL_MAPPING_GROUP_6__MAP_OF_EPE_WFL1/FeatureServer
- Layer catalogue: https://services8.arcgis.com/oTalEaSXAuyNT7xf/ArcGIS/rest/services/DIGITAL_MAPPING_GROUP_6__MAP_OF_EPE_WFL1/FeatureServer/layers

## Coordinate conventions

- Stored campus coordinates are WGS84 decimal degrees in Leaflet order: `[latitude, longitude]`.
- OSRM request coordinates use `longitude,latitude`.
- OSRM GeoJSON coordinates are converted back to Leaflet order before drawing.

## Field-survey upgrade procedure

When the original student GIS archive or a field team becomes available, replace or enrich the provisional campus network using the following process:

1. Import the original vector layers and retain their original coordinate reference system and metadata.
2. Transform to WGS84 for the web map while retaining the source CRS and transformation details in the dataset documentation.
3. Separate walkways, vehicle roads, restricted paths, building footprints, gates and points of interest into distinct feature classes.
4. Preserve topology: split lines at real junctions, connect only where paths physically meet, and record one-way/restricted access where applicable.
5. Add provenance to each feature: source, survey date, method, confidence, and verification status.
6. Field-check the Main Gate, Engineering Hall, Admin Block, library, hostels and key junctions with GPS tracks and photographs.
7. Compare the field tracks with the digitised lines; correct offsets and missing links before enabling turn-by-turn campus instructions.
8. Re-run route tests for walking, bicycle and tricycle and check that no route crosses buildings, fences, waterways or restricted areas.

## User-facing accuracy note

Until the campus paths have been field-verified, Nexus should describe internal routes as provisional mapped campus paths. External road routes are OpenStreetMap-based estimates. Times are estimates, not live-traffic predictions. A missing path or incorrect access classification must be reported and corrected rather than concealed with a straight-line route.
