"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Button from "../components/ui/Button";
import Table, { TableColumn } from "../components/ui/Table";
import { PlusIcon } from "../components/ui/Icons";
import Accordion, { AccordionItem, AccordionHeader } from "../components/ui/Accordion";
import { TableLoading } from "../components/ui/LoadingSpinner";
import { UsageEmptyState } from "../components/ui/EmptyState";
import LoadMoreButton from "../components/ui/LoadMoreButton";

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
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentYears, setCurrentYears] = useState(1); // 년도 기반
  const router = useRouter();

  useEffect(() => {
    fetchUsedRecords(true);
  }, []);

  // 년도별 날짜 범위 계산
  const getYearDateRange = (isInitial: boolean) => {
    const today = new Date();
    const currentYear = today.getFullYear();

    if (isInitial) {
      // 초기 로드: 현재 년도만
      const startDate = new Date(currentYear, 0, 1); // 1월 1일
      const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999); // 12월 31일
      
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    } else {
      // 더보기: 새로운 년도만 조회 (currentYears번째 이전 년도)
      const targetYear = currentYear - currentYears;
      const startDate = new Date(targetYear, 0, 1); // 해당 년도 1월 1일
      const endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999); // 해당 년도 12월 31일
      
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    }
  };

  const fetchUsedRecords = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
        setUsedRecords([]);
        setCurrentYears(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const { startDate, endDate } = getYearDateRange(isInitial);

      // 디버깅: 마감관리 날짜 범위 확인
      console.log('🗓️ 마감관리 날짜 범위:', {
        isInitial,
        startDate,
        endDate,
        currentYears
      });

      // stock_movements에서 사용 기록 조회 (movement_type = 'out', movement_reason = 'used' or 'manual_used' or 'usage')
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
        .in("movement_reason", ["used", "manual_used", "usage"])
        .gte("created_at", startDate)
        .lt("created_at", endDate)
        .order("inbound_date", { ascending: false });

      if (movementsError) throw movementsError;

      // 디버깅: 마감관리 조회 결과 확인
      console.log('📊 마감관리 조회 결과:', {
        movementsCount: movements?.length || 0,
        movements: movements?.slice(0, 5) // 처음 5개만 로깅
      });

      const hasData = movements && movements.length > 0;
      // 최대 5년까지만 조회 허용
      setHasMore(currentYears < 5);

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
      
      if (isInitial) {
        setUsedRecords(grouped);
      } else {
        // 기존 그룹과 새 그룹을 병합 (중복 키 방지)
        setUsedRecords((prev) => {
          const existingGroups = new Map(prev.map(group => [`${group.date}-${group.hospital_name}`, group]));
          
          grouped.forEach(newGroup => {
            const key = `${newGroup.date}-${newGroup.hospital_name}`;
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
        setCurrentYears(prev => prev + 1); // 년도 증가
      }
    } catch (err) {
      console.error("사용 기록 조회 실패:", err);
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
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

  // 테이블 컬럼 정의
  const usedColumns: TableColumn<UsedRecord>[] = [
    {
      key: 'inbound_date',
      header: '사용일',
      render: (value, item) => (
        <span className="text-sm text-text-secondary">
          {item.inbound_date
            ? new Date(item.inbound_date).toLocaleDateString("ko-KR")
            : item.created_at
            ? new Date(item.created_at).toLocaleDateString("ko-KR")
            : "-"}
        </span>
      ),
    },
    {
      key: 'product',
      header: 'CFN',
      render: (value, item) => (
        <div className="text-sm font-medium text-primary">
          {item.product?.cfn || "-"}
        </div>
      ),
    },
    {
      key: 'lot_number',
      header: 'LOT',
      render: (value) => (
        <span className="text-sm text-text-secondary">
          {value || "-"}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: '수량',
      render: (value) => (
        <span className="text-sm text-text-secondary">
          {value}개
        </span>
      ),
    },
  ];

  // 아코디언 아이템 생성
  const accordionItems: AccordionItem[] = usedRecords.map((group) => ({
    id: `${group.date}-${group.hospital_name}`,
    header: (
      <AccordionHeader
        date={(() => {
          // group.date가 이미 "2025-02" 형식
          const [year, month] = group.date.split("-");
          const shortYear = year.slice(-2); // 25
          return `${shortYear}-${month}`;
        })()}
        title={group.hospital_name}
        subtitle={`총 ${group.total_quantity}ea`}
      />
    ),
    content: (
      <div className="overflow-x-auto">
        <Table
          columns={usedColumns}
          data={group.records}
          className="w-full"
        />
      </div>
    ),
  }));

  // 더보기 버튼 클릭 핸들러
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchUsedRecords(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">사용기록</h1>
          <Button
            onClick={() => {
              router.push("/closing/manual");
            }}
            variant="primary"
            icon={<PlusIcon />}
          >
            사용분
          </Button>
        </div>

        {loading ? (
          <TableLoading message="사용 기록을 불러오는 중..." />
        ) : usedRecords.length === 0 ? (
          <UsageEmptyState onAddClick={() => router.push("/closing/manual")} />
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
