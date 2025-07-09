"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface OrderItem {
  cfn: string;
  client_name: string;
  total_quantity: number;
  six_months_usage: number;
  product_id: string;
  client_id: string;
}

export default function OrderPage() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [originalOrderItems, setOriginalOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{
    key: 'quantity' | 'usage' | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  useEffect(() => {
    fetchOrderData();
  }, []);

  // 상위 30% 사용량 계산 (사용량이 0인 항목 제외)
  const getTopUsageThreshold = () => {
    // 사용량이 0보다 큰 항목들만 필터링
    const itemsWithUsage = orderItems.filter(item => item.six_months_usage > 0);
    
    if (itemsWithUsage.length === 0) return 0;
    
    const sortedByUsage = itemsWithUsage.sort((a, b) => b.six_months_usage - a.six_months_usage);
    const topPercentIndex = Math.floor(sortedByUsage.length * 0.3); // 상위 30%
    return sortedByUsage[topPercentIndex]?.six_months_usage || 0;
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

  const fetchOrderData = async () => {
    try {
      setLoading(true);
      setError("");

      // ABLE 중앙창고 ID
      const ableLocationId = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";

      // 모든 제품 정보 조회 (재고가 0인 CFN도 포함하기 위해)
      const { data: allProducts, error: allProductsError } = await supabase
        .from("products")
        .select("id, cfn, client_id")
        .not("cfn", "is", null)
        .order("cfn");

      if (allProductsError) {
        throw allProductsError;
      }

      if (!allProducts || allProducts.length === 0) {
        setOrderItems([]);
        return;
      }

      // 거래처 ID 목록 추출
      const clientIds = [
        ...new Set(allProducts.map((p) => p.client_id).filter(Boolean)),
      ];

      // 거래처 정보 별도 조회
      let clients: { id: string; company_name: string }[] = [];
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, company_name")
          .in("id", clientIds);

        if (!clientsError && clientsData) {
          clients = clientsData;
        }
      }

      // 맵으로 변환
      const productMap = new Map(allProducts.map((p) => [p.id, p]) || []);
      const clientMap = new Map(clients.map((c) => [c.id, c]));

      // CFN별 제품 그룹화
      const cfnProductMap = new Map<string, typeof allProducts[0]>();
      allProducts.forEach((product) => {
        if (product.cfn && !cfnProductMap.has(product.cfn)) {
          cfnProductMap.set(product.cfn, product);
        }
      });

      // ABLE 중앙창고 재고 계산을 위한 stock_movements 조회
      const { data: movements, error: movementsError } = await supabase
        .from("stock_movements")
        .select(
          `
          product_id,
          lot_number,
          ubd_date,
          quantity,
          movement_type,
          movement_reason,
          from_location_id,
          to_location_id,
          created_at
        `
        )
        .or(
          `from_location_id.eq.${ableLocationId},to_location_id.eq.${ableLocationId}`
        )
        .order("created_at", { ascending: false });

      if (movementsError) {
        throw movementsError;
      }

      // CFN별 재고 계산
      const cfnInventoryMap = new Map<string, {
        cfn: string;
        client_name: string;
        total_quantity: number;
        product_id: string;
        client_id: string;
      }>();

      // 모든 CFN에 대해 초기값 설정
      Array.from(cfnProductMap.entries()).forEach(([cfn, product]) => {
        const client = clientMap.get(product.client_id);
        const clientName = client?.company_name || "알 수 없음";

        cfnInventoryMap.set(cfn, {
          cfn,
          client_name: clientName,
          total_quantity: 0,
          product_id: product.id,
          client_id: product.client_id,
        });
      });

      // 재고 계산
      movements?.forEach((movement) => {
        const product = productMap.get(movement.product_id);
        if (!product || !movement.lot_number || !movement.ubd_date) return;

        const cfn = product.cfn;
        if (!cfn || !cfnInventoryMap.has(cfn)) return;

        const item = cfnInventoryMap.get(cfn)!;

        // ABLE로 들어오는 경우 (+), ABLE에서 나가는 경우 (-)
        if (movement.to_location_id === ableLocationId) {
          item.total_quantity += movement.quantity || 0;
        } else if (movement.from_location_id === ableLocationId) {
          item.total_quantity -= movement.quantity || 0;
        }
      });

      // 최근 6개월 사용량 계산 (statistics/graphs의 로직 사용)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: recentMovements, error: recentMovementsError } = await supabase
        .from("stock_movements")
        .select(
          `
          product_id,
          quantity,
          movement_type,
          movement_reason,
          from_location_id,
          to_location_id,
          created_at
        `
        )
        .eq("movement_type", "out")
        .eq("movement_reason", "usage")
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at", { ascending: false });

      if (recentMovementsError) {
        throw recentMovementsError;
      }

      // CFN별 6개월 사용량 집계
      const cfnUsageMap = new Map<string, number>();
      recentMovements?.forEach((movement) => {
        const product = productMap.get(movement.product_id);
        if (!product || !product.cfn) return;

        const cfn = product.cfn;
        const currentUsage = cfnUsageMap.get(cfn) || 0;
        cfnUsageMap.set(cfn, currentUsage + (movement.quantity || 0));
      });

      // 모든 CFN 데이터 생성 (재고가 0인 것도 포함)
      const orderData = Array.from(cfnInventoryMap.values())
        .map(item => ({
          ...item,
          six_months_usage: cfnUsageMap.get(item.cfn) || 0,
        }))
        .sort((a, b) => {
          // 재고가 0인 것을 먼저 보여주고, 그 다음 재고가 적은 순으로 정렬
          if (a.total_quantity === 0 && b.total_quantity > 0) return -1;
          if (a.total_quantity > 0 && b.total_quantity === 0) return 1;
          return a.total_quantity - b.total_quantity;
        });

             setOrderItems(orderData);
       setOriginalOrderItems(orderData);
    } catch (err) {
      console.error("오더 데이터 조회 실패:", err);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
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
                      const topUsageThreshold = getTopUsageThreshold();
                      const isTopUsage = item.six_months_usage >= topUsageThreshold && item.six_months_usage > 0;
                      
                      return (
                        <tr key={item.cfn} className={`hover:bg-accent-light ${item.total_quantity === 0 ? 'bg-red-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
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
                              {item.total_quantity === 0 && (
                                <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                  재고 부족
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${isTopUsage ? 'text-primary' : 'text-text-secondary'}`}>
                              {item.six_months_usage.toLocaleString()}개
                              {isTopUsage && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  상위 30%
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