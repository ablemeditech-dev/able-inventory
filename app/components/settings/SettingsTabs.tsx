"use client";

import { useState, useRef, useEffect } from "react";

interface SettingsTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "basic", name: "기본 설정" },
  { id: "users", name: "사용자 관리" },
  { id: "system", name: "시스템 설정" },
];

export default function SettingsTabs({
  activeTab,
  onTabChange,
}: SettingsTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [lineStyle, setLineStyle] = useState({ width: 0, left: 0 });

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
  }, [activeTab]);

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
                  : "text-text-secondary hover:text-gray-700"
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
