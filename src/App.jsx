import "katex/dist/katex.min.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import SeismicMapDashboard from "./modules/seismic-map/SeismicMapDashboard";

function App() {
  return (
    <Router basename="/monitoring-seismic">
      <div className="relative w-full h-screen overflow-hidden">
        <Routes>
          <Route
            path="/"
            element={<SeismicMapDashboard />}
          />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
