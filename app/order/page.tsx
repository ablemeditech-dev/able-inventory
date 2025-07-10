"use client";

import { useState } from "react";
import { useOrderData } from "../../hooks/useOrderData";

export default function OrderPage() {
  const {
    orderItems,
    setOrderItems,
    originalOrderItems,
    hospitalTopUsage,
    loading,
    error,
  } = useOrderData();

  const [sortConfig, setSortConfig] = useState<{
    key: 'quantity' | 'usage' | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  // Top 5 순위 계산 (사용량이 0인 항목 제외)
  const getTopFiveRanking = () => {
    // 사용량이 0보다 큰 항목들만 필터링하고 사용량 순으로 정렬
    const itemsWithUsage = orderItems.filter(item => item.six_months_usage > 0);
    
    if (itemsWithUsage.length === 0) return new Map();
    
    const sortedByUsage = itemsWithUsage.sort((a, b) => b.six_months_usage - a.six_months_usage);
    
    // CFN을 키로 하고 순위를 값으로 하는 Map 생성
    const rankingMap = new Map<string, number>();
    
    sortedByUsage.forEach((item, index) => {
      if (index < 5) { // Top 5까지만
        rankingMap.set(item.cfn, index + 1);
      }
    });
    
    return rankingMap;
  };



  // 정렬 함수
  const handleSort = (key: 'quantity' | 'usage') => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    setSortConfig({ key, direction });

    const sortedItems = [...orderItems].sort((a, b) => {
      let aValue: number, bValue: number;
      
      if (key === 'quantity') {
        aValue = a.total_quantity;
        bValue = b.total_quantity;
      } else {
        aValue = a.six_months_usage;
        bValue = b.six_months_usage;
      }

      if (direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    setOrderItems(sortedItems);
  };

  // 정렬 아이콘 렌더링
  const renderSortIcon = (key: 'quantity' | 'usage') => {
    if (sortConfig.key !== key) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    if (sortConfig.direction === 'asc') {
      return (
        <svg className="w-4 h-4 ml-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 ml-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
        </svg>
      );
    }
  };



  const handleOrder = () => {
    alert("오더 기능은 준비 중입니다.");
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">오더 관리</h1>
          <button
            onClick={handleOrder}
            className="bg-primary text-text-primary px-4 py-2 rounded-lg hover:bg-accent-soft transition-colors"
          >
            오더하기
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-8 text-center">
            <div className="text-text-secondary">재고 데이터를 불러오는 중...</div>
          </div>
        ) : orderItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-8 text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-accent-soft"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-primary mb-2">
              재고 데이터가 없습니다
            </h2>
            <p className="text-text-secondary">
              ABLE 중앙창고에 재고가 있으면 오더 데이터가 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">
                ABLE 중앙창고 재고 현황
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-accent-light">
                      <th className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider hidden md:table-cell">
                        거래처
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                        CFN
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider cursor-pointer hover:bg-accent-soft transition-colors"
                        onClick={() => handleSort('quantity')}
                      >
                        <div className="flex items-center">
                          수량
                          {renderSortIcon('quantity')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider cursor-pointer hover:bg-accent-soft transition-colors"
                        onClick={() => handleSort('usage')}
                      >
                        <div className="flex items-center">
                          최근 6개월 사용수량
                          {renderSortIcon('usage')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-accent-light">
                    {orderItems.map((item, index) => {
                      const rankingMap = getTopFiveRanking();
                      const rank = rankingMap.get(item.cfn);
                      const topHospital = hospitalTopUsage.get(item.cfn);
                      
                      return (
                        <tr key={item.cfn} className={`hover:bg-accent-light ${item.total_quantity === 0 ? 'bg-red-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                            <div className="text-sm font-medium text-primary">
                              {item.client_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-primary">
                              {item.cfn}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${item.total_quantity === 0 ? 'text-red-600' : 'text-text-secondary'}`}>
                              {item.total_quantity.toLocaleString()}개
                              {(() => {
                                const monthlyAverageUsage = item.six_months_usage / 6;
                                const isStockOut = item.total_quantity === 0;
                                
                                // 3개월치 재고 기준으로 재고 부족 예정 판단
                                const threeMonthsStock = monthlyAverageUsage * 3;
                                const isLowStock = item.total_quantity > 0 && 
                                                   item.total_quantity < threeMonthsStock && 
                                                   item.six_months_usage > 0 &&
                                                   monthlyAverageUsage >= 0.1; // 월평균이 너무 작으면 제외
                                
                                if (isStockOut) {
                                  return (
                                    <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                      재고 부족
                                    </span>
                                  );
                                } else if (isLowStock) {
                                  return (
                                    <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                      재고 부족 예정
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${rank ? 'text-primary' : 'text-text-secondary'} flex items-center gap-2`}>
                              <span>{item.six_months_usage.toLocaleString()}개</span>
                              {rank && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Top {rank}
                                </span>
                              )}
                              {topHospital && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  {topHospital}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 