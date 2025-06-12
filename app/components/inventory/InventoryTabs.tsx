"use client";

import { useState, useRef, useEffect, useMemo } from "react";

interface Hospital {
  id: string;
  hospital_name: string;
}

interface InventoryTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hospitals: Hospital[];
}

export default function InventoryTabs({
  activeTab,
  onTabChange,
  hospitals,
}: InventoryTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [lineStyle, setLineStyle] = useState({ width: 0, left: 0 });

  // ABLE + 각 병원별 탭 생성 (useMemo로 최적화)
  const tabs = useMemo(
    () => [
      { id: "able", name: "ABLE" },
      ...hospitals.map((hospital) => ({
        id: hospital.id,
        name: hospital.hospital_name,
      })),
    ],
    [hospitals]
  );

  useEffect(() => {
    const activeIndex = tabs.findIndex((t) => t.id === activeTab);
    const activeTabElement = tabRefs.current[activeIndex];

    if (activeTabElement) {
      const { offsetWidth, offsetLeft } = activeTabElement;
      setLineStyle({
        width: offsetWidth,
        left: offsetLeft,
      });
    }
  }, [activeTab, tabs]);

  return (
    <div className="relative">
      <div className="flex space-x-0 overflow-x-auto">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors duration-200 min-w-fit
              ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-text-secondary hover:text-primary/70"
              }
            `}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* 애니메이션 하이라이트 라인 */}
      <div
        className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-out"
        style={{
          width: `${lineStyle.width}px`,
          left: `${lineStyle.left}px`,
        }}
      />
    </div>
  );
}
