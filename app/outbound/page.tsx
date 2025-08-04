"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import OutboundMethodModal from "../components/modals/OutboundMethodModal";
import Button from "../components/ui/Button";
import Table, { TableColumn } from "../components/ui/Table";
import { PlusIcon } from "../components/ui/Icons";
import Accordion, { AccordionItem, AccordionHeader } from "../components/ui/Accordion";
import { TableLoading } from "../components/ui/LoadingSpinner";
import { OutboundEmptyState } from "../components/ui/EmptyState";
import LoadMoreButton from "../components/ui/LoadMoreButton";
import { usePagination } from "../../hooks/usePagination";

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
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const router = useRouter();
  
  const {
    loading,
    loadingMore,
    hasMore,
    getDateRange,
    updateHasMore,
    resetPagination,
    nextPage,
    setLoadingState,
    getCurrentPeriodInfo,
  } = usePagination({ initialMonths: 3 }); // 임시로 3개월로 확장

  useEffect(() => {
    fetchOutboundRecords(true);
  }, []);

  const fetchOutboundRecords = async (isInitial = false) => {
    try {
      setLoadingState(isInitial, true);
      
      if (isInitial) {
        setOutboundRecords([]);
        resetPagination();
      }

      const { startDate, endDate } = getDateRange(isInitial);
      
      console.log(`[출고 페이지] ${isInitial ? '초기' : '더보기'} 조회:`, {
        startDate: new Date(startDate).toLocaleString('ko-KR'),
        endDate: new Date(endDate).toLocaleString('ko-KR')
      });

      // stock_movements에서 출고 기록 조회 (movement_type = 'out', movement_reason = 'sale')
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

      console.log(`[출고 페이지] 조회 결과: ${movements?.length || 0}개 레코드`);
      if (movements && movements.length > 0) {
        console.log('첫 번째 레코드:', movements[0]);
      }

      const hasData = movements && movements.length > 0;
      updateHasMore(hasData);

      // 제품 정보와 병원 정보를 별도로 조회
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

      // 날짜별로 그룹핑
      const grouped = groupOutboundRecords(enrichedMovements);
      
      if (isInitial) {
        setOutboundRecords(grouped);
      } else {
        // 기존 그룹과 새 그룹을 병합 (중복 키 방지)
        setOutboundRecords((prev) => {
          const existingGroups = new Map(prev.map(group => [group.date, group]));
          
          grouped.forEach(newGroup => {
            const key = newGroup.date;
            if (existingGroups.has(key)) {
              // 기존 그룹에 새 기록들 추가
              const existingGroup = existingGroups.get(key)!;
              existingGroup.records = [...existingGroup.records, ...newGroup.records];
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
    } catch (err) {
      console.error("출고 기록 조회 실패:", err);
    } finally {
      setLoadingState(isInitial, false);
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

  // 테이블 컬럼 정의
  const outboundColumns: TableColumn<OutboundRecord>[] = [
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
      key: 'ubd_date',
      header: 'UBD',
      render: (value) => (
        <span className="text-sm text-text-secondary">
          {value ? new Date(value).toLocaleDateString("ko-KR") : "-"}
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
    {
      key: 'notes',
      header: '비고',
      render: (value) => (
        <span className="text-sm text-text-secondary">
          {value || "-"}
        </span>
      ),
    },
  ];

  // 아코디언 아이템 생성
  const accordionItems: AccordionItem[] = outboundRecords.map((group) => ({
    id: `${group.date}-${group.client_name}`,
    header: (
      <AccordionHeader
        date={group.date}
        title={group.client_name}
        subtitle={`총 ${group.total_quantity}개`}
      />
    ),
    content: (
      <Table
        columns={outboundColumns}
        data={group.records.sort((a, b) => {
          const cfnA = a.product?.cfn || "";
          const cfnB = b.product?.cfn || "";
          return cfnA.localeCompare(cfnB);
        })}
        className="border-none"
      />
    ),
  }));

  // 더보기 버튼 클릭 핸들러
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchOutboundRecords(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">출고관리</h1>
          <Button
            onClick={() => setIsMethodModalOpen(true)}
            variant="primary"
            icon={<PlusIcon />}
          >
            신규출고
          </Button>
        </div>

        {loading ? (
          <TableLoading message="출고 기록을 불러오는 중..." />
        ) : outboundRecords.length === 0 ? (
          <OutboundEmptyState onAddClick={() => setIsMethodModalOpen(true)} />
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

      {/* 출고 방식 선택 모달 */}
      <OutboundMethodModal
        isOpen={isMethodModalOpen}
        onClose={() => setIsMethodModalOpen(false)}
      />
    </div>
  );
}
