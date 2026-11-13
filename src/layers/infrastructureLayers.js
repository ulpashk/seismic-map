import SocialIconLayer from "./social-icons";
import RepgisIconLayer from "./repgis-icons";

const URLS = {
  social:
    "https://admin.smartalmaty.kz/api/v1/address/clickhouse/social-objects/?page_size=10000",

  repgis:
    "https://admin.smartalmaty.kz/api/v1/address/clickhouse/rep-gis-infra/?page_size=10000",
};

const pendingRequests = new Map();
const updateVersions = new WeakMap();

function normalizeGeoJSON(data) {
  if (Array.isArray(data.features)) {
    return data;
  }

  return {
    type: "FeatureCollection",
    features: (data.results || []).map((item) => ({
      type: "Feature",
      geometry: item.geometry || item.geom,
      properties: item.properties || item,
    })),
  };
}

async function getCachedData(cacheKey, url) {
  window.cachedData = window.cachedData || {};

  if (window.cachedData[cacheKey]) {
    return window.cachedData[cacheKey];
  }

  if (!pendingRequests.has(cacheKey)) {
    const request = (async () => {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to load ${cacheKey}: HTTP ${response.status}`
        );
      }

      const data = await response.json();
      const geojson = normalizeGeoJSON(data);

      window.cachedData[cacheKey] = geojson;

      return geojson;
    })();

    pendingRequests.set(cacheKey, request);
  }

  try {
    return await pendingRequests.get(cacheKey);
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

async function createSocialLayer(socialCategories) {
  const selectedCategories = Object.entries(
    socialCategories || {}
  )
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  if (selectedCategories.length === 0) {
    return new SocialIconLayer({
      id: "social-layer",
      data: [],
    });
  }

  const socialData = await getCachedData(
    "social",
    URLS.social
  );

  const filteredFeatures = socialData.features.filter(
    (feature) =>
      selectedCategories.includes(
        feature.properties?.category
      )
  );

  return new SocialIconLayer({
    id: "social-layer",
    data: filteredFeatures,
  });
}

function createMarkerPoint(feature) {
  let markerGeom = feature.properties?.marker_geojson;

  if (!markerGeom) return null;

  if (typeof markerGeom === "string") {
    try {
      markerGeom = JSON.parse(markerGeom);
    } catch (error) {
      console.warn(
        "Invalid marker_geojson:",
        feature.properties?.id,
        error
      );
      return null;
    }
  }

  if (!markerGeom || markerGeom.type !== "Point") {
    return null;
  }

  return {
    type: "Feature",
    geometry: markerGeom,
    properties: feature.properties,
  };
}

async function createRepgisLayer(enginNodes) {
  const selectedCategories = Object.entries(
    enginNodes || {}
  )
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  if (selectedCategories.length === 0) {
    return new RepgisIconLayer({
      id: "repgis-layer",
      data: [],
    });
  }

  const repgisData = await getCachedData(
    "repgis_full",
    URLS.repgis
  );

  const filteredFeatures = repgisData.features.filter(
    (feature) =>
      selectedCategories.includes(
        feature.properties?.cat_name
      )
  );

  const markerPoints = filteredFeatures
    .filter((feature) => feature.properties?.marker_geojson)
    .map(createMarkerPoint)
    .filter(Boolean);

  const mergedFeatures = [
    ...filteredFeatures,
    ...markerPoints,
  ];

  return new RepgisIconLayer({
    id: "repgis-layer",
    data: mergedFeatures,
  });
}

export async function createInfrastructureLayers(
  socialCategories,
  enginNodes
) {
  const [socialLayer, repgisLayer] = await Promise.all([
    createSocialLayer(socialCategories),
    createRepgisLayer(enginNodes),
  ]);

  return [socialLayer, repgisLayer];
}

export async function updateInfrastructureLayers(
  overlay,
  socialCategories,
  enginNodes
) {
  if (!overlay) return;

  const version = (updateVersions.get(overlay) || 0) + 1;
  updateVersions.set(overlay, version);

  const infrastructureLayers =
    await createInfrastructureLayers(
      socialCategories,
      enginNodes
    );

  if (updateVersions.get(overlay) !== version) {
    return;
  }

  overlay.setProps({
    layers: infrastructureLayers,
  });

  console.log(
    "Infrastructure layers updated:",
    infrastructureLayers.map((layer) => layer.id)
  );
}
