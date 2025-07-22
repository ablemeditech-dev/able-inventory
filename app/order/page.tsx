"use client";

import { useMemo } from "react";
import { useOrderData } from "../../hooks/useOrderData";
import { useTableSort } from "../../hooks/useTableSort";
import { getTopFiveRanking } from "../../utils/ranking";
import { OrderTableRow } from "../components/order/OrderTableRow";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import Accordion, { AccordionItem } from "../components/ui/Accordion";

// 거래처별 그룹화된 오더 데이터 타입
interface ClientGroupedOrder {
  clientName: string;
  clientId: string;
  orders: any[];
  totalItems: number;
  totalQuantity: number;
  totalUsage: number;
}

export default function OrderPage() {
  const {
    orderItems,
    setOrderItems,
    originalOrderItems,
    hospitalTopUsage,
    loading,
    error,
  } = useOrderData();

  const { sortConfig, handleSort, renderSortIcon } = useTableSort();

  const handleOrder = () => {
    alert("오더 기능은 준비 중입니다.");
  };

  // 순위 계산 (매번 계산하지 않도록 최적화 가능)
  const rankingMap = getTopFiveRanking(orderItems);

  // 거래처별 오더 데이터 그룹화
  const groupedOrders = useMemo(() => {
    const groups = new Map<string, ClientGroupedOrder>();
    
    orderItems.forEach(item => {
      const clientKey = item.client_id || item.client_name || 'unknown';
      const clientName = item.client_name || '거래처 미상';
      
      if (!groups.has(clientKey)) {
        groups.set(clientKey, {
          clientName,
          clientId: item.client_id || clientKey,
          orders: [],
          totalItems: 0,
          totalQuantity: 0,
          totalUsage: 0
        });
      }
      
      const group = groups.get(clientKey)!;
      group.orders.push(item);
      group.totalItems += 1;
      group.totalQuantity += item.total_quantity;
      group.totalUsage += item.six_months_usage;
    });

    // 거래처명으로 정렬
    return Array.from(groups.values()).sort((a, b) => 
      a.clientName.localeCompare(b.clientName)
    );
  }, [orderItems]);

  // 테이블 컴포넌트 생성 함수
  const createOrderTable = (orders: any[], showClientColumn: boolean = true) => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CFN
              </th>
              {showClientColumn && (
                <th className="px-2 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  거래처
                </th>
              )}
              <th className="px-2 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  onClick={() => handleSort('quantity', orders, setOrderItems)}
                >
                  <span className="hidden sm:inline">재고 수량</span>
                  <span className="sm:hidden">수량</span>
                  {renderSortIcon('quantity')}
                </button>
              </th>
              <th className="px-2 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  onClick={() => handleSort('usage', orders, setOrderItems)}
                >
                  <span className="hidden sm:inline">6개월 사용량</span>
                  <span className="sm:hidden">사용량</span>
                  {renderSortIcon('usage')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((item) => {
              const rank = rankingMap.get(item.cfn);
              return (
                <OrderTableRow
                  key={item.product_id}
                  item={item}
                  rank={rank && rank > 0 ? rank : undefined}
                  topHospital={hospitalTopUsage.get(item.cfn) || ''}
                  showClientName={showClientColumn}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const totalQuantity = orderItems.reduce((sum, item) => sum + item.total_quantity, 0);
  const totalUsage = orderItems.reduce((sum, item) => sum + item.six_months_usage, 0);

  // 거래처가 하나뿐인 경우 아코디언 없이 표시
  if (groupedOrders.length === 1) {
    const singleClient = groupedOrders[0];
    
    return (
      <div className="p-3 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* 헤더 - 제목과 요약 정보 */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 md:mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-lg md:text-2xl font-bold text-primary">오더 관리</h1>
              <div className="text-sm md:text-base text-text-secondary">
                {singleClient.clientName} • {singleClient.totalItems}개 품목 • 
                총 재고: <span className="font-semibold text-primary">{totalQuantity.toLocaleString()}개</span>
              </div>
            </div>
            <Button onClick={handleOrder} variant="primary" className="text-sm md:text-base px-3 md:px-4 py-2">
              오더하기
            </Button>
          </div>

          {error && (
            <Alert 
              type="error" 
              message={error} 
              className="mb-6"
            />
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-lg">로딩 중...</div>
            </div>
          ) : (
            createOrderTable(orderItems, false) // 거래처 컬럼 숨김
          )}
        </div>
      </div>
    );
  }

  // 거래처별 아코디언 아이템 생성
  const accordionItems: AccordionItem[] = groupedOrders.map((group) => ({
    id: group.clientId,
    header: (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-primary text-base">
            {group.clientName}
          </span>
          <span className="text-sm text-text-secondary">
            {group.totalItems}개 품목
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">
            재고: <span className="font-medium text-primary">{group.totalQuantity.toLocaleString()}개</span>
          </span>
          <span className="text-sm text-text-secondary">
            사용량: <span className="font-medium text-primary">{group.totalUsage.toLocaleString()}개</span>
          </span>
        </div>
      </div>
    ),
    content: createOrderTable(group.orders, false), // 거래처 컬럼 숨김
    defaultExpanded: true
  }));

  return (
    <div className="p-3 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 - 제목과 요약 정보 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 md:mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg md:text-2xl font-bold text-primary">오더 관리</h1>
            <div className="text-sm md:text-base text-text-secondary">
              {groupedOrders.length}개 거래처 • 총 재고: <span className="font-semibold text-primary">{totalQuantity.toLocaleString()}개</span>
            </div>
          </div>
          <Button onClick={handleOrder} variant="primary" className="text-sm md:text-base px-3 md:px-4 py-2">
            오더하기
          </Button>
        </div>

        {error && (
          <Alert 
            type="error" 
            message={error} 
            className="mb-6"
          />
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">오더 정보를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-status-error-text mb-4">{error}</div>
            <Button onClick={() => window.location.reload()} variant="primary">
              다시 시도
            </Button>
          </div>
        ) : accordionItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-secondary">오더할 제품이 없습니다.</p>
          </div>
        ) : (
          <Accordion
            items={accordionItems}
            allowMultiple={true}
          />
        )}
      </div>
    </div>
  );
} 