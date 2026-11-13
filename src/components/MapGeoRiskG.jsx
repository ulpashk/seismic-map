import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import MapLegend from "./MapLegend";

export default function GeoRiskMapDashboard({
  districtCoordinates,
  riskLabelMap,
  filters,
  onMapReady,
  enginNodes,
  socialCategories,
  riskClassFilter,
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const lastGeoRiskTileUrlRef = useRef(null);
  const isFirstRender = useRef(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geoStructsLoaded, setGeoStructsLoaded] = useState(false);

  const [geoData, setGeoData] = useState(null);
  const [mapStyle] = useState("basic");

  const PBF_BASE_URL =
    "https://admin.smartalmaty.kz/api/v1/address/postgis/geo-risk-tile/{z}/{x}/{y}.pbf";

  const buildDistrictQuery = useCallback(() => {
    if (filters.districts.length > 0) {
      const districtList = filters.districts.map((d) => `${d} район`).join(",");
      return `?district=${encodeURIComponent(districtList)}`;
    }
    return "";
  }, [filters.districts]);

  const [, setStats] = useState({
    totalAreas: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
  });

  const buildQuery = useCallback(() => {
    const params = [];

    if (filters.districts.length > 0) {
      const districtList = filters.districts.map((d) => `${d} район`).join(",");
      params.push(`district=${encodeURIComponent(districtList)}`);
    }

    return params.length
      ? `?${params.join("&")}&page_size=5000`
      : "?page_size=5000";
  }, [filters.districts]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = buildQuery();
        const cacheKey = `geostructures_${query}`;
        const cacheTimestampKey = `${cacheKey}_timestamp`;
        const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

        const cachedData = localStorage.getItem(cacheKey);
        const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
        const now = Date.now();

        if (cachedData && cachedTimestamp) {
          const age = now - parseInt(cachedTimestamp);
          if (age < CACHE_DURATION) {
            console.log(
              "✅ Loading geostructures from cache (age:",
              Math.round(age / 1000),
              "seconds)"
            );
            const data = JSON.parse(cachedData);

            if (data?.features) {
              const normalized = data.features
                .filter((f) =>
                  [
                    "Point",
                    "LineString",
                    "MultiLineString",
                    "Polygon",
                    "MultiPolygon",
                  ].includes(f.geometry?.type)
                )
                .map((f) => {
                  const raw = f.properties?.category?.toLowerCase?.() || "";
                  if (raw.includes("ополз")) f.properties.category = "оползни";
                  else if (raw.includes("разлом"))
                    f.properties.category = "разломы";
                  else if (raw.includes("сель")) f.properties.category = "сель";
                  return f;
                });

              setGeoData({ ...data, features: normalized });

              const high = normalized.filter(
                (f) => f.properties?.GRI_class === "высокий"
              ).length;
              const medium = normalized.filter(
                (f) => f.properties?.GRI_class === "средний"
              ).length;
              const low = normalized.filter(
                (f) => f.properties?.GRI_class === "низкий"
              ).length;

              setStats({
                totalAreas: normalized.length,
                highRisk: high,
                mediumRisk: medium,
                lowRisk: low,
              });

              console.log(
                "💾 Loaded",
                normalized.length,
                "features from cache"
              );
              return; 
            }
          } else {
            console.log(
              "⏰ Cache expired (age:",
              Math.round(age / 1000),
              "seconds), fetching fresh data"
            );
          }
        }

        console.log("🔄 Fetching fresh geostructures data from API...");
        const res = await fetch(
          `https://admin.smartalmaty.kz/api/v1/address/clickhouse/geostructures${query}`
        );

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log("📦 Raw geostructures response:", data);

        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
          localStorage.setItem(cacheTimestampKey, now.toString());
          console.log("💾 Cached geostructures data for future use");
        } catch (e) {
          console.warn("⚠️ Failed to cache data (localStorage full?):", e);
        }

        if (data?.features) {
          const normalized = data.features
            .filter((f) =>
              [
                "Point",
                "LineString",
                "MultiLineString",
                "Polygon",
                "MultiPolygon",
              ].includes(f.geometry?.type)
            )
            .map((f) => {
              const raw = f.properties?.category?.toLowerCase?.() || "";
              if (raw.includes("ополз")) f.properties.category = "оползни";
              else if (raw.includes("разлом"))
                f.properties.category = "разломы";
              else if (raw.includes("сель")) f.properties.category = "сель";
              return f;
            });

          const categoryCounts = normalized.reduce((acc, f) => {
            const cat = f.properties?.category || "unknown";
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
          }, {});
          const geometryTypes = normalized.reduce((acc, f) => {
            const type = f.geometry?.type || "unknown";
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {});
          console.log(
            "✅ Loaded geostructures:",
            normalized.length,
            "features"
          );
          console.log("📊 Categories:", categoryCounts);
          console.log("📐 Geometry types:", geometryTypes);

          setGeoData({ ...data, features: normalized });
          console.log("💾 geoData state updated");

          const high = normalized.filter(
            (f) => f.properties?.GRI_class === "высокий"
          ).length;
          const medium = normalized.filter(
            (f) => f.properties?.GRI_class === "средний"
          ).length;
          const low = normalized.filter(
            (f) => f.properties?.GRI_class === "низкий"
          ).length;

          setStats({
            totalAreas: normalized.length,
            highRisk: high,
            mediumRisk: medium,
            lowRisk: low,
          });
        } else {
          console.warn("⚠️ No features found in geostructures response");
          setGeoData({ type: "FeatureCollection", features: [] });
        }
      } catch (err) {
        console.error("❌ Failed to fetch geostructures data:", err);
        setGeoData({ type: "FeatureCollection", features: [] });
      }
    };

    fetchData();
  }, [buildQuery]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const API_KEY = "9zZ4lJvufSPFPoOGi6yZ";

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${API_KEY}`,
      center: [76.906, 43.198],
      zoom: 13,
      pitch: 45,
      bearing: 0,
      antialias: true,
    });

    mapRef.current = map;
    overlayRef.current = new MapboxOverlay({ interleaved: true, layers: [] });

    map.on("load", () => {
      console.log("🗺️ Map loaded event fired");
      setMapLoaded(true);
      map.addControl(overlayRef.current);
      onMapReady?.(map, overlayRef.current);
      console.log(
        "✅ Map initialized, waiting for geostructures to load first"
      );
    });

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.warn("Error removing map:", e);
        }
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    if (isFirstRender.current) {
      console.log("⏭️ Skipping initial style change");
      isFirstRender.current = false;
      return;
    }

    console.log("🎨 Changing map style to:", mapStyle);

    setGeoStructsLoaded(false);

    geoRiskLayerCreatedRef.current = false;

    const API_KEY = "9zZ4lJvufSPFPoOGi6yZ";
    const styleUrls = {
      basic: `https://api.maptiler.com/maps/basic-v2/style.json?key=${API_KEY}`,
      streets: `https://api.maptiler.com/maps/streets-v2/style.json?key=${API_KEY}`,
      satellite: `https://api.maptiler.com/maps/hybrid/style.json?key=${API_KEY}`,
    };

    mapRef.current.setStyle(styleUrls[mapStyle]);

    console.log(
      "🔄 Style changed, layers will be recreated automatically in correct order"
    );
  }, [mapStyle, mapLoaded]);

  const addGeoStructLayers = useCallback(
    (map) => {
      console.log(
        "🏗️ addGeoStructLayers called, styleLoaded:",
        map.isStyleLoaded()
      );
      // if (!map.isStyleLoaded()) {
      //   console.log("❌ Style not loaded, cannot add layers");
      //   return false;
      // }

      let hasSource = false;
      try {
        hasSource = !!(map.getSource && map.getSource("geoStruct"));
      } catch (e) {
        console.warn("Error checking source:", e);
      }
      console.log("📦 Source check:", { hasSource });

      if (!hasSource) {
        try {
          console.log("➕ Adding geoStruct source");
          map.addSource("geoStruct", {
            type: "geojson",
            data: geoData || { type: "FeatureCollection", features: [] },
          });
        } catch (e) {
          console.warn("Error adding source:", e);
          return false;
        }
      }

      let hasFaultFill = false;
      try {
        hasFaultFill = !!(map.getLayer && map.getLayer("fault-fill"));
      } catch (e) {
        console.warn("Error checking fault-fill layer:", e);
      }
      console.log("🔍 Checking fault-fill layer:", hasFaultFill);

      if (!hasFaultFill) {
        try {
          console.log("➕ Adding fault-fill layer");
          map.addLayer({
            id: "fault-fill",
            type: "fill",
            source: "geoStruct",
            filter: [
              "all",
              [
                "in",
                ["geometry-type"],
                ["literal", ["Polygon", "MultiPolygon"]],
              ],
              ["==", ["get", "category"], "разломы"],
            ],
            paint: {
              "fill-color": "#ff6b35",
              "fill-opacity": 0.5,
            },
          });
        } catch (e) {
          console.warn("Error adding fault-fill layer:", e);
        }
      }

      let hasStructLines = false;
      try {
        hasStructLines = !!(map.getLayer && map.getLayer("struct-lines"));
      } catch (e) {
        console.warn("Error checking struct-lines layer:", e);
      }
      console.log("🔍 Checking struct-lines layer:", hasStructLines);

      if (!hasStructLines) {
        try {
          console.log("➕ Adding struct-lines layer");
          map.addLayer({
            id: "struct-lines",
            type: "line",
            source: "geoStruct",
            filter: [
              "in",
              ["geometry-type"],
              ["literal", ["LineString", "MultiLineString"]],
            ],
            paint: {
              "line-color": [
                "match",
                ["get", "category"],
                "сель",
                "#00b4d8",
                "разломы",
                "#ff6b35",
                "оползни",
                "#ffa500",
                "#888",
              ],
              "line-width": 3,
              "line-opacity": 0.8,
            },
          });
        } catch (e) {
          console.warn("Error adding struct-lines layer:", e);
        }
      }

      let hasStructPoints = false;
      try {
        hasStructPoints = !!(map.getLayer && map.getLayer("struct-points"));
      } catch (e) {
        console.warn("Error checking struct-points layer:", e);
      }
      console.log("🔍 Checking struct-points layer:", hasStructPoints);

      if (!hasStructPoints) {
        try {
          console.log("➕ Adding struct-points layer");
          map.addLayer({
            id: "struct-points",
            type: "circle",
            source: "geoStruct",
            filter: ["==", ["geometry-type"], "Point"],
            paint: {
              "circle-radius": 8,
              "circle-color": "#ffa500",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#fff",
              "circle-opacity": 0.85,
            },
          });
        } catch (e) {
          console.warn("Error adding struct-points layer:", e);
        }
      }

      console.log("🎨 GeoStruct layers added/verified");
      return true;
    },
    [geoData]
  );

  useEffect(() => {
    console.log("🔍 GeoStruct effect triggered", {
      hasMap: !!mapRef.current,
      hasData: !!geoData,
      mapLoaded,
      featureCount: geoData?.features?.length,
    });

    if (!mapRef.current || !geoData || !mapLoaded) {
      console.log("⏸️ Skipping - waiting for:", {
        map: !mapRef.current,
        data: !geoData,
        loaded: !mapLoaded,
      });
      return;
    }

    const map = mapRef.current;

    
    const updateData = () => {
      if (!map.getStyle()) return;
      const layersCreated = addGeoStructLayers(map);

      let src = null;
      try {
        src = map.getSource && map.getSource("geoStruct");
      } catch (e) {
        console.warn("Error getting geoStruct source:", e);
      }

      if (src) {
        console.log(
          "🗺️ Updating geoStruct data, features:",
          geoData.features?.length
        );
        try {
          src.setData(geoData);
        } catch (e) {
          console.warn("Error setting data on source:", e);
          return;
        }

        ["fault-fill", "struct-lines", "struct-points"].forEach((layerId) => {
          try {
            if (map.getLayer && map.getLayer(layerId)) {
              const visibility = map.getLayoutProperty(layerId, "visibility");
              console.log(`  Layer ${layerId}: ${visibility || "visible"}`);
            } else {
              console.log(`  Layer ${layerId}: NOT FOUND`);
            }
          } catch (e) {
            console.log(`  Layer ${layerId}: ERROR checking - ${e.message}`);
          }
        });

        setGeoStructsLoaded(true);

        if (layersCreated) {
          console.log("🔄 Layers just created, triggering filter update...");
          setTimeout(() => {
            const visibilityEvent = new CustomEvent("layers-ready");
            window.dispatchEvent(visibilityEvent);
          }, 100);
        }

        console.log("✅ GeoStructs loaded, tiles will now be added on top");
      } else {
        console.log("❌ geoStruct source not found!");
      }
    };

    const timeoutId = setTimeout(updateData, 50);

    return () => clearTimeout(timeoutId);
  }, [geoData, mapLoaded, addGeoStructLayers]);

  const geoRiskLayerCreatedRef = useRef(false);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) {
      return;
    }

    if (geoRiskLayerCreatedRef.current) {
      return;
    }

    geoRiskLayerCreatedRef.current = true;
    console.log("🗺️ Creating geo risk layer with PBF tiles...");

    const map = mapRef.current;

    const addGeoRiskLayer = () => {

      const startTime = performance.now();

      try {
        if (map.getLayer && map.getLayer("geoRisk-fill")) {
          map.removeLayer("geoRisk-fill");
        }
        if (map.getSource && map.getSource("geoRisk")) {
          map.removeSource("geoRisk");
        }
      } catch (e) {
        console.warn("Error during cleanup:", e);
      }

      const tileUrl = `${PBF_BASE_URL}${buildDistrictQuery()}`;
      console.log("🗺️ PBF Tile URL:", tileUrl);

      map.addSource("geoRisk", {
        type: "vector",
        tiles: [tileUrl],
        minzoom: 0,
        maxzoom: 14,
      });
      lastGeoRiskTileUrlRef.current = tileUrl;

      const firstGeoStructLayer = map.getLayer("fault-fill")
        ? "fault-fill"
        : map.getLayer("struct-lines")
        ? "struct-lines"
        : map.getLayer("struct-points")
        ? "struct-points"
        : map.getLayer("building-fill")
        ? "building-fill"
        : undefined;

      map.addLayer(
        {
          id: "geoRisk-fill",
          type: "fill",
          source: "geoRisk",
          "source-layer": "geo_risk",
          paint: {
            "fill-color": [
              "case",
              ["has", "color_GRI"],
              ["get", "color_GRI"],
              "#33a456",
            ],
            "fill-opacity": 0.6,
          },
        },
        firstGeoStructLayer
      );

      map.on("click", "geoRisk-fill", (e) => {
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          // Debug: log all properties to find correct field names
          console.log("🏠 Clicked feature properties:", props);
          console.log("🏠 All property keys:", Object.keys(props));

          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(
              `
              <div style="padding: 8px;">
                <h3 style="margin: 0 0 8px 0; font-weight: bold;">Геориск</h3>
                <p style="margin: 4px 0;"><strong>Класс риска:</strong> ${
                  props.GRI_class || "N/A"
                }</p>
                <p style="margin: 4px 0;"><strong>Район:</strong> ${
                  props.district || "N/A"
                }</p>
              </div>
            `
            )
            .addTo(map);
        }
      });

      map.on("mouseenter", "geoRisk-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "geoRisk-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      const endTime = performance.now();
      console.log(
        `✅ Geo risk PBF layer added in ${(endTime - startTime).toFixed(2)}ms`
      );
    };

    addGeoRiskLayer();
  }, [mapLoaded, geoStructsLoaded, PBF_BASE_URL, buildDistrictQuery]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !geoRiskLayerCreatedRef.current)
      return;

    const map = mapRef.current;
    const src = map.getSource("geoRisk");


