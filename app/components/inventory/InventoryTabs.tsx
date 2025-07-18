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
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineStyle, setLineStyle] = useState({ width: 0, left: 0 });

  // ABLE + 각 병원별 탭 생성 (useMemo로 최적화)
  const tabs = useMemo(
    () => [
      { id: "able", name: "ABLE", displayName: "ABLE" },
      ...hospitals.map((hospital) => ({
        id: hospital.id,
        name: hospital.hospital_name,
        displayName: hospital.hospital_name.length > 8 
          ? `${hospital.hospital_name.substring(0, 8)}...` 
          : hospital.hospital_name,
      })),
    ],
    [hospitals]
  );

  // 선택된 탭으로 스크롤하는 함수
  const scrollToTab = (tabElement: HTMLButtonElement) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const tabRect = tabElement.getBoundingClientRect();
    
    // 탭이 컨테이너 밖에 있는지 확인
    const isTabOutOfView = 
      tabRect.left < containerRect.left || 
      tabRect.right > containerRect.right;
    
    if (isTabOutOfView) {
      const scrollLeft = tabElement.offsetLeft - (container.offsetWidth / 2) + (tabElement.offsetWidth / 2);
      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth'
      });
    }
  };

  // 밑줄 바 위치 업데이트
  const updateLinePosition = () => {
    const activeIndex = tabs.findIndex((t) => t.id === activeTab);
    const activeTabElement = tabRefs.current[activeIndex];
    const container = containerRef.current;

    if (activeTabElement && container) {
      // 탭의 offsetLeft는 컨테이너 기준 절대 위치
      // 스크롤 상태에 관계없이 정확한 위치 계산
      setLineStyle({
        width: activeTabElement.offsetWidth,
        left: activeTabElement.offsetLeft,
      });
    }
  };

  // 탭 변경 핸들러
  const handleTabChange = (tabId: string) => {
    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    const tabElement = tabRefs.current[tabIndex];
    
    if (tabElement) {
      scrollToTab(tabElement);
    }
    
    onTabChange(tabId);
  };

  useEffect(() => {
    updateLinePosition();
  }, [activeTab, tabs]);

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className="flex space-x-0 overflow-x-auto relative"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            onClick={() => handleTabChange(tab.id)}
            className={`
              relative px-3 md:px-6 py-2 md:py-3 font-medium text-xs md:text-sm whitespace-nowrap transition-colors duration-200 min-w-fit
              ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-text-secondary hover:text-primary/70"
              }
            `}
            title={tab.name} // 전체 이름을 툴팁으로 표시
          >
            <span className="hidden sm:inline">{tab.name}</span>
            <span className="sm:hidden">{tab.displayName}</span>
          </button>
        ))}
        
        {/* 애니메이션 하이라이트 라인 - 스크롤 컨테이너 내부로 이동 */}
        <div
          className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-out"
          style={{
            width: `${lineStyle.width}px`,
            left: `${lineStyle.left}px`,
          }}
        />
      </div>
    </div>
  );
}
