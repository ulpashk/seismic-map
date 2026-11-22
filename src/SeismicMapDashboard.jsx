import { useCallback, useEffect, useRef, useState } from "react";
import { updateInfrastructureLayers } from "./layers/infrastructureLayers";
import {
  addSeismicRegistryLayer,
  updateSeismicRegistryDistricts,
} from "./layers/seismicRegistryLayer";
import MapGeoRisk from "./components/MapGeoRiskG";
import MapFilters from "./components/MapFilters";
import useSeismicFilters from "./hooks/useSeismicFilters";
import {
  DISTRICTS,
  DISTRICT_COORDINATES,
  RISK_LABEL_MAP,
  CATEGORY_LABEL_MAP
} from "./config/mapConfig";

export default function SeismicMapDashboard() {
  const mapRef = useRef(null);

  const {
    filters,
    setFilters,
    riskClassFilter,
    setRiskClassFilter,
    enginNodes,
    setEnginNodes,
    socialCategories,
    setSocialCategories,
    toggleRiskLevel,
    toggleCategory,
    selectDistrict,
    resetToAllDistricts,
  } = useSeismicFilters();

  const buildingFiltersRef = useRef(null);

  buildingFiltersRef.current = {
    riskClassFilter,
    districts: filters.districts,
  };

  const infrastructureOverlayRef = useRef(null);
  const [infrastructureReady, setInfrastructureReady] = useState(false);


  const handleMapReady = useCallback((map, overlay) => {
    mapRef.current = map;
    infrastructureOverlayRef.current = overlay;
    setInfrastructureReady(true);

    const tryAddRegistryLayer = () => {
      if (!map.isStyleLoaded()) return;

      addSeismicRegistryLayer(map);
      updateSeismicRegistryDistricts(
        map,
        buildingFiltersRef.current.districts
      );
    };

    const restoreLayers = () => {
      tryAddRegistryLayer();
    };

    restoreLayers();

    map.on("style.load", restoreLayers);

    map.once("remove", () => {
      map.off("style.load", restoreLayers);
      mapRef.current = null;
      infrastructureOverlayRef.current = null;
    });
  }, []);


  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.getSource("seismic-registry")) return;

    updateSeismicRegistryDistricts(map, filters.districts);
  }, [filters.districts]);



  useEffect(() => {
    if (!infrastructureReady) return;
    const overlay = infrastructureOverlayRef.current;
    if (!overlay) return;

    updateInfrastructureLayers(
      overlay,
      socialCategories,
      enginNodes
    ).catch((error) => {
      console.error(
        "Failed to update infrastructure layers:",
        error
      );
    });
  }, [infrastructureReady, socialCategories, enginNodes]);
    
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <MapGeoRisk
        onMapReady={handleMapReady}
        districtCoordinates={DISTRICT_COORDINATES}
        riskLabelMap={RISK_LABEL_MAP}
        filters={filters}
        enginNodes={enginNodes}
        socialCategories={socialCategories}
        riskClassFilter={riskClassFilter}
      />

      <MapFilters
        districts={DISTRICTS}
        riskLabelMap={RISK_LABEL_MAP}
        categoryLabelMap={CATEGORY_LABEL_MAP}
        filters={filters}
        toggleRiskLevel={toggleRiskLevel}
        toggleCategory={toggleCategory}
        selectDistrict={selectDistrict}
        resetToAllDistricts={resetToAllDistricts}
        riskClassFilter={riskClassFilter}
        setRiskClassFilter={setRiskClassFilter}
        enginNodes={enginNodes}
        setEnginNodes={setEnginNodes}
        socialCategories={socialCategories}
        setSocialCategories={setSocialCategories}
      />
    </div>
  );
}
