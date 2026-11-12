import { useState } from "react";
import MapGeoRisk from "../components/MainPage/MapGeoRiskG";
import MapFilters from "../components/MainPage/MapFilters";
import HeatMapPopulation from "../components/MainPage/HeatMapPopulation";

export default function MainPage({ 
  mainPageTab, 
  setMainPageTab, 
  onMapReady,
  riskClassFilter,
  setRiskClassFilter, 
  enginNodes,
  setEnginNodes,
  socialCategories,
  setSocialCategories,
}) {
  const districts = [
    "Алатауский",
    "Алмалинский",
    "Ауэзовский",
    "Бостандыкский",
    "Жетысуский",
    "Медеуский",
    "Наурызбайский",
    "Турксибский",
  ];

  const districtCoordinates = {
    Алатауский: [76.8347886720185, 43.2987364390376],
    Алмалинский: [76.9087951573108, 43.2522310686198],
    Ауэзовский: [76.8504995220839, 43.223745973742],
    Бостандыкский: [76.923470827708, 43.1557279031715],
    Жетысуский: [76.9247715410888, 43.3089271719003],
    Медеуский: [77.0214117650313, 43.1639355276689],
    Наурызбайский: [76.8309409706471, 43.1744182686828],
    Турксибский: [76.9856814001376, 43.3409268951072],
  };

  const riskLabelMap = {
    high: "высокий",
    medium: "средний",
    low: "низкий",
  };

  const categoryLabelMap = {
    mudflow: "сель",
    landslide: "оползни",
    fault: "разломы",
  };

  const [filters, setFilters] = useState({
    districts: [],
    riskLevels: {
      high: true,
      medium: true,
      low: true,
    },
    categories: {
      mudflow: true,
      landslide: true,
      fault: true,
    },
  });

  const toggleRiskLevel = (level) => {
    setFilters((prev) => ({
      ...prev,
      riskLevels: { ...prev.riskLevels, [level]: !prev.riskLevels[level] },
    }));
  };

  const toggleCategory = (cat) => {
    setFilters((prev) => ({
      ...prev,
      categories: { ...prev.categories, [cat]: !prev.categories[cat] },
    }));
  };

  // These functions will have enhanced functionality in MapGeoRisk
  const selectDistrict = (district) => {
    setFilters((prev) => ({
      ...prev,
      districts: [district],
    }));
    // Map flying logic will be handled in MapGeoRisk
  };

  const resetToAllDistricts = () => {
    setFilters((prev) => ({ ...prev, districts: [] }));
    // Map flying logic will be handled in MapGeoRisk
  };

  // Legacy state for backward compatibility (can be removed later)
  const [densityLevels] = useState({
    high: true,
    medium: true,
    low: true,
  });
  const [selectedDistrict] = useState(["Все районы"]);
  const [mode, setMode] = useState("grid");

  // Tab configuration - аналогично InfraPage
  const tabsConfig = [
    {
      key: "geo-risk",
      name: "Гео-риски",
    }
  ];

  return (
    <div className="relative w-full h-screen">

      {/* Tab Content */}
      {mainPageTab === "geo-risk" ? (
        <>
          <MapGeoRisk
            onMapReady={onMapReady}
            enginNodes={enginNodes}
            socialCategories={socialCategories}
            riskClassFilter={riskClassFilter}
            // Constants
            districts={districts}
            districtCoordinates={districtCoordinates}
            riskLabelMap={riskLabelMap}
            categoryLabelMap={categoryLabelMap}
            // State
            filters={filters}
            setFilters={setFilters}
            // Filter handlers
            toggleRiskLevel={toggleRiskLevel}
            toggleCategory={toggleCategory}
            selectDistrict={selectDistrict}
            resetToAllDistricts={resetToAllDistricts}
            // Legacy props (for backward compatibility)
            mode={mode}
            setMode={setMode}
            selectedDistrict={selectedDistrict}
            densityLevels={densityLevels}
          />

          <MapFilters
            districts={districts}
            riskLabelMap={riskLabelMap}
            categoryLabelMap={categoryLabelMap}
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
        </>
      ) : (
        <HeatMapPopulation />
      )}
    </div>
  );
}
