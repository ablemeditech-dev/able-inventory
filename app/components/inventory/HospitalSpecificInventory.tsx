"use client";

import { useState, useMemo } from "react";
import { useHospitalInventory } from "../../../hooks/inventory";
import Table, { TableColumn, formatDate, formatQuantity } from "../ui/Table";
import Button from "../ui/Button";
import { ExclamationTriangleIcon, RefreshIcon } from "../ui/Icons";
import Accordion, { AccordionItem } from "../ui/Accordion";
import ProductInfoModal from "../modals/ProductInfoModal";

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

export default function HospitalSpecificInventory({
  hospital,
}: HospitalSpecificInventoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  // 제품정보 모달 상태
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedCfn, setSelectedCfn] = useState<string>("");
  
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

  // 검색 기능
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    filterInventory(term);
  };

  // 재고 감사 기능
  const handleStockAudit = () => {
    alert("재고 감사 기능은 준비 중입니다.");
  };

  // CFN 클릭 핸들러
  const handleCfnClick = (cfn: string) => {
    setSelectedCfn(cfn);
    setIsProductModalOpen(true);
  };

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

    return Array.from(groups.values()).sort((a, b) => 
      a.clientName.localeCompare(b.clientName)
    );
  }, [inventory]);

  // 총 재고 계산
  const totalQuantity = useMemo(() => 
    inventory.reduce((sum, item) => sum + item.quantity, 0), 
    [inventory]
  );

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
          className="font-medium text-primary text-sm hover:text-accent hover:underline cursor-pointer transition-colors"
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
      render: (value) => <span className="font-medium text-primary text-sm">{formatQuantity(value)}</span>,
    },
  ];

  // 거래처가 하나뿐인 경우 아코디언 없이 표시
  if (groupedInventory.length === 1) {
    return (
      <div className="space-y-4">
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
          columns={createColumns(false)} // 거래처명 컬럼 숨김
          data={inventory}
          loading={loading}
          error={error}
          emptyMessage={!hasInventory() ? "현재 재고가 없습니다." : "검색 결과가 없습니다."}
          onRetry={refetch}
        />

        {/* 제품정보 모달 */}
        <ProductInfoModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          cfn={selectedCfn}
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
            재고 현황
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
    defaultExpanded: false
  }));

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

      <Accordion
        items={accordionItems}
        allowMultiple={true}
      />

      {/* 제품정보 모달 */}
      <ProductInfoModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        cfn={selectedCfn}
      />
    </div>
  );
}
