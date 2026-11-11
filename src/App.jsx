import "katex/dist/katex.min.css";
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./page/MainPage";
import Header from "./components/HeaderNewV";
import InfraPage from "./page/InfraPage";

function App() {
  const [activeLayer, setActiveLayer] = useState("building");
  const [mainPageTab, setMainPageTab] = useState("geo-risk");

  return (
    <Router basename="/monitoring-seismic">
      <div className="relative w-full h-screen overflow-hidden">
        <div className="absolute top-0 left-0 right-0 z-30">
          <Header
            activeLayer={activeLayer}
            mainPageTab={mainPageTab}
            setMainPageTab={setMainPageTab}
          />
        </div>

        <Routes>
          <Route
            path="/"
            element={
              <MainPage
                mainPageTab={mainPageTab}
                setMainPageTab={setMainPageTab}
              />
            }
          />
          <Route
            path="/infrastructure"
            element={
              <InfraPage
                activeLayer={activeLayer}
                setActiveLayer={setActiveLayer}
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
