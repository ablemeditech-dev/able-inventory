"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

interface UsedRecord {
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
  movement_type?: string;
  movement_reason?: string;
  product?: {
    cfn: string;
    description: string;
  };
  to_location?: {
    location_name: string;
  };
}

interface GroupedUsed {
  date: string;
  hospital_name: string;
  total_quantity: number;
  records: UsedRecord[];
}

export default function ClosingPage() {
  const [usedRecords, setUsedRecords] = useState<GroupedUsed[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetchUsedRecords();
  }, []);

  const fetchUsedRecords = async () => {
    try {
      setLoading(true);

      // stock_movements에서 사용된 재고 기록 조회 (movement_reason = 'usage')
      const { data: movements, error: movementsError } = await supabase
        .from("stock_movements")
        .select(
          `
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
          movement_type,
          movement_reason
        `
        )
        .eq("movement_reason", "usage")
        .order("created_at", { ascending: false });

      if (movementsError) throw movementsError;

      if (!movements || movements.length === 0) {
        setUsedRecords([]);
        return;
      }

      // 제품 정보와 병원 정보를 별도로 조회
      const productIds = [...new Set(movements.map((m) => m.product_id))];
      const locationIds = [
        ...new Set(movements.map((m) => m.from_location_id).filter(Boolean)),
      ];

      const [productsResult, locationsResult] = await Promise.all([
        supabase
          .from("products")
          .select("id, cfn, description")
          .in("id", productIds),
        supabase
          .from("locations")
          .select("id, location_name")
          .in("id", locationIds),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (locationsResult.error) throw locationsResult.error;

      // 데이터 매핑
      const productMap = new Map(
        productsResult.data?.map((p) => [p.id, p]) || []
      );
      const locationMap = new Map(
        locationsResult.data?.map((l) => [l.id, l]) || []
      );

      const enrichedMovements = movements.map((movement) => ({
        ...movement,
        product: productMap.get(movement.product_id),
        to_location: movement.from_location_id
          ? locationMap.get(movement.from_location_id) ?? undefined
          : undefined,
      }));

      // 날짜별, 병원별로 그룹핑
      const grouped = groupUsedRecords(enrichedMovements);
      setUsedRecords(grouped);
    } catch {
      // 사용하지 않는 변수, 파라미터, 상수 삭제
    } finally {
      setLoading(false);
    }
  };

  const groupUsedRecords = (records: UsedRecord[]): GroupedUsed[] => {
    const groups: { [key: string]: GroupedUsed } = {};

    records.forEach((record) => {
      // inbound_date를 우선 사용하고, 없으면 created_at을 fallback으로 사용
      const dateToUse = record.inbound_date || record.created_at;
      const date = new Date(dateToUse);

      // 년-월만 추출 (2025-02 형식)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const yearMonth = `${year}-${month}`;

      const hospitalName = record.to_location?.location_name || "알 수 없음";
      const groupKey = `${yearMonth}-${hospitalName}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          date: yearMonth, // 년-월 형식으로 저장
          hospital_name: hospitalName,
          total_quantity: 0,
          records: [],
        };
      }

      groups[groupKey].total_quantity += record.quantity;
      groups[groupKey].records.push(record);
    });

    return Object.values(groups).sort((a, b) => {
      // 년-월 기준으로 정렬 (최신순)
      return b.date.localeCompare(a.date);
    });
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

  const getGroupKey = (group: GroupedUsed) =>
    `${group.date}-${group.hospital_name}`;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">사용기록</h1>
          <button
            onClick={() => {
              router.push("/closing/manual");
            }}
            className="bg-primary text-text-primary px-4 py-2 rounded-lg hover:bg-accent-soft transition-colors flex items-center space-x-2"
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
            <span>사용분</span>
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-8 text-center">
            <div className="text-text-secondary">
              사용 기록을 불러오는 중...
            </div>
          </div>
        ) : usedRecords.length === 0 ? (
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
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-primary mb-2">
              사용 기록이 없습니다
            </h2>
            <p className="text-text-secondary mb-4">
              첫 번째 사용분을 등록해보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {usedRecords.map((group) => {
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
                        {(() => {
                          // group.date가 이미 "2025-02" 형식
                          const [year, month] = group.date.split("-");
                          const shortYear = year.slice(-2); // 25
                          return `${shortYear}-${month}`;
                        })()}
                      </div>
                      <div className="font-semibold text-primary flex-1">
                        {group.hospital_name}
                      </div>
                      <div className="text-sm text-accent-soft flex-shrink-0">
                        총 {group.total_quantity}ea
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
                                사용일
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                                CFN
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                                LOT
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                                수량
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
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                    {record.inbound_date
                                      ? new Date(
                                          record.inbound_date
                                        ).toLocaleDateString("ko-KR")
                                      : record.created_at
                                      ? new Date(
                                          record.created_at
                                        ).toLocaleDateString("ko-KR")
                                      : "-"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-primary">
                                      {record.product?.cfn || "-"}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                    {record.lot_number || "-"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                    {record.quantity}개
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
    </div>
  );
}
