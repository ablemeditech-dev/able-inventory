"use client";

import { useState } from "react";
import { useAbleInventory } from "../../../hooks/inventory";
import Table, { TableColumn, formatDate, formatNumber } from "../ui/Table";
import TableActions, { ActionButton, StatDisplay } from "../ui/TableActions";
import Button from "../ui/Button";

// 재고 아이템 타입 정의
interface InventoryItem {
  cfn: string;
  lot_number: string;
  ubd_date: string;
  quantity: number;
}

export default function AbleInventory() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const {
    inventory,
    loading,
    error,
    numericSort,
    toggleCfnSort,
    filterInventory,
    refetch,
  } = useAbleInventory();

  // 검색 핸들러
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    filterInventory(value);
  };

  // 재고 감사 핸들러
  const handleStockAudit = () => {
    const confirmation = window.confirm(
      "재고 감사를 시작하시겠습니까?\n\n이는 재고 수량 불일치 발생 시 사용하는 기능입니다."
    );
    if (confirmation) {
      // 재고 감사 로직 구현
      console.log("재고 감사 시작");
      // 필요시 재고 감사 관련 API 호출
    }
  };

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
      render: (value) => <span className="font-medium text-primary">{formatNumber(value)}</span>,
      align: 'right' as const,
    },
  ];

  // 액션 버튼 정의
  const actions: ActionButton[] = [
    {
      label: "재고 감사",
      onClick: handleStockAudit,
      variant: 'warning',
    },
    {
      label: "새로고침",
      onClick: refetch,
      variant: 'primary',
    },
  ];

  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-text-primary">
          ABLE 중앙창고 재고 현황
        </h2>
        <div className="flex items-center gap-4">
          <StatDisplay
            label="총 재고"
            value={`${totalQuantity.toLocaleString()}ea`}
          />
          <div className="flex gap-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                variant={action.variant}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
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
        loading={loading}
        error={error}
        emptyMessage="검색 결과가 없습니다."
        onRetry={refetch}
      />
    </div>
  );
}