console.log("🔍 GeoRisk diagnostics:", {
  selectedDistricts: filters.districts,
  sourceExists: !!src,
  tileUrls: src?.tiles,
  layerExists: !!map.getLayer("geoRisk-fill"),
  visibility: map.getLayer("geoRisk-fill")
    ? map.getLayoutProperty("geoRisk-fill", "visibility")
    : "layer missing",
  filter: map.getLayer("geoRisk-fill")
    ? map.getFilter("geoRisk-fill")
    : null,
});


    if (!src) {
      console.log("⚠️ geoRisk source not found for tile update");
      return;
    }

    const newTileUrl = `${PBF_BASE_URL}${buildDistrictQuery()}`;
    
      
  if (lastGeoRiskTileUrlRef.current === newTileUrl) {
    console.log("⏭️ GeoRisk tile URL unchanged, skipping update");
    return;
  }

  lastGeoRiskTileUrlRef.current = newTileUrl;

  console.log("🔄 Updating GeoRisk PBF:", newTileUrl);

  try {
    src.setTiles([newTileUrl]);
  } catch (error) {
    lastGeoRiskTileUrlRef.current = null;
    console.error("Failed to update GeoRisk tiles:", error);
  }

  }, [filters.districts, mapLoaded, PBF_BASE_URL, buildDistrictQuery]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const applyFilter = () => {
      if (!map.getLayer("geoRisk-fill")) return;

      const selectedRisks = Object.entries(filters.riskLevels)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => riskLabelMap[key]);

      if (selectedRisks.length === 0) {
        map.setLayoutProperty("geoRisk-fill", "visibility", "none");
      } else {
        map.setLayoutProperty("geoRisk-fill", "visibility", "visible");
        
        map.setFilter("geoRisk-fill", [
          "in",
          ["get", "GRI_class"],
          ["literal", selectedRisks]
        ]);
      }
      console.log("✅ Applied GRI_class filter:", selectedRisks);
    };

    applyFilter();

    map.on('sourcedata', applyFilter);
    return () => map.off('sourcedata', applyFilter);

  }, [filters.riskLevels, filters.districts, mapLoaded, riskLabelMap]); 

  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !geoData) return;
    const map = mapRef.current;

    const updateVisibility = () => {
      console.log(
        "🔧 updateVisibility called, styleLoaded:",
        map.isStyleLoaded()
      );

      let hasStructLines, hasStructPoints, hasFaultFill;
      try {
        hasStructLines = !!(map.getLayer && map.getLayer("struct-lines"));
        hasStructPoints = !!(map.getLayer && map.getLayer("struct-points"));
        hasFaultFill = !!(map.getLayer && map.getLayer("fault-fill"));
      } catch (e) {
        console.warn("Error checking layer existence:", e);
        return;
      }

      console.log("🔍 Layer check:", {
        hasStructLines,
        hasStructPoints,
        hasFaultFill,
      });

      if (!hasStructLines || !hasStructPoints || !hasFaultFill) {
        console.log(
          "⏳ Layers not ready yet, will retry when layers-ready event fires"
        );
        return;
      }

      const enabledCategories = [];
      if (filters.categories.mudflow) enabledCategories.push("сель");
      if (filters.categories.landslide) enabledCategories.push("оползни");
      if (filters.categories.fault) enabledCategories.push("разломы");

      console.log(
        "👁️ Updating filters, enabled categories:",
        enabledCategories
      );
      console.log("📋 Current filter state:", filters.categories);

      try {
        if (map.getLayer && map.getLayer("fault-fill")) {
          if (filters.categories.fault) {
            map.setLayoutProperty("fault-fill", "visibility", "visible");
          } else {
            map.setLayoutProperty("fault-fill", "visibility", "none");
          }
        }
      } catch (e) {
        console.warn("Error updating fault-fill layer:", e);
      }

      try {
        if (map.getLayer && map.getLayer("struct-lines")) {
          if (enabledCategories.length > 0) {
            map.setLayoutProperty("struct-lines", "visibility", "visible");
            map.setFilter("struct-lines", [
              "all",
              [
                "in",
                ["geometry-type"],
                ["literal", ["LineString", "MultiLineString"]],
              ],
              ["in", ["get", "category"], ["literal", enabledCategories]],
            ]);
          } else {
            map.setLayoutProperty("struct-lines", "visibility", "none");
          }
        }
      } catch (e) {
        console.warn("Error updating struct-lines layer:", e);
      }

      try {
        if (map.getLayer && map.getLayer("struct-points")) {
          if (filters.categories.landslide) {
            map.setLayoutProperty("struct-points", "visibility", "visible");
            map.setFilter("struct-points", [
              "all",
              ["==", ["geometry-type"], "Point"],
              ["==", ["get", "category"], "оползни"],
            ]);
          } else {
            map.setLayoutProperty("struct-points", "visibility", "none");
          }
        }
      } catch (e) {
        console.warn("Error updating struct-points layer:", e);
      }

      console.log("✅ Filters applied:", {
        "fault-fill": filters.categories.fault ? "visible" : "hidden",
        "struct-lines":
          enabledCategories.length > 0
            ? `visible (${enabledCategories.join(", ")})`
            : "hidden",
        "struct-points": filters.categories.landslide ? "visible" : "hidden",
      });
    };

    const handleLayersReady = () => {
      console.log("🎉 layers-ready event received");
      updateVisibility();
    };
    window.addEventListener("layers-ready", handleLayersReady);

    const attemptUpdate = () => {
      updateVisibility();
    };

    const timeoutId = setTimeout(attemptUpdate, 150);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("layers-ready", handleLayersReady);
    };
  }, [filters.categories, mapLoaded, geoData]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const selectedDistricts = filters.districts;

    if (selectedDistricts.length === 1) {
      const district = selectedDistricts[0];
      if (districtCoordinates[district]) {
        mapRef.current.flyTo({
          center: districtCoordinates[district],
          zoom: 12,
          duration: 1500,
          essential: true,
        });
      }
    } else if (selectedDistricts.length === 0) {
      mapRef.current.flyTo({
        center: [76.906, 43.198],
        zoom: 11,
        duration: 1500,
        essential: true,
      });
    }
  }, [filters.districts, mapLoaded, districtCoordinates]);

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <div
        ref={mapContainer}
        className="absolute inset-0 w-full h-full"
        style={{ minHeight: "100vh" }}
      />
      <MapLegend 
        enginNodes={enginNodes}
        socialCategories={socialCategories}
        riskClassFilter={riskClassFilter}
      />
    </div>
  );
}
