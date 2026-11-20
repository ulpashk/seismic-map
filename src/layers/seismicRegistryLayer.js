
const SOURCE_ID = "seismic-registry";
const TILE_URL =
  "https://admin.smartalmaty.kz/api/v1/chs/seismic-registry/tiles/{z}/{x}/{y}.pbf";

// ВАЖНО: нужно подтвердить название слоя внутри PBF
const SOURCE_LAYER = "seismic_registry";


export function updateSeismicRegistryDistricts(map, selectedDistricts = []) {
  const source = map?.getSource("seismic-registry");
  if (!source) return;

  const params = new URLSearchParams();

  // Явно используем реестр из 2321 здания
  params.set("scope", "registry");

  if (selectedDistricts.length > 0) {
    const districtNames = selectedDistricts.map(
      (district) => `${district} район`
    );

    params.set("district", districtNames.join(","));
  }

  const tileUrl = `${TILE_URL}?${params.toString()}`;

  source.setTiles([tileUrl]);

  console.log("🏠 Registry district filter:", selectedDistricts);
}

export function addSeismicRegistryLayer(map) {
  if (!map || !map.isStyleLoaded()) return;

  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "vector",
      tiles: [TILE_URL],
      minzoom: 0,
      maxzoom: 14,
    });
  }

  // Временно отображаем полигоны
  if (!map.getLayer("registry-fill")) {
    map.addLayer({
      id: "registry-fill",
      type: "fill",
      source: SOURCE_ID,
      "source-layer": SOURCE_LAYER,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": "#B51F45",
        "fill-opacity": 0.8,
        "fill-outline-color": "#510015",
      },
    });
  }

    
    if (!map.getLayer("registry-glow")) {
    map.addLayer({
        id: "registry-glow",
        type: "line",
        source: SOURCE_ID,
        "source-layer": SOURCE_LAYER,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
        "line-color": "#E78A9E",
        "line-width": 6,
        "line-opacity": 0.12,
        "line-blur": 4,
        },
    });
    }

  if (!map.getLayer("registry-points")) {
    map.addLayer({
      id: "registry-points",
      type: "circle",
      source: SOURCE_ID,
      "source-layer": SOURCE_LAYER,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": "#8b5cf6",
        "circle-radius": 5,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1,
      },
    });
  }

  // Временно отображаем линии
  if (!map.getLayer("registry-lines")) {
    map.addLayer({
      id: "registry-lines",
      type: "line",
      source: SOURCE_ID,
      "source-layer": SOURCE_LAYER,
      filter: ["==", ["geometry-type"], "LineString"],
      paint: {
        "line-color": "#8b5cf6",
        "line-width": 3,
      },
    });
  }

  [
    "registry-fill",
    "registry-glow",
    "registry-lines",
    "registry-points",
   ].forEach((layerId) => {
        if (map.getLayer(layerId)) {
            map.moveLayer(layerId);
        }
    });

  console.log("✅ Seismic registry layers added");
}
