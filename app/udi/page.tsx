"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";

interface UDIRecord {
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
    upn: string;
    description: string;
  };
  to_location?: {
    location_name: string;
  };
}

interface GroupedUDI {
  date: string;
  client_name: string;
  total_quantity: number;
  records: UDIRecord[];
}

export default function UDIPage() {
  const [udiRecords, setUdiRecords] = useState<GroupedUDI[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUDIRecords();
  }, []);

  const fetchUDIRecords = async () => {
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
            .select("id, cfn, upn, description")
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
      const grouped = groupUDIRecords(enrichedMovements);
      setUdiRecords(grouped);
    } catch {
      console.error("UDI 기록 조회 실패:");
    } finally {
      setLoading(false);
    }
  };

  const groupUDIRecords = (records: UDIRecord[]): GroupedUDI[] => {
    const groups: { [key: string]: GroupedUDI } = {};

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

  const toggleGroupSelection = (groupKey: string) => {
    const newSelected = new Set(selectedGroups);
    const newExpanded = new Set(expandedGroups);

    if (newSelected.has(groupKey)) {
      newSelected.delete(groupKey);
      newExpanded.delete(groupKey);
    } else {
      newSelected.add(groupKey);
      newExpanded.add(groupKey);
    }

    setSelectedGroups(newSelected);
    setExpandedGroups(newExpanded);
  };

  const getGroupKey = (group: GroupedUDI) =>
    `${group.date}-${group.client_name}`;

  const downloadExcel = () => {
    if (selectedGroups.size === 0) {
      alert("다운로드할 항목을 선택해주세요.");
      return;
    }

    // 선택된 그룹들의 데이터를 엑셀 형식으로 변환
    const excelData: Record<string, string>[] = [];

    udiRecords.forEach((group) => {
      const groupKey = getGroupKey(group);
      if (selectedGroups.has(groupKey)) {
        // 그룹 헤더 추가
        excelData.push({
          날짜: group.date,
          내용: "출고",
          거래처: group.client_name,
          총수량: `${group.total_quantity}개`,
          CFN: "",
          LOT: "",
          UBD: "",
          수량: "",
          비고: "",
          "": "", // 빈 칸
          "GS1 UDI": "",
        });

        // 상세 데이터 추가
        group.records
          .sort((a, b) => {
            const cfnA = a.product?.cfn || "";
            const cfnB = b.product?.cfn || "";
            return cfnA.localeCompare(cfnB);
          })
          .forEach((record) => {
            // GS1 형식 생성
            let gs1Format = "";
            const upn = record.product?.upn || "";
            const ubdDate = record.ubd_date;
            const lotNumber = record.lot_number || "";

            if (upn && ubdDate && lotNumber) {
              // UBD를 YYMMDD 형식으로 변환
              const ubd = new Date(ubdDate);
              const year = ubd.getFullYear().toString().slice(-2);
              const month = (ubd.getMonth() + 1).toString().padStart(2, "0");
              const day = ubd.getDate().toString().padStart(2, "0");
              const ubdFormatted = `${year}${month}${day}`;

              // UPN을 GTIN으로 사용
              gs1Format = `(01)${upn}(17)${ubdFormatted}(10)${lotNumber}`;
            }

            excelData.push({
              날짜: "",
              내용: "",
              거래처: "",
              총수량: "",
              CFN: record.product?.cfn || "-",
              LOT: record.lot_number || "-",
              UBD: record.ubd_date
                ? new Date(record.ubd_date).toLocaleDateString("ko-KR")
                : "-",
              수량: `${record.quantity}개`,
              비고: record.notes || "-",
              "": "", // 빈 칸
              "GS1 UDI": gs1Format,
            });
          });

        // 빈 행 추가
        excelData.push({
          날짜: "",
          내용: "",
          거래처: "",
          총수량: "",
          CFN: "",
          LOT: "",
          UBD: "",
          수량: "",
          비고: "",
          "": "",
          "GS1 UDI": "",
        });
      }
    });

    // 엑셀 파일 생성
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "UDI 데이터");

    // 파일 다운로드
    const fileName = `UDI_데이터_${new Date().toLocaleDateString(
      "ko-KR"
    )}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">UDI 관리</h1>
          <button
            onClick={downloadExcel}
            disabled={selectedGroups.size === 0}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              selectedGroups.size === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-primary text-text-primary hover:bg-accent-soft"
            }`}
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>다운로드 ({selectedGroups.size})</span>
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-8 text-center">
            <div className="text-text-secondary">UDI 기록을 불러오는 중...</div>
          </div>
        ) : udiRecords.length === 0 ? (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-primary mb-2">
              UDI 기록이 없습니다
            </h2>
            <p className="text-text-secondary mb-4">
              출고 기록이 있으면 UDI 데이터가 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {udiRecords.map((group) => {
              const groupKey = getGroupKey(group);
              const isSelected = selectedGroups.has(groupKey);
              const isExpanded = expandedGroups.has(groupKey);

              return (
                <div
                  key={groupKey}
                  className="bg-white rounded-lg shadow-sm border border-accent-soft overflow-hidden"
                >
                  {/* 아코디언 헤더 */}
                  <div className="w-full px-6 py-4 flex items-center justify-between hover:bg-accent-light transition-colors">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleGroupSelection(groupKey)}
                        className="w-5 h-5 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
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
                  </div>

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
    </div>
  );
}
