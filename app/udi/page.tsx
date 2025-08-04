"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";
import Button from "../components/ui/Button";
import { UDIRecord } from "../../types/udi";
import { formatDate } from "../components/ui/Table";
import Accordion, { AccordionItem } from "../components/ui/Accordion";
import { TableLoading } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import Table, { TableColumn } from "../components/ui/Table";
import LoadMoreButton from "../components/ui/LoadMoreButton";
import { usePagination } from "../../hooks/usePagination";

interface GroupedUDI {
  date: string;
  client_name: string;
  total_quantity: number;
  records: UDIRecord[];
}

export default function UDIPage() {
  const [udiRecords, setUdiRecords] = useState<GroupedUDI[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [clientMap, setClientMap] = useState<Map<string, {id: string, company_name: string}>>(new Map());
  
  const {
    loading,
    loadingMore,
    hasMore,
    getDateRange,
    updateHasMore,
    resetPagination,
    nextPage,
    setLoadingState,
  } = usePagination({ initialMonths: 3 }); // 임시로 3개월로 확장

  useEffect(() => {
    fetchUDIRecords(true); // 초기 로드
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUDIRecords = async (isInitial = false) => {
    try {
      setLoadingState(isInitial, true);
      
      if (isInitial) {
        setUdiRecords([]);
        resetPagination();
      }

      const { startDate, endDate } = getDateRange(isInitial);
      
      console.log(`[UDI 페이지] ${isInitial ? '초기' : '더보기'} 조회:`, {
        startDate: new Date(startDate).toLocaleString('ko-KR'),
        endDate: new Date(endDate).toLocaleString('ko-KR')
      });

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
        .gte("created_at", startDate)
        .lt("created_at", endDate)
        .order("inbound_date", { ascending: false });

      if (movementsError) throw movementsError;

      console.log(`[UDI 페이지] 조회 결과: ${movements?.length || 0}개 레코드`);
      if (movements && movements.length > 0) {
        console.log('첫 번째 레코드:', movements[0]);
      }

      const hasData = movements && movements.length > 0;
      updateHasMore(hasData);

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
            .select("id, cfn, upn, description, client_id")
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

      // 거래처 정보 조회
      const clientIds = [
        ...new Set(productsResult.data?.map(p => p.client_id).filter(Boolean) || [])
      ];
      
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, company_name")
          .in("id", clientIds);
        
        if (!clientsError && clientsData) {
          setClientMap(new Map(clientsData.map(c => [c.id, c])));
        }
      }

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
      
      if (isInitial) {
        setUdiRecords(grouped);
      } else {
        // 기존 그룹과 새 그룹을 병합 (중복 키 방지)
        setUdiRecords((prev) => {
          const existingGroups = new Map(prev.map(group => [getGroupKey(group), group]));
          
          grouped.forEach(newGroup => {
            const key = getGroupKey(newGroup);
            if (existingGroups.has(key)) {
              // 기존 그룹에 새 기록들 추가
              const existingGroup = existingGroups.get(key)!;
              existingGroup.records = [...existingGroup.records, ...newGroup.records];
              existingGroup.total_quantity += newGroup.total_quantity;
            } else {
              // 새 그룹 추가
              existingGroups.set(key, newGroup);
            }
          });
          
          return Array.from(existingGroups.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        });
        nextPage();
      }
    } catch {
      console.error("UDI 기록 조회 실패:");
    } finally {
      setLoadingState(isInitial, false);
    }
  };

  // 더보기 버튼 클릭 핸들러
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchUDIRecords(false);
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

    if (newSelected.has(groupKey)) {
      newSelected.delete(groupKey);
    } else {
      newSelected.add(groupKey);
    }

    setSelectedGroups(newSelected);
  };

  const getGroupKey = (group: GroupedUDI) =>
    `${group.date}-${group.client_name}`;

  const downloadExcel = () => {
    if (selectedGroups.size === 0) {
      alert("다운로드할 항목을 선택해주세요.");
      return;
    }

    // 선택된 그룹들의 데이터를 엑셀 형식으로 변환
    const excelData: Record<string, string | number>[] = [];

    udiRecords.forEach((group) => {
      const groupKey = getGroupKey(group);
      if (selectedGroups.has(groupKey)) {
        // 그룹 헤더 추가
        excelData.push({
          날짜: group.date,
          내용: "출고",
          거래처: group.client_name,
          총수량: group.total_quantity, // 숫자
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
            const cfn = record.product?.cfn || "";
            const clientId = record.product?.client_id;
            const client = clientId ? clientMap.get(clientId) : null;
            const clientName = client?.company_name || "";

            if (upn && ubdDate && lotNumber) {
              // UBD를 YYMMDD 형식으로 변환
              const ubd = new Date(ubdDate);
              const year = ubd.getFullYear().toString().slice(-2);
              const month = (ubd.getMonth() + 1).toString().padStart(2, "0");
              const day = ubd.getDate().toString().padStart(2, "0");
              const ubdFormatted = `${year}${month}${day}`;

              // 디버깅 로그
              console.log(`CFN: ${cfn}, UPN: ${upn}, 거래처: ${clientName}, LOT: ${lotNumber}, UBD: ${ubdFormatted}`);

              // 새로운 바코드 형식을 사용할지 결정
              // 방법 1: CFN 패턴으로 판단 (225-로 시작하는 제품들)
              // 방법 2: 거래처명으로 판단
              // 방법 3: UPN 패턴으로 판단
              
              const useNewFormat = 
                cfn.startsWith("225-") || // CFN이 225-로 시작
                upn.startsWith("0693495594"); // 또는 UPN이 특정 패턴

              if (useNewFormat) {
                // 새로운 GS1-128 형식: (01) + (17) + (30) + | + (10)
                gs1Format = `(01)${upn}(17)${ubdFormatted}(30)1|(10)${lotNumber}`;
                console.log(`새로운 형식 적용 (CFN: ${cfn}, 거래처: ${clientName}): ${gs1Format}`);
              } else {
                // 기존 GS1-128 형식: (01) + (17) + (10)
                gs1Format = `(01)${upn}(17)${ubdFormatted}(10)${lotNumber}`;
                console.log(`기존 형식 적용 (CFN: ${cfn}, 거래처: ${clientName}): ${gs1Format}`);
              }
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
              수량: record.quantity, // 숫자
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

  // 테이블 컬럼 정의
  const udiColumns: TableColumn<UDIRecord>[] = [
    {
      key: 'product',
      header: 'CFN',
      render: (_, record) => (
        <div className="text-sm font-medium text-primary">
          {record.product?.cfn || "-"}
        </div>
      ),
    },
    {
      key: 'lot_number',
      header: 'LOT',
      render: (value) => (
        <div className="text-sm text-text-secondary">
          {value || "-"}
        </div>
      ),
    },
    {
      key: 'ubd_date',
      header: 'UBD',
      render: (value) => (
        <div className="text-sm text-text-secondary">
          {value ? formatDate(value) : "-"}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: '수량',
      render: (value) => (
        <div className="text-sm text-text-secondary">
          {value}개
        </div>
      ),
    },
    {
      key: 'notes',
      header: '비고',
      render: (value) => (
        <div className="text-sm text-text-secondary">
          {value || "-"}
        </div>
      ),
    },
  ];

  const accordionItems: AccordionItem[] = udiRecords.map((group) => {
    const groupKey = getGroupKey(group);
    const isSelected = selectedGroups.has(groupKey);
    
    return {
      id: groupKey,
      defaultExpanded: false, // 기본적으로 모든 아코디언을 닫힌 상태로 설정
      header: (
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleGroupSelection(groupKey)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-text-secondary w-24 flex-shrink-0">
                {formatDate(group.records[0].inbound_date || group.records[0].created_at)}
              </div>
              <div className="font-semibold text-primary flex-1">
                {group.records[0].to_location?.location_name || "미지정"}
              </div>
              <div className="text-sm text-accent-soft flex-shrink-0">
                {group.records.length}개 제품
              </div>
            </div>
          </div>
        </div>
      ),
      content: (
        <div className="border-t border-accent-light">
          <Table
            columns={udiColumns}
            data={group.records.sort((a, b) => {
              const cfnA = a.product?.cfn || "";
              const cfnB = b.product?.cfn || "";
              return cfnA.localeCompare(cfnB);
            })}
            className="border-none"
          />
        </div>
      ),
    };
  });

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">UDI 관리</h1>
          <Button
            onClick={downloadExcel}
            disabled={selectedGroups.size === 0}
            variant="primary"
            icon={
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
            }
          >
            다운로드 ({selectedGroups.size})
          </Button>
        </div>

        {loading ? (
          <TableLoading message="UDI 기록을 불러오는 중..." />
        ) : udiRecords.length === 0 ? (
          <EmptyState
            title="UDI 기록이 없습니다"
            message="출고 기록이 있으면 UDI 데이터가 표시됩니다."
            icon={
              <svg
                className="w-16 h-16 text-accent-soft"
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
            }
          />
        ) : (
          <div>
            <Accordion items={accordionItems} allowMultiple={true} />
            
            {/* 더보기 버튼 */}
            <LoadMoreButton
              hasMore={hasMore}
              loading={loadingMore}
              onClick={handleLoadMore}
            />
          </div>
        )}
      </div>
    </div>
  );
}
