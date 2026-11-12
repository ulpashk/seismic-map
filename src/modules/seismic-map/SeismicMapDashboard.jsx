
import { useCallback, useEffect, useRef, useState } from "react";
import { updateInfrastructureLayers } from "./infrastructure/infrastructureLayers";
import MainPage from "../../page/MainPage";
import {
  addBuildingRiskLayer,
  updateBuildingRiskFilter,
} from "./layers/buildingRiskLayer";

export default function SeismicMapDashboard() {
  const mapRef = useRef(null);
  const infrastructureOverlayRef = useRef(null);
  const [infrastructureReady, setInfrastructureReady] = useState(false);

  const [riskClassFilter, setRiskClassFilter] = useState({
    showHighRisk: true,
    showLowRisk: true,
  });

  const [enginNodes, setEnginNodes] = useState({
    Канализация: false,
    Электроснабжение: false,
    "ИКТ инфраструктура города": false,
    Теплоснабжение: false,
    Газоснабжение: false,
  });

  const [socialCategories, setSocialCategories] = useState({
    Школы: false,
    ДДО: false,
    Больницы: false,
    ПППН: false,
  });

  const handleMapReady = useCallback((map, overlay) => {
    mapRef.current = map;
    infrastructureOverlayRef.current = overlay;
    setInfrastructureReady(true);

    const tryAddBuildingLayer = () => {
      if (map.getLayer("building-fill")) return;

      addBuildingRiskLayer(map);

      if (map.getLayer("building-fill")) {
        updateBuildingRiskFilter(map, {
          showHighRisk: true,
          showLowRisk: true,
        });

        console.log("✅ Building risk source added");
      }
    };

    tryAddBuildingLayer();

    map.on("style.load", tryAddBuildingLayer);

    map.once("remove", () => {
      map.off("style.load", tryAddBuildingLayer);
      mapRef.current = null;
      infrastructureOverlayRef.current = null;
    });
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("building-fill")) return;

    updateBuildingRiskFilter(map, riskClassFilter);
  }, [riskClassFilter]);

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
    <MainPage
      mainPageTab="geo-risk"
      setMainPageTab={() => {}}
      onMapReady={handleMapReady}
      riskClassFilter={riskClassFilter}
      setRiskClassFilter={setRiskClassFilter}
      enginNodes={enginNodes}
      setEnginNodes={setEnginNodes}
      socialCategories={socialCategories}
      setSocialCategories={setSocialCategories}
    />
  );
}
