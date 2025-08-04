"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import ExchangeMethodModal from "../components/modals/ExchangeMethodModal";
import Button from "../components/ui/Button";
import { ExchangeTypeBadge } from "../components/ui/Badge";
import { PlusIcon } from "../components/ui/Icons";
import Accordion, { AccordionItem, AccordionHeader } from "../components/ui/Accordion";
import { TableLoading } from "../components/ui/LoadingSpinner";
import { ExchangeEmptyState } from "../components/ui/EmptyState";
import LoadMoreButton from "../components/ui/LoadMoreButton";
import { usePagination } from "../../hooks/usePagination";

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
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  
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
    fetchExchangeRecords(true);
  }, []);

  const fetchExchangeRecords = async (isInitial = false) => {
    try {
      setLoadingState(isInitial, true);
      
      if (isInitial) {
        setExchangeRecords([]);
        resetPagination();
      }

      const { startDate, endDate } = getDateRange(isInitial);
      
      console.log(`[교환 페이지] ${isInitial ? '초기' : '더보기'} 조회:`, {
        startDate: new Date(startDate).toLocaleString('ko-KR'),
        endDate: new Date(endDate).toLocaleString('ko-KR')
      });

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
        .gte("created_at", startDate)
        .lt("created_at", endDate)
        .order("inbound_date", { ascending: false });

      if (movementsError) throw movementsError;

      console.log(`[교환 페이지] 조회 결과: ${movements?.length || 0}개 레코드`);
      if (movements && movements.length > 0) {
        console.log('첫 번째 레코드:', movements[0]);
      }

      const hasData = movements && movements.length > 0;
      updateHasMore(hasData);

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

      // 날짜별로 그룹핑
      const grouped = groupExchangeRecords(enrichedMovements);
      
      if (isInitial) {
        setExchangeRecords(grouped);
      } else {
        // 기존 그룹과 새 그룹을 병합 (중복 키 방지)
        setExchangeRecords((prev) => {
          const existingGroups = new Map(prev.map(group => [`${group.date}-${group.location_name}`, group]));
          
          grouped.forEach(newGroup => {
            const key = `${newGroup.date}-${newGroup.location_name}`;
            if (existingGroups.has(key)) {
              // 기존 그룹에 새 기록들 추가
              const existingGroup = existingGroups.get(key)!;
              existingGroup.records = [...existingGroup.records, ...newGroup.records];
              existingGroup.total_out_quantity += newGroup.total_out_quantity;
              existingGroup.total_in_quantity += newGroup.total_in_quantity;
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
      console.error("교환 기록 조회 실패:", err);
    } finally {
      setLoadingState(isInitial, false);
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

  // 아코디언 아이템 생성
  const accordionItems: AccordionItem[] = exchangeRecords.map((group) => ({
    id: `${group.date}-${group.location_name}`,
    header: (
      <AccordionHeader
        date={group.date}
        title={group.location_name}
        subtitle={`회수 ${group.total_out_quantity}ea / 교환 ${group.total_in_quantity}ea`}
      />
    ),
    content: (
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
            {group.records.map((record) => (
              <tr key={record.id} className="hover:bg-accent-light">
                <td className="px-6 py-4 whitespace-nowrap">
                  <ExchangeTypeBadge type={record.movement_type} />
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
    ),
  }));

  // 더보기 버튼 클릭 핸들러
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchExchangeRecords(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">교환관리</h1>
          <Button
            onClick={() => setIsMethodModalOpen(true)}
            variant="primary"
            icon={<PlusIcon />}
          >
            신규교환
          </Button>
        </div>

        {loading ? (
          <TableLoading message="교환 기록을 불러오는 중..." />
        ) : exchangeRecords.length === 0 ? (
          <ExchangeEmptyState onAddClick={() => setIsMethodModalOpen(true)} />
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