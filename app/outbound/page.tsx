"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import OutboundMethodModal from "../components/modals/OutboundMethodModal";

interface OutboundRecord {
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
  product?: {
    cfn: string;
    description: string;
  };
  to_location?: {
    location_name: string;
  };
}

interface GroupedOutbound {
  date: string;
  client_name: string;
  total_quantity: number;
  records: OutboundRecord[];
}

export default function OutboundPage() {
  const [outboundRecords, setOutboundRecords] = useState<GroupedOutbound[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchOutboundRecords();
  }, []);

  const fetchOutboundRecords = async () => {
    try {
      setLoading(true);

      // stock_movements에서 출고 기록 조회 (movement_type = 'out')
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
          notes
        `
        )
        .eq("movement_type", "out")
        .eq("movement_reason", "sale")
        .order("inbound_date", { ascending: false });

      if (movementsError) throw movementsError;

      // 제품 정보와 거래처 정보를 별도로 조회
      const productIds = [
        ...new Set(movements?.map((m) => m.product_id) || []),
      ];
      const locationIds = [
        ...new Set(
          movements?.map((m) => m.to_location_id).filter(Boolean) || []
        ),
      ];

      // 제품 정보와 거래처 정보를 별도로 조회
      const [productsResult, locationsResult, hospitalsResult] =
        await Promise.all([
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
            .in("id", locationIds),
        ]);

      if (productsResult.error) throw productsResult.error;
      if (locationsResult.error) throw locationsResult.error;
      if (hospitalsResult.error) throw hospitalsResult.error;

      // 데이터 매핑
      const productMap = new Map(
        productsResult.data?.map((p) => [p.id, p]) || []
      );
      const locationMap = new Map(
        locationsResult.data?.map((l) => [l.id, l]) || []
      );
      const hospitalMap = new Map(
        hospitalsResult.data?.map((h) => [h.id, h]) || []
      );

      const enrichedMovements =
        movements?.map((movement) => {
          const product = productMap.get(movement.product_id);
          let to_location: { location_name: string } | undefined = undefined;

          if (movement.to_location_id) {
            // 먼저 locations 테이블에서 찾기
            const locationData = locationMap.get(movement.to_location_id);
            if (locationData) {
              to_location = locationData;
            } else {
              // locations에서 못 찾으면 hospitals 테이블에서 찾기
              const hospitalData = hospitalMap.get(movement.to_location_id);
              if (hospitalData) {
                to_location = { location_name: hospitalData.hospital_name };
              }
            }
          }

          return {
            ...movement,
            product,
            to_location,
          };
        }) || [];

      // 날짜별, 거래처별로 그룹핑
      const grouped = groupOutboundRecords(enrichedMovements);
      setOutboundRecords(grouped);
    } catch {
      console.error("출고 기록 조회 실패:");
    } finally {
      setLoading(false);
    }
  };

  const groupOutboundRecords = (
    records: OutboundRecord[]
  ): GroupedOutbound[] => {
    const groups: { [key: string]: GroupedOutbound } = {};

    records.forEach((record) => {
      const date = record.inbound_date
        ? new Date(record.inbound_date).toLocaleDateString("ko-KR")
        : new Date(record.created_at).toLocaleDateString("ko-KR");
      const clientName = record.to_location?.location_name || "알 수 없음";
      const groupKey = `${date}-${clientName}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          date,
          client_name: clientName,
          total_quantity: 0,
          records: [],
        };
      }

      groups[groupKey].total_quantity += record.quantity;
      groups[groupKey].records.push(record);
    });

    return Object.values(groups).sort(
      (a, b) =>
        new Date(
          b.records[0].inbound_date || b.records[0].created_at
        ).getTime() -
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

  const getGroupKey = (group: GroupedOutbound) =>
    `${group.date}-${group.client_name}`;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">출고관리</h1>
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
            <span>신규출고</span>
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-8 text-center">
            <div className="text-text-secondary">
              출고 기록을 불러오는 중...
            </div>
          </div>
        ) : outboundRecords.length === 0 ? (
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
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-primary mb-2">
              출고 기록이 없습니다
            </h2>
            <p className="text-text-secondary mb-4">
              첫 번째 출고를 등록해보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {outboundRecords.map((group) => {
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
                      <div className="font-semibold text-primary flex-1">
                        {group.client_name}
                      </div>
                      <div className="text-sm text-accent-soft flex-shrink-0">
                        총 {group.total_quantity}개
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
                                CFN
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
                                    <div className="text-sm font-medium text-primary">
                                      {record.product?.cfn || "-"}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                    {record.lot_number || "-"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                    {record.ubd_date
                                      ? new Date(
                                          record.ubd_date
                                        ).toLocaleDateString("ko-KR")
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

      {/* 출고 방식 선택 모달 */}
      <OutboundMethodModal
        isOpen={isMethodModalOpen}
        onClose={() => setIsMethodModalOpen(false)}
      />
    </div>
  );
}
