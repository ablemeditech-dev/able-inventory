"use client";

import { useState, useMemo } from "react";
import { useAbleInventory } from "../../../hooks/inventory";
import Table, { TableColumn, formatDate, formatNumber } from "../ui/Table";
import Button from "../ui/Button";
import { ExclamationTriangleIcon, RefreshIcon } from "../ui/Icons";
import Accordion, { AccordionItem } from "../ui/Accordion";
import ProductInfoModal from "../modals/ProductInfoModal";

// 재고 아이템 타입 정의
interface InventoryItem {
  cfn: string;
  lot_number: string;
  ubd_date: string;
  quantity: number;
  client_name: string;
  client_id?: string;
}

// 거래처별 그룹화된 재고 타입
interface ClientGroupedInventory {
  clientName: string;
  clientId: string;
  inventory: InventoryItem[];
  totalQuantity: number;
}

export default function AbleInventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCfn, setSelectedCfn] = useState<string>("");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  const {
    inventory,
    loading,
    error,
    numericSort,
    toggleCfnSort,
    filterInventory,
    refetch,
  } = useAbleInventory();

  // 거래처별 재고 그룹화
  const groupedInventory = useMemo(() => {
    const groups = new Map<string, ClientGroupedInventory>();
    
    inventory.forEach(item => {
      const clientKey = item.client_id || item.client_name || 'unknown';
      const clientName = item.client_name || '거래처 미상';
      
      if (!groups.has(clientKey)) {
        groups.set(clientKey, {
          clientName,
          clientId: item.client_id || clientKey,
          inventory: [],
          totalQuantity: 0
        });
      }
      
      const group = groups.get(clientKey)!;
      group.inventory.push(item);
      group.totalQuantity += item.quantity;
    });

    // 거래처명으로 정렬
    return Array.from(groups.values()).sort((a, b) => 
      a.clientName.localeCompare(b.clientName)
    );
  }, [inventory]);

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

  // CFN 클릭 핸들러
  const handleCfnClick = (cfn: string) => {
    setSelectedCfn(cfn);
    setIsProductModalOpen(true);
  };

  // 테이블 컬럼 정의
  const createColumns = (showClientName: boolean = true): TableColumn<InventoryItem>[] => [
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
      render: (value) => (
        <button
          onClick={() => handleCfnClick(value)}
          className="font-medium text-primary text-sm hover:text-primary-dark hover:underline transition-colors cursor-pointer text-left"
        >
          {value}
        </button>
      ),
    },
    ...(showClientName ? [{
      key: 'client_name' as keyof InventoryItem,
      header: '거래처',
      align: 'left' as const,
      render: (value: any) => <span className="text-text-secondary text-sm">{value}</span>,
    }] : []),
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
      render: (value) => <span className="font-medium text-primary text-sm">{formatNumber(value)}</span>,
    },
  ];

  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);

  // 거래처가 하나뿐인 경우 아코디언 없이 표시
  if (groupedInventory.length === 1) {
    const singleClient = groupedInventory[0];
    
    return (
      <div className="p-3 md:p-6">
        {/* 헤더 - 제목과 총재고 한 줄 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg md:text-xl font-bold text-text-primary">
              <span className="hidden sm:inline">ABLE 중앙창고 재고 현황</span>
              <span className="sm:hidden">ABLE 재고 현황</span>
            </h2>
            <div className="text-sm md:text-base text-text-secondary">
              {singleClient.clientName} • 총 재고: <span className="font-semibold text-primary">{totalQuantity.toLocaleString()}ea</span>
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
          columns={createColumns(false)} // 거래처명 컬럼 숨김
          data={inventory}
          loading={loading}
          error={error}
          emptyMessage="검색 결과가 없습니다."
          onRetry={refetch}
        />
      </div>
    );
  }

  // 거래처별 아코디언 아이템 생성
  const accordionItems: AccordionItem[] = groupedInventory.map((group) => ({
    id: group.clientId,
    header: (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-primary text-base">
            {group.clientName}
          </span>
          <span className="text-sm text-text-secondary">
            {group.inventory.length}개 품목
          </span>
        </div>
        <span className="text-sm font-medium text-primary">
          {group.totalQuantity.toLocaleString()}ea
        </span>
      </div>
    ),
    content: (
      <Table
        columns={createColumns(false)} // 거래처명 컬럼 숨김
        data={group.inventory}
        loading={false}
        error={null}
        emptyMessage="해당 거래처의 재고가 없습니다."
        onRetry={() => {}}
      />
    ),
    defaultExpanded: true
  }));

  return (
    <div className="p-3 md:p-6">
      {/* 헤더 - 제목과 총재고 한 줄 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg md:text-xl font-bold text-text-primary">
            <span className="hidden sm:inline">ABLE 중앙창고 재고 현황</span>
            <span className="sm:hidden">ABLE 재고 현황</span>
          </h2>
          <div className="text-sm md:text-base text-text-secondary">
            {groupedInventory.length}개 거래처 • 총 재고: <span className="font-semibold text-primary">{totalQuantity.toLocaleString()}ea</span>
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

      {/* 거래처별 아코디언 */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">재고 정보를 불러오는 중...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-status-error-text mb-4">{error}</div>
          <Button onClick={refetch} variant="primary">
            다시 시도
          </Button>
        </div>
      ) : accordionItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-text-secondary">재고가 없습니다.</p>
        </div>
      ) : (
        <Accordion
          items={accordionItems}
          allowMultiple={true}
        />
      )}

      {/* 제품 정보 모달 */}
      <ProductInfoModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedCfn("");
        }}
        cfn={selectedCfn}
      />
    </div>
  );
}
