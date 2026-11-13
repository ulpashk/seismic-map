
const BUILDING_SOURCE_ID = "building";
const BUILDING_LAYER_ID = "building-fill";

const BUILDING_TILE_URL =
  "https://admin.smartalmaty.kz/api/v1/address/clickhouse/building-risk-tile/{z}/{x}/{y}.pbf";

export function addBuildingRiskLayer(map) {
  if (!map || !map.isStyleLoaded()) return;

  if (!map.getSource(BUILDING_SOURCE_ID)) {
    map.addSource(BUILDING_SOURCE_ID, {
      type: "vector",
      tiles: [BUILDING_TILE_URL],
      minzoom: 0,
      maxzoom: 14,
    });
  }

  if (!map.getLayer(BUILDING_LAYER_ID)) {
    map.addLayer({
      id: BUILDING_LAYER_ID,
      type: "fill",
      source: BUILDING_SOURCE_ID,
      "source-layer": "building_risk",
      paint: {
        "fill-color": ["get", "sri_color"],
        "fill-opacity": 0.8,
      },
    });
  }

  const geoStructureLayers = [
    "fault-fill",
    "struct-lines",
    "struct-points",
  ];

  geoStructureLayers.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.moveLayer(layerId);
    }
  });
}

export function updateBuildingRiskFilter(
  map,
  riskClassFilter,
  selectedDistricts = []
) {
  if (!map || !map.getLayer("building-fill")) return;

  const conditions = [];
  const allowedClasses = [];

  // 1. Фильтр по району
  if (selectedDistricts.length > 0) {
    const districtFilterValues = selectedDistricts.map(
      (district) => `${district} район`
    );

    conditions.push([
      "in",
      ["get", "district"],
      ["literal", districtFilterValues],
    ]);
  }

  // 2. Фильтр по классу риска
  if (riskClassFilter.showHighRisk) {
    allowedClasses.push("D", "E");
  }

  if (riskClassFilter.showLowRisk) {
    allowedClasses.push("A", "B", "C");
  }

  if (allowedClasses.length === 0) {
    conditions.push([
      "==",
      ["get", "sri_class"],
      "__none__",
    ]);
  } else if (allowedClasses.length < 5) {
    conditions.push([
      "in",
      ["get", "sri_class"],
      ["literal", allowedClasses],
    ]);
  }

  map.setFilter(
    "building-fill",
    conditions.length > 0
      ? ["all", ...conditions]
      : null
  );

  console.log("✅ Building filters applied:", {
    districts: selectedDistricts,
    riskClasses: allowedClasses,
  });
}
