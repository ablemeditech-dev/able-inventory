"use client";

import { useState } from "react";
import { useHospitalInventory } from "../../../hooks/inventory";
import Table, { TableColumn, formatDate, formatQuantity } from "../ui/Table";
import Button from "../ui/Button";
import { ExclamationTriangleIcon, RefreshIcon } from "../ui/Icons";

interface Hospital {
  id: string;
  hospital_name: string;
}

interface HospitalSpecificInventoryProps {
  hospital: Hospital;
}

// 재고 아이템 타입 정의
interface InventoryItem {
  cfn: string;
  lot_number: string;
  ubd_date: string;
  quantity: number;
}

export default function HospitalSpecificInventory({
  hospital,
}: HospitalSpecificInventoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const {
    inventory,
    loading,
    error,
    numericSort,
    toggleCfnSort,
    filterInventory,
    refetch,
    hasInventory,
  } = useHospitalInventory(hospital.id);

  // 검색 핸들러
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    filterInventory(value);
  };

  // 재고 감사 핸들러
  const handleStockAudit = () => {
    const confirmation = window.confirm(
      `${hospital.hospital_name}의 재고 감사를 시작하시겠습니까?`
    );
    if (confirmation) {
      console.log(`${hospital.hospital_name} 재고 감사 시작`);
      // 필요시 재고 감사 관련 API 호출
    }
  };

  // 테이블 컬럼 정의
  const columns: TableColumn<InventoryItem>[] = [
    {
      key: 'cfn',
      header: 'CFN',
      align: 'left' as const,
      headerRender: () => (
        <div className="flex items-center justify-between">
          <span>CFN</span>
          <Button
            onClick={toggleCfnSort}
            variant="ghost"
            size="sm"
            className="ml-1 h-5 px-1 text-xs w-8 flex-shrink-0"
          >
            {numericSort ? "L" : "D"}
          </Button>
        </div>
      ),
      render: (value) => <span className="font-medium text-primary text-sm">{value}</span>,
    },
    {
      key: 'lot_number',
      header: 'LOT',
      align: 'center' as const,
      render: (value) => <span className="text-text-secondary text-sm">{value}</span>,
    },
    {
      key: 'ubd_date',
      header: 'UBD',
      align: 'center' as const,
      render: (value) => <span className="text-text-secondary text-sm">{formatDate(value)}</span>,
    },
    {
      key: 'quantity',
      header: '수량',
      align: 'right' as const,
      render: (value) => <span className="font-medium text-primary text-sm">{formatQuantity(value)}</span>,
    },
  ];

  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="p-3 md:p-6">
      {/* 헤더 - 병원명과 총재고 한 줄 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg md:text-xl font-bold text-text-primary truncate">
            {hospital.hospital_name}
          </h2>
          <div className="text-sm md:text-base text-text-secondary">
            총 재고: <span className="font-semibold text-primary">{totalQuantity.toLocaleString()}ea</span>
          </div>
        </div>
      </div>

      {/* 검색창과 아이콘들 한 줄 */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="검색"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-primary/5 text-text-primary text-sm placeholder-text-secondary"
          />
        </div>
        <div className="flex gap-1">
          <Button
            onClick={handleStockAudit}
            variant="warning"
            size="sm"
            className="flex items-center gap-1 px-2 py-2 min-w-fit"
            title="재고 감사"
          >
            <ExclamationTriangleIcon size="sm" />
            <span className="hidden md:inline">재고 감사</span>
          </Button>
          <Button
            onClick={refetch}
            variant="primary"
            size="sm"
            className="flex items-center gap-1 px-2 py-2 min-w-fit"
            title="새로고침"
          >
            <RefreshIcon size="sm" />
            <span className="hidden md:inline">새로고침</span>
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={inventory}
        loading={loading}
        error={error}
        emptyMessage={!hasInventory() ? "현재 재고가 없습니다." : "검색 결과가 없습니다."}
        onRetry={refetch}
      />
    </div>
  );
}
