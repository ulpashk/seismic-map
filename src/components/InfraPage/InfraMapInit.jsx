"use client";

import { useEffect, useRef, useState } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import SocialIconLayer from "./map-icons/social-icons";
import RepgisIconLayer from "./map-icons/repgis-icons";

const urls = {
  readiness:
    "https://admin.smartalmaty.kz/api/v1/address/clickhouse/infra-readiness/?page_size=10000",
  repgis:
    "https://admin.smartalmaty.kz/api/v1/address/clickhouse/rep-gis-infra/?page_size=10000",
  social:
    "https://admin.smartalmaty.kz/api/v1/address/clickhouse/social-objects/?page_size=10000",
  building:
    "https://admin.smartalmaty.kz/api/v1/address/clickhouse/building-risk-tile/{z}/{x}/{y}.pbf",
  seismicSafety:
    "https://admin.smartalmaty.kz/api/v1/chs/buildings-seismic-safety/?limit=1000",
};

const layerConfigs = {
  readiness: {
    name: "Готовность инфраструктуры",
    description: "MultiPolygon data showing infrastructure readiness",
    color: "#3b82f6", // blue
    type: "geojson",
  },
  repgis: {
    name: "Rep GIS Infrastructure",
    description: "MultiPolygon, MultiLineString and Point data",
    color: "#10b981", // green
    type: "geojson",
  },
  social: {
    name: "Social Objects",
    description: "Point data showing social infrastructure",
    // color: "#f59e0b", // amber
    color: "#f59e0b", // amber
    type: "geojson",
  },
  building: {
    name: "Риск зданий",
    description: "Vector tile of building risks",
    color: "#16a34a", // green
    type: "vector",
    sourceLayer: "building_risk", // must match backend
  },
};

const pointPaintLogic = {
  social: [
    "match",
    ["get", "category"],
    "Школы",
    "#2563eb", // blue
    "ПППН",
    "#16a34a", // green
    "Больницы",
    "#dc2626", // red
    "ДДО",
    "#eab308", // yellow
    /* default */ "#6b7280", // gray
  ],
  readiness: [
    "step",
    ["get", "IRI"],
    "#e0f2fe", // lightest blue (IRI < 0.2)
    0.2,
    "#7dd3fc", // light blue (0.2–0.4)
    0.4,
    "#3b82f6", // medium blue (0.4–0.6)
    0.6,
    "#1d4ed8", // deep blue (0.6–0.8)
    0.8,
    "#111c55ff", // darkest blue (>= 0.8)
  ],

  repgis: {
    polygon: "#c7a07fff", // brownish fill
    line: "#0ea5e9", // sky blue
    point: "#9333ea", // purple
  },
};

const socialLegend = [
  { label: "Школы", key: "Школы", color: "#2563eb", icon: "/icons/school.png" },
  { label: "ПППН", key: "ПППН", color: "#16a34a", icon: "/icons/pppn.png" },
  { label: "Больницы", key: "Больницы", color: "#dc2626", icon: "/icons/health.png" },
  { label: "Детские сады", key: "ДДО", color: "#eab308", icon: "/icons/ddo.png" },
];

const enginLegend = [
  {
    label: "Канализация",
    key: "Канализация",
    color: "#0ea5e9",
    icon: "/icons/sewer.png",
  },
  {
    label: "Электроснабжение",
    key: "Электроснабжение",
    color: "#f97316",
    icon: "/icons/electricity.png",
  },
  {
    label: "ИКТ инфраструктура города",
    key: "ИКТ инфраструктура города",
    color: "#a855f7",
    icon: "/icons/ict.png",
  },
  {
    label: "Теплоснабжение",
    key: "Теплоснабжение",
    color: "#ef4444",
    icon: "/icons/heat.png",
  },
  {
    label: "Газоснабжение",
    key: "Газоснабжение",
    color: "#eab308",
    icon: "/icons/gas.png",
  },
];

const readinessLegend = [
  { label: "IRI < 0.33", color: "#e0f2fe", text: "Низкая готовность" },
  { label: "0.33 – 0.66", color: "#3b82f6", text: "Средняя готовность" },
  { label: "> 0.6", color: "#0c143d", text: "Высокая готовность" },
];

