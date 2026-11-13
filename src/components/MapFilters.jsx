import { useState } from "react";

const CATEGORY_LABELS = {
  mudflow: "Сели",
  landslide: "Оползни",
  fault: "Разломы",
};

const RISK_LABELS = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

const ENGINEERING_LABELS = {
  "ИКТ инфраструктура города": "ИКТ инфраструктура",
};

const SOCIAL_LABELS = {
  ДДО: "Детские сады",
};

function Chevron({ expanded }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
        expanded ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function FilterSection({ section, expanded, onToggle }) {
  return (
    <section className="border-b border-gray-200 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 py-3 text-left hover:text-blue-700"
      >
        <span className="text-[10px] font-medium sm:text-xs md:text-sm">
          {section.title}
        </span>
        <Chevron expanded={expanded} />
      </button>

      {expanded && (
        <div className="space-y-0.5 pb-3">
          {section.options.map((option) => (
            <label
              key={option.key}
              className="flex cursor-pointer items-center gap-2 rounded p-1 text-[10px] hover:bg-gray-50 sm:text-xs"
            >
              <input
                type="checkbox"
                checked={Boolean(option.checked)}
                onChange={(event) => option.onChange(event.target.checked)}
                className="h-3 w-3 shrink-0 accent-blue-600"
              />
              <span className="min-w-0 break-words">
                <span className="mr-1 text-gray-400">|</span>
                {option.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

export default function MapFilters({
  districts = [],
  filters = { districts: [], riskLevels: {}, categories: {} },
  toggleRiskLevel = () => {},
  toggleCategory = () => {},
  selectDistrict = () => {},
  resetToAllDistricts = () => {},
  riskClassFilter,
  setRiskClassFilter,
  enginNodes,
  setEnginNodes,
  socialCategories,
  setSocialCategories,
}) {
  const [filtersHidden, setFiltersHidden] = useState(false);
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    categories: true,
    riskLevels: true,
    buildingRisk: true,
    engineering: false,
    social: false,
  });

  const selectedDistricts = filters.districts ?? [];
  const allDistricts = ["Все районы", ...districts];
  const selectedDistrictsDisplay =
    selectedDistricts.length === 0 ? "Все районы" : selectedDistricts.join(", ");

  const handleDistrictChange = (district) => {
    if (district === "Все районы") {
      resetToAllDistricts();
    } else {
      selectDistrict(district);
    }
  };

  const toggleSection = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const sections = [
    {
      id: "categories",
      title: "Категории рисков:",
      options: Object.entries(filters.categories ?? {}).map(([key, enabled]) => ({
        key,
        label: CATEGORY_LABELS[key] ?? "Разломы",
        checked: enabled,
        onChange: () => toggleCategory(key),
      })),
    },
    {
      id: "riskLevels",
      title: "Уровни риска:",
      options: Object.entries(filters.riskLevels ?? {}).map(([key, enabled]) => ({
        key,
        label: RISK_LABELS[key] ?? "Низкий",
        checked: enabled,
        onChange: () => toggleRiskLevel(key),
      })),
    },
    ...(riskClassFilter && setRiskClassFilter
      ? [
          {
            id: "buildingRisk",
            title: "Класс риска зданий:",
            options: [
              {
                key: "showHighRisk",
                label: "Высокий риск (D, E)",
                checked: riskClassFilter.showHighRisk,
                onChange: (checked) =>
                  setRiskClassFilter((prev) => ({ ...prev, showHighRisk: checked })),
              },
              {
                key: "showLowRisk",
                label: "Низкий риск (A, B, C)",
                checked: riskClassFilter.showLowRisk,
                onChange: (checked) =>
                  setRiskClassFilter((prev) => ({ ...prev, showLowRisk: checked })),
              },
            ],
          },
        ]
      : []),
    ...(enginNodes && setEnginNodes
      ? [
          {
            id: "engineering",
            title: "Инженерные узлы:",
            options: Object.entries(enginNodes).map(([key, enabled]) => ({
              key,
              label: ENGINEERING_LABELS[key] ?? key,
              checked: enabled,
              onChange: (checked) =>
                setEnginNodes((prev) => ({ ...prev, [key]: checked })),
            })),
          },
        ]
      : []),
    ...(socialCategories && setSocialCategories
      ? [
          {
            id: "social",
            title: "Социальные объекты:",
            options: Object.entries(socialCategories).map(([key, enabled]) => ({
              key,
              label: SOCIAL_LABELS[key] ?? key,
              checked: enabled,
              onChange: (checked) =>
                setSocialCategories((prev) => ({ ...prev, [key]: checked })),
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="absolute left-2 top-8 z-20 w-60 transition-all duration-300 sm:w-72 md:left-4 md:w-80">
      <div className="flex max-h-[calc(100dvh-96px)] flex-col overflow-hidden rounded-lg border bg-white/95 shadow-md backdrop-blur-sm md:rounded-xl">
        <div className="shrink-0 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between px-2 py-2 font-semibold sm:text-base md:px-4">
            <span>Фильтры</span>
            <button
              type="button"
              aria-label={filtersHidden ? "Развернуть фильтры" : "Свернуть фильтры"}
              aria-expanded={!filtersHidden}
              onClick={() => {
                setFiltersHidden((prev) => !prev);
                setDistrictDropdownOpen(false);
              }}
              className="rounded p-1 hover:bg-gray-100"
            >
              <Chevron expanded={!filtersHidden} />
            </button>
          </div>

          {!filtersHidden && (
            <div className="px-2 pb-2 md:px-4">
              <div className="relative">
                <button
                  type="button"
                  aria-expanded={districtDropdownOpen}
                  onClick={() => setDistrictDropdownOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-2 rounded border px-2 py-1 text-left text-[10px] hover:bg-gray-50 sm:text-xs md:rounded-md md:py-1.5 md:text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {selectedDistrictsDisplay}
                  </span>
                  <Chevron expanded={districtDropdownOpen} />
                </button>

                {districtDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-40 overflow-y-auto rounded border bg-white p-1 shadow-lg">
                    {allDistricts.map((district) => (
                      <label
                        key={district}
                        className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-[10px] hover:bg-blue-50 sm:text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={
                            district === "Все районы"
                              ? selectedDistricts.length === 0
                              : selectedDistricts.includes(district)
                          }
                          onChange={() => handleDistrictChange(district)}
                          className="h-3 w-3 shrink-0 accent-blue-600"
                        />
                        <span className="min-w-0 truncate">
                          <span className="mr-1 text-gray-400">|</span>
                          {district}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {!filtersHidden && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 md:px-4">
            {sections.map((section) => (
              <FilterSection
                key={section.id}
                section={section}
                expanded={openSections[section.id]}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}