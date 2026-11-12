import { CompositeLayer } from "@deck.gl/core";
import { IconLayer, GeoJsonLayer } from "@deck.gl/layers";

export default class RepgisIconLayer extends CompositeLayer {
  renderLayers() {
    const { data = [] } = this.props;
    const points = data.filter(d => d.geometry?.type === "Point");
    const polygons = data.filter(
      d => ["Polygon", "MultiPolygon"].includes(d.geometry?.type)
    );
    const lines = data.filter(
      d => ["LineString", "MultiLineString"].includes(d.geometry?.type)
    );
    
    // 🟤 Polygon layer
    const polygonLayer = new GeoJsonLayer({
      id: `${this.props.id}-polygons`,
      data: polygons, // <-- Pass the array of features directly
      filled: true,
      stroked: true,
      getFillColor: [199, 160, 127, 160],
      getLineColor: [0, 0, 0, 255],
      getLineWidth: 2,
      pickable: true,
    });

    // 🔵 Line layer
    const lineLayer = new GeoJsonLayer({
      id: `${this.props.id}-lines`,
      data: lines, // <-- Pass the array of features directly
      stroked: true,
      getLineColor: [234, 179, 8, 255], // Using a lighter sky blue color
      getLineWidth: 3, // Slightly thicker for better visibility
      lineWidthUnits: "pixels",
      pickable: true,
    });

    // 🟢 Marker background (white circle with colored border)
    const bgLayer = new IconLayer({
      id: `${this.props.id}-bg`,
      data: points,
      getPosition: d => d.geometry.coordinates,
      getIcon: d => {
        const cat = d.properties.cat_name;
        const color =
          cat === "Канализация" ? "#0891b2" :
          cat === "ИКТ инфраструктура города" ? "#a855f7" :
          cat === "Электроснабжение" ? "#f97316" :
          cat === "Теплоснабжение" ? "#ef4444" :
          cat === "Газоснабжение" ? "#eab308" : "#888";

        const svg = `
          <svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
            <circle cx='32' cy='32' r='28' fill='white' stroke='${color}' stroke-width='3'/>
          </svg>`;
        return {
          url: "data:image/svg+xml;base64," + btoa(svg),
          width: 32,
          height: 32,
          anchorY: 32,
          anchorX: 32,
        };
      },
      sizeScale: 4,
      getSize: 6,
    });

    // 🟣 Marker icons (actual category icons)
    const iconLayer = new IconLayer({
      id: `${this.props.id}-icon`,
      data: points,
      getPosition: d => d.geometry.coordinates,
      getIcon: d => {
        const cat = d.properties.cat_name;
        const iconUrl =
          cat === "Канализация" ? `${process.env.PUBLIC_URL}/icons/sewer.png` :
          cat === "ИКТ инфраструктура города" ? `${process.env.PUBLIC_URL}/icons/ict.png` :
          cat === "Электроснабжение" ? `${process.env.PUBLIC_URL}/icons/electricity.png` :
          cat === "Теплоснабжение" ? `${process.env.PUBLIC_URL}/icons/heat.png` :
          cat === "Газоснабжение" ? `${process.env.PUBLIC_URL}/icons/gas.png` :
          `${process.env.PUBLIC_URL}/icons/default.png`;

        return { url: iconUrl, width: 32, height: 32, anchorY: 40, anchorX: 40 };
      },
      sizeScale: 3.5,
      getSize: 4.5,
      pickable: true,
    });

    return [polygonLayer, lineLayer, bgLayer, iconLayer];
  }
}
