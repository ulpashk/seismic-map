
import { useState, useEffect} from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const buildingLegend = [
  { label: "A — Высокая устойчивость, минимальный риск", color: "#038009" },
  { label: "B — Хорошее состояние, устойчиво", color: "#8DE314" },
  { label: "C — Средняя устойчивость", color: "#EDDC26" },
  { label: "D — Повышенный риск, требует проверки", color: "#ED7626" },
  { label: "E — Критически низкая устойчивость", color: "#ED3726" },
];

const socialLegend = [
  { key: "Школы", label: "Школы", color: "#2563eb", icon: "school.png" },
  { key: "ПППН", label: "ПППН", color: "#16a34a", icon: "pppn.png" },
  { key: "Больницы", label: "Больницы", color: "#dc2626", icon: "health.png" },
  { key: "ДДО", label: "Детские сады", color: "#eab308", icon: "ddo.png" },
];

const enginLegend = [
  { key: "Канализация", label: "Канализация", color: "#0ea5e9", icon: "sewer.png" },
  { key: "Электроснабжение", label: "Электроснабжение", color: "#f97316", icon: "electricity.png" },
  { key: "ИКТ инфраструктура города", label: "ИКТ инфраструктура города", color: "#a855f7", icon: "ict.png" },
  { key: "Теплоснабжение", label: "Теплоснабжение", color: "#ef4444", icon: "heat.png" },
  { key: "Газоснабжение", label: "Газоснабжение", color: "#eab308", icon: "gas.png" },
];


const SEISMIC_API =
  "https://admin.smartalmaty.kz/api/v1/chs/buildings-seismic-safety/";

const populationStats = [
  { label: "Высокий риск", count: 57020, percent: "2.5%", color: "#dc2626" },
  { label: "Средний", count: 454666, percent: "19.8%", color: "#6b7280" },
  { label: "Низкий", count: 1780159, percent: "77.7%", color: "#6b7280" },
];

const formatNumber = (value) =>
  new Intl.NumberFormat("ru-RU").format(value);


