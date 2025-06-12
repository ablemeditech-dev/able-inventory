"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  InventoryTabs,
  AbleInventory,
  HospitalSpecificInventory,
} from "../components/inventory";

interface Hospital {
  id: string;
  hospital_name: string;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState("able");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);

      const { data: hospitalData, error: hospitalError } = await supabase
        .from("hospitals")
        .select("id, hospital_name")
        .order("hospital_name");

      if (hospitalError) {
        throw hospitalError;
      }

      setHospitals(hospitalData || []);
    } catch (err) {
      // 에러가 발생해도 계속 진행 (빈 배열로 설정)
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    if (activeTab === "able") {
      return <AbleInventory />;
    }

    // 병원 ID인 경우
    const selectedHospital = hospitals.find((h) => h.id === activeTab);
    if (selectedHospital) {
      return <HospitalSpecificInventory hospital={selectedHospital} />;
    }

    return <AbleInventory />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-text-secondary">로딩 중...</div>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-primary">재고현황</h1>
      </div>

      {/* 탭 네비게이션 */}
      <InventoryTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hospitals={hospitals}
      />

      {/* 탭 콘텐츠 */}
      <div className="min-h-0">{renderTabContent()}</div>
    </div>
  );
}
