"use client";

import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

export default function Header({ activeLayer, mainPageTab, setMainPageTab }) {
  const location = useLocation();
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  const tabs = [
    { id: "geo-risks", label: "Гео - риски", href: "/" },
    { id: "infrastructure", label: "Инфраструктура", href: "/infrastructure" }
  ];

  const getHeaderContent = () => {
    if (location.pathname === "/infrastructure") {
      return "Мониторинг сейсмоустойчивости городских объектов";
    } else {
      return "Мониторинг сейсмической опасности";
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Заголовок с адаптивным размером шрифта */}
          <h1 className="text-sm sm:text-base font-bold text-[#1b1b1b] truncate">
            {getHeaderContent()}
          </h1>

          <nav className="hidden lg:flex items-center gap-2">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.href;
              return (
                <Link key={tab.id} to={tab.href}>
                  <button
                    className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-[#236FFF] text-white"
                        : "bg-transparent text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
}