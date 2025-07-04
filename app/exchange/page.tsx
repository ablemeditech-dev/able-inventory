"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import ExchangeMethodModal from "../components/modals/ExchangeMethodModal";

interface ExchangeRecord {
  id: string;
  created_at: string;
  inbound_date?: string;
  product_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  quantity: number;
  lot_number?: string;
  ubd_date?: string;
  notes?: string;
  movement_type: 'in' | 'out';
  product?: {
    cfn: string;
    description: string;
  };
  from_location?: {
    location_name?: string;
    hospital_name?: string;
  };
  to_location?: {
    location_name?: string;
    hospital_name?: string;
  };
}

interface GroupedExchange {
  date: string;
  location_name: string;
  total_out_quantity: number;
  total_in_quantity: number;
  records: ExchangeRecord[];
}

export default function ExchangePage() {
  const [exchangeRecords, setExchangeRecords] = useState<GroupedExchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);

  useEffect(() => {
    fetchExchangeRecords();
  }, []);

  const fetchExchangeRecords = async () => {
    try {
      setLoading(true);

      // stock_movements에서 교환 기록 조회 (movement_reason = 'exchange')
      const { data: movements, error: movementsError } = await supabase
        .from("stock_movements")
        .select(`
          id,
          created_at,
          inbound_date,
          product_id,
          from_location_id,
          to_location_id,
          quantity,
          lot_number,
          ubd_date,
          notes,
          movement_type
        `)
        .eq("movement_reason", "exchange")
        .order("inbound_date", { ascending: false });

      if (movementsError) throw movementsError;

      if (!movements || movements.length === 0) {
        setExchangeRecords([]);
        return;
      }

      // 제품 정보, 병원/창고 정보를 별도로 조회
      const productIds = [...new Set(movements.map((m) => m.product_id))];
      const locationIds = [
        ...new Set([
          ...movements.map((m) => m.from_location_id),
          ...movements.map((m) => m.to_location_id)
        ].filter(Boolean))
      ];

      const [productsResult, locationsResult, hospitalsResult] = await Promise.all([
        supabase
          .from("products")
          .select("id, cfn, description")
          .in("id", productIds),
        supabase
          .from("locations")
          .select("id, location_name")
          .in("id", locationIds),
        supabase
          .from("hospitals")
          .select("id, hospital_name")
          .in("id", locationIds)
      ]);

      if (productsResult.error) throw productsResult.error;
      if (locationsResult.error) throw locationsResult.error;
      if (hospitalsResult.error) throw hospitalsResult.error;

      // 데이터 매핑
      const productMap = new Map(productsResult.data?.map((p) => [p.id, p]) || []);
      const locationMap = new Map(locationsResult.data?.map((l) => [l.id, { location_name: l.location_name }]) || []);
      const hospitalMap = new Map(hospitalsResult.data?.map((h) => [h.id, { hospital_name: h.hospital_name }]) || []);

      const enrichedMovements = movements.map((movement) => ({
        ...movement,
        product: productMap.get(movement.product_id),
        from_location: movement.from_location_id 
          ? locationMap.get(movement.from_location_id) || hospitalMap.get(movement.from_location_id)
          : undefined,
        to_location: movement.to_location_id 
          ? locationMap.get(movement.to_location_id) || hospitalMap.get(movement.to_location_id)
          : undefined,
      }));

      // 날짜별, 창고별로 그룹핑
      const grouped = groupExchangeRecords(enrichedMovements);
      setExchangeRecords(grouped);
    } catch (error) {
      console.error("교환 기록 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupExchangeRecords = (records: ExchangeRecord[]): GroupedExchange[] => {
    const groups: { [key: string]: GroupedExchange } = {};

    records.forEach((record) => {
      const date = record.inbound_date
        ? new Date(record.inbound_date).toLocaleDateString("ko-KR")
        : new Date(record.created_at).toLocaleDateString("ko-KR");
      
      // ABLE 중앙창고가 아닌 곳의 이름을 가져오기
      const ableWarehouseId = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";
      let locationName = "알 수 없음";
      
      if (record.from_location_id && record.from_location_id !== ableWarehouseId) {
        locationName = record.from_location?.location_name || record.from_location?.hospital_name || "알 수 없음";
      } else if (record.to_location_id && record.to_location_id !== ableWarehouseId) {
        locationName = record.to_location?.location_name || record.to_location?.hospital_name || "알 수 없음";
      }

      // created_at을 30초 단위로 그룹핑하여 같은 교환 트랜잭션을 하나로 묶음
      const createdTime = new Date(record.created_at);
      const groupedSeconds = Math.floor(createdTime.getSeconds() / 30) * 30;
      const timeKey = `${createdTime.getFullYear()}-${(createdTime.getMonth() + 1).toString().padStart(2, '0')}-${createdTime.getDate().toString().padStart(2, '0')}-${createdTime.getHours().toString().padStart(2, '0')}-${createdTime.getMinutes().toString().padStart(2, '0')}-${groupedSeconds.toString().padStart(2, '0')}`;
      
      const groupKey = `${date}-${locationName}-${timeKey}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          date,
          location_name: locationName,
          total_out_quantity: 0,
          total_in_quantity: 0,
          records: [],
        };
      }

      if (record.movement_type === 'out') {
        groups[groupKey].total_out_quantity += record.quantity;
      } else if (record.movement_type === 'in') {
        groups[groupKey].total_in_quantity += record.quantity;
      }
      
      groups[groupKey].records.push(record);
    });

    // 각 그룹 내의 기록들을 created_at 시간순으로 정렬
    Object.values(groups).forEach(group => {
      group.records.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    return Object.values(groups).sort(
      (a, b) =>
        new Date(b.records[0].inbound_date || b.records[0].created_at).getTime() -
        new Date(a.records[0].inbound_date || a.records[0].created_at).getTime()
    );
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const getGroupKey = (group: GroupedExchange) => `${group.date}-${group.location_name}`;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">교환관리</h1>
          <button
            onClick={() => setIsMethodModalOpen(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-accent-soft transition-colors flex items-center space-x-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>신규교환</span>
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-8 text-center">
            <div className="text-text-secondary">교환 기록을 불러오는 중...</div>
          </div>
        ) : exchangeRecords.length === 0 ? (
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
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-primary mb-2">교환 내역이 없습니다</h2>
            <p className="text-text-secondary mb-4">첫 번째 교환을 등록해보세요.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {exchangeRecords.map((group) => {
              const groupKey = getGroupKey(group);
              const isExpanded = expandedGroups.has(groupKey);

              return (
                <div
                  key={groupKey}
                  className="bg-white rounded-lg shadow-sm border border-accent-soft overflow-hidden"
                >
                  {/* 아코디언 헤더 */}
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-accent-light transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-text-secondary w-24 flex-shrink-0">
                        {group.date}
                      </div>
                      <div className="font-semibold text-primary flex-1 flex items-center space-x-2">
                        <span>ABLE</span>
                        {group.total_in_quantity > 0 ? (
                          // 교환 아이콘 (새로운 제품으로 교환)
                          <svg
                            className="w-4 h-4 text-accent-soft"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                            />
                          </svg>
                        ) : (
                          // 회수 아이콘 (오른쪽 화살표)
                          <svg
                            className="w-4 h-4 text-accent-soft"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 8l4 4m0 0l-4 4m4-4H3"
                            />
                          </svg>
                        )}
                        <span>{group.location_name}</span>
                      </div>
                      <div className="text-sm text-accent-soft flex-shrink-0">
                        회수: {group.total_out_quantity}개 | 교환: {group.total_in_quantity}개
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-accent-soft transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* 아코디언 내용 */}
                  {isExpanded && (
                    <div className="border-t border-accent-light">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-accent-light">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                                구분
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                                CFN
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                                제품명
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                                LOT
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                                UBD
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                                수량
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                                비고
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-accent-light">
                            {group.records
                              .sort((a, b) => {
                                const cfnA = a.product?.cfn || "";
                                const cfnB = b.product?.cfn || "";
                                return cfnA.localeCompare(cfnB);
                              })
                              .map((record) => (
                                <tr
                                  key={record.id}
                                  className="hover:bg-accent-light"
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        record.movement_type === 'out'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-green-100 text-green-800'
                                      }`}
                                    >
                                      {record.movement_type === 'out' ? '회수' : '교환'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-primary">
                                      {record.product?.cfn || "-"}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-text-secondary">
                                    {record.product?.description || "-"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                    {record.lot_number || "-"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                    {record.ubd_date
                                      ? new Date(record.ubd_date).toLocaleDateString("ko-KR")
                                      : "-"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                    {record.quantity}개
                                  </td>
                                  <td className="px-6 py-4 text-sm text-text-secondary">
                                    {record.notes || "-"}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 교환 방식 선택 모달 */}
      <ExchangeMethodModal
        isOpen={isMethodModalOpen}
        onClose={() => setIsMethodModalOpen(false)}
        onExchangeComplete={() => {
          fetchExchangeRecords();
        }}
      />
    </div>
  );
} 