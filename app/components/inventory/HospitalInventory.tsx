"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useHospitalInventory } from "../../../hooks/inventory";
import Table, { TableColumn, formatDate, formatQuantity } from "../ui/Table";
import TableActions, { ActionButton, SelectDropdown, StatDisplay } from "../ui/TableActions";
import Button from "../ui/Button";

interface Hospital {
  id: string;
  hospital_name: string;
}

// 재고 아이템 타입 정의
interface InventoryItem {
  cfn: string;
  lot_number: string;
  ubd_date: string;
  quantity: number;
}

export default function HospitalInventory() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  
  const {
    inventory,
    loading: inventoryLoading,
    error: inventoryError,
    numericSort,
    toggleCfnSort,
    filterInventory,
    refetch,
    hasInventory,
  } = useHospitalInventory(selectedHospital);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      setError("");

      const { data: hospitalData, error: hospitalError } = await supabase
        .from("hospitals")
        .select("id, hospital_name")
        .order("hospital_name");

      if (hospitalError) {
        throw hospitalError;
      }

      setHospitals(hospitalData || []);

      // 첫 번째 병원을 기본 선택
      if (hospitalData && hospitalData.length > 0) {
        setSelectedHospital(hospitalData[0].id);
      }
    } catch (err) {
      console.error("병원 목록 조회 에러:", err);
      setError("병원 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 검색 핸들러
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    filterInventory(value);
  };

  // 병원 선택 핸들러
  const handleHospitalChange = (hospitalId: string) => {
    setSelectedHospital(hospitalId);
    setSearchTerm(""); // 검색어 초기화
  };

  // 초기 로딩 상태
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-text-secondary">병원 정보를 불러오는 중...</div>
      </div>
    );
  }

  // 초기 에러 상태
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-error text-lg mb-4">{error}</div>
        <Button onClick={fetchHospitals} variant="primary">
          다시 시도
        </Button>
      </div>
    );
  }

  // 테이블 컬럼 정의
  const columns: TableColumn<InventoryItem>[] = [
    {
      key: 'cfn',
      header: 'CFN',
      headerRender: () => (
        <div className="flex items-center justify-between">
          <span>CFN</span>
          <Button
            onClick={toggleCfnSort}
            variant="ghost"
            size="sm"
            className="ml-2 h-6 px-2 text-xs w-16 flex-shrink-0"
          >
            {numericSort ? "length" : "diameter"}
          </Button>
        </div>
      ),
      render: (value) => <span className="font-medium text-primary">{value}</span>,
    },
    {
      key: 'lot_number',
      header: 'LOT',
      render: (value) => <span className="text-text-secondary">{value}</span>,
    },
    {
      key: 'ubd_date',
      header: 'UBD',
      render: (value) => <span className="text-text-secondary">{formatDate(value)}</span>,
    },
    {
      key: 'quantity',
      header: '수량',
      render: (value) => <span className="font-medium text-primary">{formatQuantity(value)}</span>,
      align: 'right' as const,
    },
  ];

  // 액션 버튼 정의
  const actions: ActionButton[] = [
    {
      label: "새로고침",
      onClick: refetch,
      variant: 'primary',
    },
  ];

  // 병원 선택 옵션
  const hospitalOptions = hospitals.map(hospital => ({
    value: hospital.id,
    label: hospital.hospital_name,
  }));

  // 선택된 병원 정보
  const selectedHospitalData = hospitals.find(h => h.id === selectedHospital);
  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="p-6">
      <TableActions
        title="병원별 재고 현황"
        actions={actions}
      />

      <div className="mb-6">
        <SelectDropdown
          label="병원 선택"
          value={selectedHospital}
          options={hospitalOptions}
          onChange={handleHospitalChange}
          placeholder="병원을 선택해주세요"
        />
      </div>

      {selectedHospital && (
        <>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-text-primary">
              {selectedHospitalData?.hospital_name}
            </h2>
            <StatDisplay
              label="총 재고"
              value={`${totalQuantity.toLocaleString()}ea`}
            />
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="CFN, LOT, 거래처명으로 검색..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-text-primary"
            />
          </div>

          <Table
            columns={columns}
            data={inventory}
            loading={inventoryLoading}
            error={inventoryError}
            emptyMessage={!hasInventory() ? "현재 재고가 없습니다." : "검색 결과가 없습니다."}
            onRetry={refetch}
          />
        </>
      )}
    </div>
  );
}
