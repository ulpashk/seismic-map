import { useCallback, useState } from "react";

import {
  INITIAL_FILTERS,
  INITIAL_BUILDING_RISK_FILTER,
  INITIAL_ENGINEERING_NODES,
  INITIAL_SOCIAL_CATEGORIES,
} from "../config/mapConfig";

export default function useSeismicFilters() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [riskClassFilter, setRiskClassFilter] = useState(
    INITIAL_BUILDING_RISK_FILTER
  );

  const [enginNodes, setEnginNodes] = useState(
    INITIAL_ENGINEERING_NODES
  );

  const [socialCategories, setSocialCategories] = useState(
    INITIAL_SOCIAL_CATEGORIES
  );

  const toggleRiskLevel = useCallback((level) => {
    setFilters((prev) => ({
      ...prev,
      riskLevels: {
        ...prev.riskLevels,
        [level]: !prev.riskLevels[level],
      },
    }));
  }, []);

  const toggleCategory = useCallback((category) => {
    setFilters((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: !prev.categories[category],
      },
    }));
  }, []);

  const selectDistrict = useCallback((district) => {
    setFilters((prev) => ({
      ...prev,
      districts: [district],
    }));
  }, []);

  const resetToAllDistricts = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      districts: [],
    }));
  }, []);

  return {
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
  };
}