function useSeismicStatistics(selectedDistricts = []) {
  const [stats, setStats] = useState({
    total: null,
    loading: true,
    error: null,
  });

  const districtsKey = JSON.stringify(selectedDistricts);

  useEffect(() => {
    const controller = new AbortController();
    const districts = JSON.parse(districtsKey);

    setStats({
      total: null,
      loading: true,
      error: null,
    });

    async function fetchStats() {
      try {
        const getCount = async (district) => {
          const params = new URLSearchParams();
          params.set("limit", "1");

          if (district) {
            params.set("district", `${district} район`);
          }

          const response = await fetch(
            `${SEISMIC_API}?${params.toString()}`,
            { signal: controller.signal }
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          if (typeof data.count !== "number") {
            throw new Error("API не вернул поле count");
          }

          return data.count;
        };

        // Все районы — общий count
        // Выбранные районы — сумма count каждого района
        const counts =
          districts.length === 0
            ? [await getCount(null)]
            : await Promise.all(districts.map(getCount));

        if (!controller.signal.aborted) {
          setStats({
            total: counts.reduce((sum, count) => sum + count, 0),
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error("Seismic statistics:", error);

        setStats({
          total: null,
          loading: false,
          error: error.message,
        });
      }
    }

    fetchStats();

    return () => controller.abort();
  }, [districtsKey]);

  return stats;
}

const REGISTRY_STATS_API =
  "https://admin.smartalmaty.kz/api/v1/chs/seismic-registry/stats/";

function useRegistryStatistics() {
  const [registryStats, setRegistryStats] = useState({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadRegistryStatistics() {
      try {
        const response = await fetch(REGISTRY_STATS_API, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (typeof data.total !== "number" || !Array.isArray(data.by_district)) {
          throw new Error("Неверный формат статистики реестра");
        }

        if (!controller.signal.aborted) {
          setRegistryStats({ data, loading: false, error: null });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Registry statistics:", error);
        setRegistryStats({ data: null, loading: false, error: error.message });
      }
    }

    loadRegistryStatistics();
    return () => controller.abort();
  }, []);

  return registryStats;
}

function getRegistryCount(data, selectedDistricts = []) {
  if (!data) return null;
  if (selectedDistricts.length === 0) return data.total;

  // В фильтрах имена могут передаваться с суффиксом «район» или без него.
  const normalizeDistrict = (name) =>
    String(name).trim().toLowerCase().replace(/\s+район\s*$/, "").replace(/ё/g, "е");

  const countByDistrict = new Map(
    data.by_district.map(({ district, count }) => [
      normalizeDistrict(district),
      count,
    ])
  );

  const counts = selectedDistricts.map((district) =>
    countByDistrict.get(normalizeDistrict(district))
  );

  // Не показываем некорректную сумму, если название района не найдено в API.
  if (counts.some((count) => typeof count !== "number")) return null;
  return counts.reduce((sum, count) => sum + count, 0);
}

const iconBase = `${process.env.PUBLIC_URL || ""}/icons/`;

function LegendSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-t border-gray-200 pt-2 mt-2">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-gray-800"
      >
        <span>{title}</span>
        {open ? (
          <ChevronUp size={16} className="text-gray-500" />
        ) : (
          <ChevronDown size={16} className="text-gray-500" />
        )}
      </button>

      {open && <div className="mt-2 space-y-1.5">{children}</div>}
    </section>
  );
}

function IconLegendItem({ item }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-5 h-5 shrink-0 rounded-full bg-white border flex items-center justify-center"
        style={{ borderColor: item.color }}
      >
        <img
          src={`${iconBase}${item.icon}`}
          alt=""
          className="w-3 h-3 object-contain"
        />
      </span>

      <span className="text-[11px] text-gray-700 leading-snug">
        {item.label}
      </span>
    </div>
  );
}


function SeismicStatistics({ selectedDistricts = [] }) {
  const stats = useSeismicStatistics(selectedDistricts);
  const registryStats = useRegistryStatistics();
  const registryCount = getRegistryCount(registryStats.data, selectedDistricts);

  const displayValue = (value) => {
    if (stats.loading) return "…";
    if (value === null) return "—";
    return formatNumber(value);
  };

  return (
    <div className="border-t border-gray-200 mt-3 pt-3">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">
        Население:
      </h4>

      <div className="space-y-1.5">
        {populationStats.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span style={{ color: item.color }}>
              {item.label}
            </span>

            <span className="text-gray-700 whitespace-nowrap">
              {formatNumber(item.count)} ({item.percent})
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="border border-gray-200 rounded-xl p-2 text-center shadow-sm bg-white">
          <div className="text-lg font-bold text-red-600">
            {registryStats.loading ? "…" : registryCount === null ? "—" : formatNumber(registryCount)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-gray-500 leading-tight">
            Несейсмостойкие
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl p-2 text-center shadow-sm bg-white">
          <div className="text-lg font-bold text-gray-900">
            {displayValue(stats.total)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-gray-500 leading-tight">
            Паспортизация
          </div>
        </div>
      </div>

      {registryStats.error && (
        <p className="text-[10px] text-red-600 mt-2">
          Не удалось загрузить количество несейсмостойких зданий.
        </p>
      )}

      {stats.error && (
        <p className="text-[10px] text-red-600 mt-2">
          Не удалось получить статистику. Проверь фильтрацию API.
        </p>
      )}
    </div>
  );
}

export default function MapLegend({
  enginNodes = {},
  socialCategories = {},
  riskClassFilter,
  selectedDistricts = [],
}) {
  const selectedSocial = socialLegend.filter(
    (item) => socialCategories[item.key]
  );

  const selectedEngin = enginLegend.filter(
    (item) => enginNodes[item.key]
  );
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  return (
    <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 w-[260px] max-w-[calc(100vw-24px)] bg-white/95 backdrop-blur-md rounded-xl border border-gray-200 shadow-xl pointer-events-auto">
      <button
        type="button"
        onClick={() => setIsLegendOpen((prev) => !prev)}
        aria-expanded={isLegendOpen}
        className="w-full flex items-center justify-between px-3 py-3 text-left"
      >
        <span className="text-sm font-bold text-gray-900">
          Легенда карты
        </span>

        {isLegendOpen ? (
          <ChevronUp size={18} className="text-gray-400" />
        ) : (
          <ChevronDown size={18} className="text-gray-400" />
        )}
      </button>

      {isLegendOpen && (
        <div className="px-3 pb-3">
          <div className="max-h-[50vh] overflow-y-auto pr-1">
            <LegendSection title="Уровень риска">
              <div className="w-full h-3 rounded bg-gradient-to-r from-yellow-400 to-red-500" />
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>Средний</span>
                <span>Высокий</span>
              </div>
            </LegendSection>

            <LegendSection title="Категории рисков">
              <div className="flex items-center gap-2">
                <span className="w-6 h-1 bg-blue-400 rounded" />
                <span className="text-[11px] text-gray-700">Сель</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-6 flex items-center gap-1">
                  <span className="w-3 h-1 bg-orange-400" />
                  <span className="w-2 h-2 bg-orange-400 rounded-full" />
                </span>
                <span className="text-[11px] text-gray-700">Оползни</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-6 h-4 rounded bg-red-400/50 border border-red-400" />
                <span className="text-[11px] text-gray-700">Разломы</span>
              </div>
            </LegendSection>

            <LegendSection title="Здания">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-sm shrink-0"
                  style={{ backgroundColor: "#B51F45" }}
                />
                <span className="text-[11px] leading-snug text-gray-700">
                  Несейсмостойкие здания
                </span>
              </div>
            </LegendSection>

            {selectedEngin.length > 0 && (
              <LegendSection title="Инженерные узлы">
                {selectedEngin.map((item) => (
                  <IconLegendItem key={item.key} item={item} />
                ))}
              </LegendSection>
            )}

            {selectedSocial.length > 0 && (
              <LegendSection title="Социальные объекты">
                {selectedSocial.map((item) => (
                  <IconLegendItem key={item.key} item={item} />
                ))}
              </LegendSection>
            )}
          </div>
          <SeismicStatistics selectedDistricts={selectedDistricts} />
        </div>
      )}
    </div>
  );
}