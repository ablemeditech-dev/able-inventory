"use client";

import { useOrderData } from "../../hooks/useOrderData";
import { useTableSort } from "../../hooks/useTableSort";
import { getTopFiveRanking } from "../../utils/ranking";
import { OrderTableRow } from "../components/order/OrderTableRow";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";

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

  return (
    <div className="p-3 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h1 className="text-lg md:text-2xl font-bold text-primary">오더 관리</h1>
          <Button onClick={handleOrder} variant="primary">
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
          <>
            <div className="mb-4 md:mb-6">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          순위
                        </th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          CFN
                        </th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          거래처
                        </th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                            onClick={() => handleSort('quantity', orderItems, setOrderItems)}
                          >
                            재고 수량
                            {renderSortIcon('quantity')}
                          </button>
                        </th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                            onClick={() => handleSort('usage', orderItems, setOrderItems)}
                          >
                            6개월 사용량
                            {renderSortIcon('usage')}
                          </button>
                        </th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          주사용 병원
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orderItems.map((item) => (
                        <OrderTableRow
                          key={item.product_id}
                          item={item}
                          ranking={rankingMap.get(item.cfn) || 0}
                          topUsageHospital={hospitalTopUsage.get(item.cfn) || ''}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 