const buildingLegend = [
  { label: "A - Высокая устойчивость, минимальный риск", color: "#038009" },
  { label: "B - Хорошее состояние, устойчиво", color: "#8DE314" },
  { label: "C - Средняя устойчивость", color: "#EDDC26" },
  { label: "D - Повышенный риск, требует проверки", color: "#ED7626" },
  { label: "E - Критически низкая устойчивость", color: "#ED3726" },
];

const icons = {
  school: "icons/school.png",
  health: "icons/health.png",
  pppn: "icons/pppn.png",
  ddo: "icons/ddo.png",
};

export default function InfraMap({
  selectedDistrict,
  enginNodes,
  socialCategories,
  buildingCategories,
  setActiveLayer,
  activeLayer,
  riskClassFilter,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [maplibreLoaded, setMaplibreLoaded] = useState(false);
  const API_KEY = "9zZ4lJvufSPFPoOGi6yZ";
  const overlayRef = useRef(null);

  const buildQuery = () => {
    const params = [];
    if (
      selectedDistrict.length > 0 &&
      !(selectedDistrict.length === 1 && selectedDistrict[0] === "Все районы")
    ) {
      const districts = selectedDistrict
        .filter((d) => d !== "Все районы")
        .map((d) => `${d} район`)
        .join(",");

      params.push(`district=${encodeURIComponent(districts)}`);
    }
    return params.length ? `?${params.join("&")}` : "";
  };

  useEffect(() => {
    // Load MapLibre GL CSS
    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "https://unpkg.com/maplibre-gl@4.0.2/dist/maplibre-gl.css";
    document.head.appendChild(cssLink);

    // Load MapLibre GL JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/maplibre-gl@4.0.2/dist/maplibre-gl.js";
    script.onload = () => setMaplibreLoaded(true);
    script.onerror = () => setError("Failed to load MapLibre GL JS");
    document.head.appendChild(script);

    return () => {
      if (cssLink.parentNode) cssLink.parentNode.removeChild(cssLink);
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  const loadBuildingLayer = () => {
    if (!map.current) return;

    const config = layerConfigs.building;
    console.log("Loading building layer with config:", config);

    if (!map.current.getSource("building")) {
      console.log("Adding building source with URL:", urls.building);
      map.current.addSource("building", {
        type: "vector",
        tiles: [urls.building],
        minzoom: 0,
        maxzoom: 14,
      });
    }

    if (!map.current.getLayer("building-fill")) {
      console.log("Adding building-fill layer");
      map.current.addLayer({
        id: "building-fill",
        type: "fill",
        source: "building",
        "source-layer": config.sourceLayer,
        paint: {
          // Используем sri_color из свойств здания
          "fill-color": ["get", "sri_color"],
          "fill-opacity": 0.8,
          // "fill-outline-color": "#000000",
        },
      });
      console.log("Building layer added successfully");
    } else {
      console.log("Building layer already exists, updating properties");
      // Обновляем цвета слоя, если он уже существует
      map.current.setPaintProperty("building-fill", "fill-color", [
        "get",
        "sri_color",
      ]);
      map.current.setPaintProperty("building-fill", "fill-opacity", 0.8);
      map.current.setPaintProperty(
        "building-fill"
        // "fill-outline-color",
        // "#000000"
      );
      map.current.setLayoutProperty("building-fill", "visibility", "visible");
    }
  };

  useEffect(() => {
    if (!map.current) return;

    const isTrioActive = 
      buildingCategories.seismicSafety ||
      buildingCategories.emergency ||
      buildingCategories.seismic;

    if (!isTrioActive) {
      if (map.current.getLayer("seismic-safety-fill")) {
        map.current.setLayoutProperty(
          "seismic-safety-fill",
          "visibility",
          "none"
        );
      }
      if (map.current.getLayer("seismic-safety-points")) {
        map.current.setLayoutProperty("seismic-safety-points", "visibility", "none");
      }
      return;
    }

    loadSeismicSafetyLayer().then(() => {
      if (map.current.getLayer("seismic-safety-fill")) {
        map.current.setLayoutProperty(
          "seismic-safety-fill",
          "visibility",
          "visible"
        );
      }
      if (map.current.getLayer("seismic-safety-points")) {
        map.current.setLayoutProperty("seismic-safety-points", "visibility", "visible");
      }
    });
  }, [selectedDistrict, buildingCategories]);

  const loadSeismicSafetyLayer = async () => {
    if (!map.current) return;

    let url = urls.seismicSafety;
    const districtQuery = buildQuery();

    let filterType = "all";

    if (buildingCategories.emergency) {
      url += "?category=is_emergency_building";
      filterType = "is_emergency_building";
    } else if (buildingCategories.seismic) {
      url += "?category=seismic_eval";
      filterType = "seismic_eval";
    } else if (buildingCategories.seismicSafety) {
      filterType = "all";
    } else {
      return; 
    }

    if (districtQuery) {
      url += url.includes("?") ? `&${districtQuery.slice(1)}` : districtQuery;
    }

    try {
      // 🔹 Fetch data
      const res = await fetch(url);
      const rawData = await res.json();

      // Check if we got features
      if (!rawData?.results?.length) {
        console.warn("No seismic safety data received");
        if (map.current.getSource("seismic-safety")) {
              map.current.getSource("seismic-safety").setData({ type: "FeatureCollection", features: [] });
        }
        return;
      }

      // 🔹 Convert to GeoJSON
      const geojson = {
        type: "FeatureCollection",
        features: rawData.results
          .filter((item) => item.geometry) // ensure geometry exists
          .map((item) => ({
            type: "Feature",
            geometry: item.geometry,
            properties: item,
          })),
      };

      // 🔹 Determine color based on filter type
      let fillColor = "#0066ff"; // blue
      if (filterType === "is_emergency_building") fillColor = "#ff0000"; // red
      else if (filterType === "seismic_eval") fillColor = "#00cc66"; // green

      // 🔹 Add or update source
      if (!map.current.getSource("seismic-safety")) {
        map.current.addSource("seismic-safety", {
          type: "geojson",
          data: geojson,
        });
      } else {
        map.current.getSource("seismic-safety").setData(geojson);
      }

      // 🔹 Add or update fill layer
      if (!map.current.getLayer("seismic-safety-fill")) {
        map.current.addLayer({
          id: "seismic-safety-fill",
          type: "fill",
          source: "seismic-safety",
          paint: {
            "fill-color": fillColor,
            "fill-opacity": 0.5,
            "fill-outline-color": "#000000",
          },
        });
      } else {
        map.current.setPaintProperty(
          "seismic-safety-fill",
          "fill-color",
          fillColor
        );
      }

      // 🔹 Add or update point layer for visibility
      if (!map.current.getLayer("seismic-safety-points")) {
        map.current.addLayer({
          id: "seismic-safety-points",
          type: "circle",
          source: "seismic-safety",
          paint: {
            "circle-radius": 5,
            "circle-color": fillColor,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1,
          },
        });
      } else {
        map.current.setPaintProperty(
          "seismic-safety-points",
          "circle-color",
          fillColor
        );
      }

      // 🔹 Apply filters
      const filters = ["all"];
      if (filterType === "is_emergency_building") {
        filters.push(["==", ["get", "is_emergency_building"], true]);
      } else if (filterType === "seismic_eval") {
        filters.push(["==", ["get", "seismic_eval"], true]);
      }

      // If "all" → no filters
      map.current.setFilter("seismic-safety-fill", filters.length > 1 ? filters : null);

      // 🔹 Fit map to data bounds
      const maplibregl = window.maplibregl;
      const bounds = new maplibregl.LngLatBounds();
      geojson.features.forEach((f) => {
        if (f.geometry?.type === "Polygon") {
          f.geometry.coordinates[0].forEach((coord) => bounds.extend(coord));
        } else if (f.geometry?.type === "Point") {
          bounds.extend(f.geometry.coordinates);
        }
      });

      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50 });
      }
    } catch (e) {
      console.error("Error loading seismic safety:", e);
    }
  };

  useEffect(() => {
    if (!maplibreLoaded || map.current) return;

    const maplibregl = window.maplibregl;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${API_KEY}`,
      center: [76.9129, 43.222],
      zoom: 13,
      pitch: 45,
      antialias: true,
    });

    // loadLayer("building")
    map.current.on("load", () => {
      console.log("Map loaded");
      loadBuildingLayer();

      // Устанавливаем видимость слоя в зависимости от activeLayer
      if (activeLayer !== "building" && map.current.getLayer("building-fill")) {
        map.current.setLayoutProperty("building-fill", "visibility", "none");
      }

      // Добавляем обработчики для отладки
      map.current.on("sourcedata", (e) => {
        if (e.sourceId === "building" && e.isSourceLoaded) {
          console.log("Building source data loaded");
        }
      });

      map.current.on("error", (e) => {
        console.error("Map error:", e);
      });

      // Добавляем обработчик клика для отладки свойств зданий
      map.current.on("click", "building-fill", (e) => {
        if (e.features && e.features.length > 0) {
          console.log("Building clicked:", e.features[0].properties);
          console.log(
            "Available properties:",
            Object.keys(e.features[0].properties)
          );
        }
      });

      // Добавляем обработчик для изменения курсора
      map.current.on("mouseenter", "building-fill", () => {
        map.current.getCanvas().style.cursor = "pointer";
      });

      map.current.on("mouseleave", "building-fill", () => {
        map.current.getCanvas().style.cursor = "";
      });

      // loadLayer("repgis");
      // loadLayer("social");

      map.current.addSource("openfreemap", {
        url: "https://tiles.openfreemap.org/planet",
        type: "vector",
      });
      overlayRef.current = new MapboxOverlay({ interleaved: true });
      map.current.addControl(overlayRef.current);

      map.current.addLayer({
        id: "3d-buildings",
        source: "openfreemap",
        "source-layer": "building",
        type: "fill-extrusion",
        minzoom: 15,
        filter: ["!=", ["get", "hide_3d"], true],
        paint: {
          "fill-extrusion-color": [
            "interpolate",
            ["linear"],
            ["get", "render_height"],
            0,
            "lightgray",
            200,
            "royalblue",
            400,
            "lightblue",
          ],
          "fill-extrusion-height": [
            "interpolate",
            ["linear"],
            ["zoom"],
            15,
            0,
            16,
            ["get", "render_height"],
          ],
          "fill-extrusion-base": [
            "interpolate",
            ["linear"],
            ["zoom"],
            15,
            0,
            16,
            ["get", "render_min_height"],
          ],
          "fill-extrusion-opacity": 0.9,
        },
      });
      for (const [key, url] of Object.entries(icons)) {
        map.current.loadImage(url, (error, image) => {
          if (error) throw error;
          if (!map.current.hasImage(key)) {
            map.current.addImage(key, image);
          }
        });
      }
    });
  }, [maplibreLoaded, activeLayer]);

  // Управляем видимостью слоя зданий в зависимости от activeLayer
  useEffect(() => {
    if (!map.current) return;

    if (activeLayer === "building") {
      if (map.current.getLayer("building-fill")) {
        map.current.setLayoutProperty("building-fill", "visibility", "visible");
      }
    } else {
      if (map.current.getLayer("building-fill")) {
        map.current.setLayoutProperty("building-fill", "visibility", "none");
      }
    }
  }, [activeLayer]);

  useEffect(() => {
    if (!map.current || !map.current.getLayer("building-fill")) return;

    const filters = ["all"];

    // 🔹 District filter
    if (
      selectedDistrict.length > 0 &&
      !selectedDistrict.includes("Все районы")
    ) {
      const districtFilterValues = selectedDistrict
        .filter((d) => d !== "Все районы")
        .map((d) => `${d} район`);

      filters.push([
        "in",
        ["get", "district"],
        // ["literal", selectedDistrict],
        // ["literal", selectedDistrict.filter(d => d !== "Все районы")],
        ["literal", districtFilterValues],
      ]);
    }

    // 🔹 Highrise filter
    if (buildingCategories.highrise) {
      filters.push(["==", ["get", "is_highrise_in_poly"], true]);
    }

    if (riskClassFilter) {
      const allowedClasses = [];
      if (riskClassFilter.showHighRisk) {
        allowedClasses.push("E", "D");
      }
      if (riskClassFilter.showLowRisk) {
        allowedClasses.push("A", "B", "C");
      }

      if (allowedClasses.length === 0) {
        filters.push(["==", ["get", "sri_class"], "__none__"]);
      }

      else if (allowedClasses.length < 5) {
        filters.push(["in", ["get", "sri_class"], ["literal", allowedClasses]]);
      }
    }

    console.log("Applying Combined Filter:", filters);

    map.current.setFilter("building-fill", filters.length > 1 ? filters : null);
  }, [buildingCategories, selectedDistrict, riskClassFilter, activeLayer]);

  const loadLayer = async (layerKey) => {
    if (!map.current || !window.maplibregl) return;
    const maplibregl = window.maplibregl;

    setLoading(true);
    setError(null);

    try {
      if (map.current.getSource(layerKey)) {
        map.current.removeSource(layerKey);
      }
      if (map.current.getLayer(`${layerKey}-polygons`))
        map.current.removeLayer(`${layerKey}-polygons`);
      if (map.current.getLayer(`${layerKey}-lines`))
        map.current.removeLayer(`${layerKey}-lines`);
      if (map.current.getLayer(`${layerKey}-points`))
        map.current.removeLayer(`${layerKey}-points`);

      const config = layerConfigs[layerKey];

      if (config.type === "geojson") {
        let url = urls[layerKey];

        // 🔹 Apply district filtering for ALL geojson layers
        const districtFilter = buildQuery();
        if (districtFilter) {
          // if url already has query params → append with `&`
          url += url.includes("?")
            ? `&${districtFilter.slice(1)}`
            : districtFilter;
        }

        // если это repgis – строим url с фильтрацией
        // if (layerKey === "repgis") {
        //   url = buildRepgisUrl()
        // }
        // 🔹 Fetch GeoJSON data
        const response = await fetch(url);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        let geoJsonData;
        if (data.features) {
          geoJsonData = data;
        } else if (data.results) {
          geoJsonData = {
            type: "FeatureCollection",
            features: data.results.map((item) => ({
              type: "Feature",
              geometry: item.geometry || item.geom,
              properties: item.properties || item,
            })),
          };
        } else {
          throw new Error("Invalid data format");
        }

        map.current.addSource(layerKey, { type: "geojson", data: geoJsonData });

        // polygons
        map.current.addLayer({
          id: `${layerKey}-polygons`,
          type: "fill",
          source: layerKey,
          filter: [
            "in",
            ["geometry-type"],
            ["literal", ["Polygon", "MultiPolygon"]],
          ],
          paint: {
            // "fill-color": config.color,
            "fill-color":
              layerKey === "repgis"
                ? pointPaintLogic.repgis.polygon
                : pointPaintLogic[layerKey] || config.color,
            "fill-opacity": 0.6,
            "fill-outline-color": "#000000",
          },
        });

        // lines
        map.current.addLayer({
          id: `${layerKey}-lines`,
          type: "line",
          source: layerKey,
          filter: [
            "in",
            ["geometry-type"],
            ["literal", ["LineString", "MultiLineString"]],
          ],
          paint: {
            "line-color":
              layerKey === "repgis"
                ? pointPaintLogic.repgis.line
                : pointPaintLogic[layerKey] || config.color,
            "line-width": 2,
            "line-opacity": 0.8,
          },
        });

        // points
        map.current.addLayer({
          id: `${layerKey}-points`,
          type: "circle",
          source: layerKey,
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-color":
              layerKey === "repgis"
                ? pointPaintLogic.repgis.point
                : pointPaintLogic[layerKey] || config.color,
            "circle-radius": 4,
            "circle-opacity": 0.8,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
          // "building-fill"
        });

        // fit bounds
        if (geoJsonData.features.length > 0) {
          const bounds = new maplibregl.LngLatBounds();
          geoJsonData.features.forEach((feature) => {
            if (feature.geometry.type === "Point") {
              bounds.extend(feature.geometry.coordinates);
            } else if (feature.geometry.type === "MultiPolygon") {
              feature.geometry.coordinates.forEach((polygon) => {
                polygon.forEach((ring) => {
                  ring.forEach((coord) => bounds.extend(coord));
                });
              });
            } else if (feature.geometry.type === "Polygon") {
              feature.geometry.coordinates.forEach((ring) => {
                ring.forEach((coord) => bounds.extend(coord));
              });
            } else if (feature.geometry.type === "LineString") {
              feature.geometry.coordinates.forEach((coord) =>
                bounds.extend(coord)
              );
            } else if (feature.geometry.type === "MultiLineString") {
              feature.geometry.coordinates.forEach((line) => {
                line.forEach((coord) => bounds.extend(coord));
              });
            }
          });
          map.current.fitBounds(bounds, { padding: 50 });
        }
      }

      if (config.type === "vector") {
        // 🔹 Add vector tile source
        map.current.addSource(layerKey, {
          type: "vector",
          tiles: [urls[layerKey]],
          minzoom: 0,
          maxzoom: 14,
        });

        map.current.addLayer({
          id: `${layerKey}-fill`,
          type: "fill",
          source: layerKey,
          "source-layer": config.sourceLayer,
          paint: {
            "fill-color": ["get", "config.color"],
            "fill-opacity": 0.5,
          },
        });
      }
    } catch (err) {
      console.error("Error loading layer:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!overlayRef.current || !map.current) return;

    const updateLayers = async () => {
      // 1. Fetch and prepare Social Data (This part is correct)
      const socialData = await (async () => {
        if (!window.cachedData?.social) {
          const res = await fetch(urls.social);
          const data = await res.json();
          window.cachedData = window.cachedData || {};
          window.cachedData.social = data.features
            ? data
            : {
                type: "FeatureCollection",
                features: (data.results || []).map((item) => ({
                  type: "Feature",
                  geometry: item.geometry,
                  properties: item,
                })),
              };
        }
        return window.cachedData.social;
      })();

      const selectedSocial = Object.entries(socialCategories)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key);

      const filteredSocialFeatures = selectedSocial.length
        ? socialData.features.filter((f) =>
            selectedSocial.includes(f.properties.category)
          )
        : [];

      const socialLayer = new SocialIconLayer({
        id: "social-layer",
        data: filteredSocialFeatures,
      });

      // 2. Fetch and prepare RepGIS Data (This section is now corrected)
      const repgisData = await (async () => {
        if (!window.cachedData?.repgis_full) {
          const res = await fetch(urls.repgis);
          const data = await res.json();
          window.cachedData = window.cachedData || {};
          window.cachedData.repgis_full = data.features
            ? data
            : {
                type: "FeatureCollection",
                features: (data.results || []).map((item) => ({
                  type: "Feature",
                  geometry: item.geometry,
                  properties: item,
                })),
              };
        }
        return window.cachedData.repgis_full;
      })();

      const selectedRepgis = Object.entries(enginNodes)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);

      let mergedRepgisFeatures = [];

      if (selectedRepgis.length > 0) {
        const filteredMainFeatures = repgisData.features.filter((f) =>
          selectedRepgis.includes(f.properties.cat_name)
        );

        const markerPoints = filteredMainFeatures
          .filter((f) => f.properties.marker_geojson)
          .map((f) => {
            let markerGeom = f.properties.marker_geojson;
            if (typeof markerGeom === "string") {
              try {
                markerGeom = JSON.parse(markerGeom);
              } catch (e) {
                console.warn(
                  "Invalid marker_geojson for feature:",
                  f.properties.id
                );
                return null;
              }
            }
            if (!markerGeom || markerGeom.type !== "Point") return null;
            return {
              type: "Feature",
              geometry: markerGeom,
              properties: f.properties,
            };
          })
          .filter(Boolean); // Remove any nulls
        // <<< END: RESTORED MARKER_GEOJSON LOGIC

        // Combine main polygons/lines with their extracted marker points
        mergedRepgisFeatures = [...filteredMainFeatures, ...markerPoints];
      }

      const repgisLayer = new RepgisIconLayer({
        id: "repgis-layer",
        data: mergedRepgisFeatures, // Use the fully processed data
      });

      // 3. Set both layers at the same time
      overlayRef.current.setProps({ layers: [socialLayer, repgisLayer] });
    };

    updateLayers();
  }, [socialCategories, enginNodes]);

  const handleLayerSwitch = (layerKey) => {
    setActiveLayer(layerKey);

    if (!map.current) return;

    if (layerKey === "building") {
      // Hide readiness if exists
      ["readiness-polygons", "readiness-lines", "readiness-points"].forEach(
        (id) => {
          if (map.current.getLayer(id))
            map.current.setLayoutProperty(id, "visibility", "none");
        }
      );

      // Show building
      loadBuildingLayer();
    } else if (layerKey === "readiness") {
      // Hide building
      if (map.current.getLayer("building-fill")) {
        map.current.setLayoutProperty("building-fill", "visibility", "none");
      }

      // Show readiness
      if (map.current.getLayer("readiness-polygons")) {
        // Already loaded → just show it
        ["readiness-polygons", "readiness-lines", "readiness-points"].forEach(
          (id) => {
            if (map.current.getLayer(id))
              map.current.setLayoutProperty(id, "visibility", "visible");
          }
        );
      } else {
        // Not loaded yet → load it
        loadLayer("readiness").then(() => {
          ["readiness-polygons", "readiness-lines", "readiness-points"].forEach(
            (id) => {
              if (map.current.getLayer(id))
                map.current.setLayoutProperty(id, "visibility", "visible");
            }
          );
        });
      }
    }
  };

  return (
    <div className="relative w-full h-full rounded-lg shadow-md overflow-hidden">
      {/* Layer Switcher */}
      <div className="absolute top-20 right-2 sm:right-4 md:right-auto md:left-1/2 md:-translate-x-1/2 z-20 flex flex-col md:flex-row items-end md:items-center transition-all duration-300">
        <div className="flex flex-col md:flex-row gap-1.5 md:gap-2">
          {["building", "readiness"].map((key) => {
            const config = layerConfigs[key];
            const isActive = activeLayer === key;
            return (
              <button
                key={key}
                disabled={loading}
                onClick={() => handleLayerSwitch(key)}
                className={`
                  px-2 py-1.5 rounded-md text-[10px] font-medium transition-all shadow-md border
                  flex items-center justify-center min-w-[140px] md:min-w-0 text-center
                  md:px-4 md:py-2 md:text-xs
                  
                  ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20"
                      : "bg-white/90 backdrop-blur-sm text-gray-700 border-gray-200 hover:bg-white"
                  }
                  ${loading ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                {config.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {activeLayer === "building" && (
        <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 md:bottom-8 z-10 p-2 md:p-3 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-xl transition-all duration-300 max-w-[160px] sm:max-w-none">
          <ul className="space-y-0.5 md:space-y-1">
            {buildingLegend.map((item) => (
              <li key={item.label} className="flex items-center space-x-1.5 md:space-x-2">
                {/* Квадратик цвета: уменьшается с 4x4 до 3x3 */}
                <span
                  className="w-3 h-3 md:w-4 md:h-4 rounded-sm flex-shrink-0 transition-all"
                  style={{ backgroundColor: item.color }}
                />
                {/* Текст: уменьшается с 12px (text-xs) до 9px */}
                <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-700 leading-tight">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeLayer === "readiness" && (
        <div className="absolute bottom-8 right-4 p-3 bg-gray-50 rounded-md border">
          <ul className="space-y-1">
            {readinessLegend.map((item) => (
              <li key={item.label} className="flex items-center space-x-2">
                <span
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-700 font-medium">
                  {item.text}
                </span>
                <span className="text-xs text-gray-500">({item.label})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(Object.values(enginNodes).some(Boolean) ||
        Object.values(socialCategories).some(Boolean)) && (
        <div className="absolute bottom-8 z-40 left-[350px] p-3 bg-gray-50 rounded-md border shadow-md">
          {/* Engineering (RepGIS) Legend Section */}
          {Object.values(enginNodes).some(Boolean) && (
            <ul className="space-y-1">
              {enginLegend
                .filter((item) => enginNodes[item.key])
                .map((item) => (
                  <li key={item.label} className="flex items-center space-x-2">
                    <div
                      className="flex items-center justify-center rounded-full border"
                      style={{
                        borderColor: item.color,
                        backgroundColor: "white",
                        width: "24px",
                        height: "24px",
                      }}
                    >
                      <img
                        src={item.icon}
                        alt={item.label}
                        className="w-4 h-4 object-contain"
                      />
                    </div>
                    <span className="text-xs text-gray-700">{item.label}</span>
                  </li>
                ))}
            </ul>
          )}

          {/* Divider: Shows only if both legends are active */}
          {Object.values(enginNodes).some(Boolean) &&
            Object.values(socialCategories).some(Boolean) && (
              <hr className="my-2 border-gray-200" />
            )}

          {/* Social Legend Section */}
          {Object.values(socialCategories).some(Boolean) && (
            <ul className="space-y-1">
              {socialLegend
                .filter((item) => socialCategories[item.key])
                .map((item) => (
                  <li key={item.label} className="flex items-center space-x-2">
                    <div
                      className="flex items-center justify-center rounded-full border"
                      style={{
                        borderColor: item.color,
                        backgroundColor: "white",
                        width: "24px",
                        height: "24px",
                      }}
                    >
                      <img
                        src={item.icon}
                        alt={item.label}
                        className="w-4 h-4 object-contain"
                      />
                    </div>
                    <span className="text-xs text-gray-700">{item.label}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
