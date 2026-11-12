import { CompositeLayer } from "@deck.gl/core";
import { IconLayer } from "@deck.gl/layers";

export default class SocialIconLayer extends CompositeLayer {
  renderLayers() {
    const { data } = this.props;

    // 🟢 Background white circle with category-specific border
    const bgLayer = new IconLayer({
      id: `${this.props.id}-bg`,
      data,
      getPosition: (d) => d.geometry.coordinates,
      getIcon: (d) => {
        // Choose border color by category
        const color =
          d.properties.category === "Школы"
            ? "#2563eb" // blue
            : d.properties.category === "ПППН"
            ? "#16a34a" // green
            : d.properties.category === "Больницы"
            ? "#dc2626" // red
            : d.properties.category === "ДДО"
            ? "#eab308" // yellow
            : "#888888"; // fallback gray

        const svg = `
          <svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
            <circle cx='32' cy='32' r='28' fill='white' stroke='${color}' stroke-width='3'/>
          </svg>
        `;

        return {
          url: "data:image/svg+xml;base64," + btoa(svg),
          width: 32,
          height: 32,
          anchorY: 32, // center vertically
          anchorX: 32,
        };
      },
      sizeScale: 4,
      getSize: 6,
    });

    // 🖼️ Actual category icons on top
    const iconLayer = new IconLayer({
      id: `${this.props.id}-icon`,
      data,
      getPosition: (d) => d.geometry.coordinates,
      // getIcon: (d) => ({
      //   url: `/icons/${d.properties.category}.png`,
      //   width: 32,
      //   height: 32,
      //   anchorY: 40,
      //   anchorX: 40,
      // }),
      getIcon: d => {
        const cat = d.properties.category;
        const iconUrl =
          cat === "Школы" ? `${process.env.PUBLIC_URL}/icons/school.png` :
          cat === "ПППН" ? `${process.env.PUBLIC_URL}/icons/pppn.png` :
          cat === "Больницы" ? `${process.env.PUBLIC_URL}/icons/health.png` :
          cat === "ДДО" ? `${process.env.PUBLIC_URL}/icons/ddo.png` :
          `${process.env.PUBLIC_URL}/icons/default.png`;
        return { url: iconUrl, width: 32, height: 32, anchorY: 40, anchorX: 40 };
      },
      sizeScale: 3.5,
      getSize: 4.5,
      getColor: [255, 255, 255, 255],
      pickable: true,
    });

    return [bgLayer, iconLayer];
  }
}