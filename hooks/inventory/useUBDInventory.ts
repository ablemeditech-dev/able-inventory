import { useState, useEffect } from 'react';
import {
  fetchStockMovements,
  buildProductMap,
  buildClientMap,
  calculateUBDInventory,
  ABLE_LOCATION_ID
} from '../../utils/inventory';
import { supabase } from '../../lib/supabase';
import type {
  UBDInventoryItem,
  InventoryCalculationOptions
} from '../../types/inventory';

export interface UBDInventoryOptions extends InventoryCalculationOptions {
  autoFetch?: boolean;
  includeAllLocations?: boolean;
  limitResults?: number;
  daysThreshold?: number;
}

interface Hospital {
  id: string;
  hospital_name: string;
}

/**
 * UBD(유통기한) 기반 재고 관리 Custom Hook
 * 
 * 기존 2개 파일에서 중복되던 UBD 재고 계산 로직을 통합
 * - short-ubd/page.tsx (전체 UBD 재고 목록)
 * - page.tsx (홈페이지 - 상위 5개 UBD 재고)
 */
export const useUBDInventory = (options: UBDInventoryOptions = {}) => {
  const {
    autoFetch = true,
    includeAllLocations = true,
    limitResults = 0,
    daysThreshold = 365,
    ...calculationOptions
  } = options;

  // 상태 관리
  const [ubdInventory, setUbdInventory] = useState<UBDInventoryItem[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 모든 위치의 UBD 기반 재고 조회
   */
  const fetchUBDInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. 병원 정보 조회
      const { data: hospitalData, error: hospitalsError } = await supabase
        .from("hospitals")
        .select("id, hospital_name")
        .order("hospital_name");

      if (hospitalsError) throw hospitalsError;

      const hospitalList = hospitalData || [];
      setHospitals(hospitalList);

      // 2. 모든 재고 이동 데이터 조회
      const { data: movements, error: movementsError } = await supabase
        .from("stock_movements")
        .select(`
          product_id,
          lot_number,
          ubd_date,
          quantity,
          movement_type,
          movement_reason,
          from_location_id,
          to_location_id
        `)
        .order("created_at", { ascending: false });

      if (movementsError) throw movementsError;

      if (!movements || movements.length === 0) {
        setUbdInventory([]);
        return;
      }

      // 3. 제품 정보 조회
      const productIds = [...new Set(movements.map(m => m.product_id).filter(Boolean))];
      
      if (productIds.length === 0) {
        setUbdInventory([]);
        return;
      }

      const productMap = await buildProductMap(productIds);

      // 4. 모든 위치의 UBD 재고 계산
      const allUBDInventory: UBDInventoryItem[] = [];

      // 4-1. ABLE 중앙창고 재고 계산
      const ableUBDInventory = calculateUBDInventory(
        movements,
        ABLE_LOCATION_ID,
        "ABLE 중앙창고",
        productMap
      );
      allUBDInventory.push(...ableUBDInventory);

      // 4-2. 각 병원별 재고 계산 (옵션)
      if (includeAllLocations) {
        for (const hospital of hospitalList) {
          const hospitalUBDInventory = calculateUBDInventory(
            movements,
            hospital.id,
            hospital.hospital_name,
            productMap
          );
          allUBDInventory.push(...hospitalUBDInventory);
        }
      }

      // 5. UBD 기준 필터링 및 정렬
      let filteredInventory = allUBDInventory
        .filter(item => item.days_until_expiry > 0 && item.days_until_expiry <= daysThreshold)
        .sort((a, b) => {
          // UBD 날짜로 정렬 (가까운 순)
          if (a.days_until_expiry !== b.days_until_expiry) {
            return a.days_until_expiry - b.days_until_expiry;
          }

          // 같은 UBD 날짜 내에서는 병원 우선, ABLE 중앙창고 후순위
          if (a.location_name === "ABLE 중앙창고" && b.location_name !== "ABLE 중앙창고") {
            return 1;
          }
          if (b.location_name === "ABLE 중앙창고" && a.location_name !== "ABLE 중앙창고") {
            return -1;
          }

          // 같은 위치 타입이면 위치명으로 정렬
          return a.location_name.localeCompare(b.location_name);
        });

      // 6. 결과 개수 제한 (옵션)
      if (limitResults > 0) {
        filteredInventory = filteredInventory.slice(0, limitResults);
      }

      setUbdInventory(filteredInventory);
    } catch (error) {
      console.error("UBD 재고 조회 실패:", error);
      setError("UBD 재고 정보를 불러오는데 실패했습니다.");
      setUbdInventory([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 특정 일수 이내 만료 예정 재고 필터링
   */
  const getExpiringInventory = (days: number): UBDInventoryItem[] => {
    return ubdInventory.filter(item => 
      item.days_until_expiry > 0 && item.days_until_expiry <= days
    );
  };

  /**
   * 위치별 UBD 재고 그룹화
   */
  const getInventoryByLocation = (): Map<string, UBDInventoryItem[]> => {
    const locationMap = new Map<string, UBDInventoryItem[]>();
    
    ubdInventory.forEach(item => {
      if (!locationMap.has(item.location_name)) {
        locationMap.set(item.location_name, []);
      }
      locationMap.get(item.location_name)!.push(item);
    });
    
    return locationMap;
  };

  /**
   * CFN별 UBD 재고 그룹화
   */
  const getInventoryByCFN = (): Map<string, UBDInventoryItem[]> => {
    const cfnMap = new Map<string, UBDInventoryItem[]>();
    
    ubdInventory.forEach(item => {
      if (!cfnMap.has(item.cfn)) {
        cfnMap.set(item.cfn, []);
      }
      cfnMap.get(item.cfn)!.push(item);
    });
    
    return cfnMap;
  };

  /**
   * UBD 재고 요약 정보
   */
  const getUBDSummary = () => {
    const totalItems = ubdInventory.length;
    const totalQuantity = ubdInventory.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueLocations = new Set(ubdInventory.map(item => item.location_name)).size;
    const uniqueCFNs = new Set(ubdInventory.map(item => item.cfn)).size;
    
    // 만료 임박도별 분류
    const critical = ubdInventory.filter(item => item.days_until_expiry <= 7).length;  // 7일 이내
    const warning = ubdInventory.filter(item => item.days_until_expiry <= 30 && item.days_until_expiry > 7).length;  // 30일 이내
    const normal = ubdInventory.filter(item => item.days_until_expiry > 30).length;  // 30일 초과
    
    return {
      totalItems,
      totalQuantity,
      uniqueLocations,
      uniqueCFNs,
      critical,
      warning,
      normal,
    };
  };

  /**
   * 재고 검색/필터링
   */
  const filterInventory = (searchTerm: string): UBDInventoryItem[] => {
    if (!searchTerm.trim()) return ubdInventory;
    
    const term = searchTerm.toLowerCase();
    return ubdInventory.filter(item =>
      item.cfn.toLowerCase().includes(term) ||
      item.lot_number.toLowerCase().includes(term) ||
      item.location_name.toLowerCase().includes(term)
    );
  };

  /**
   * 재고 재조회
   */
  const refetch = () => {
    fetchUBDInventory();
  };

  /**
   * 재고 존재 여부 확인
   */
  const hasInventory = (): boolean => {
    return ubdInventory.length > 0;
  };

  // 자동 조회
  useEffect(() => {
    if (autoFetch) {
      fetchUBDInventory();
    }
  }, [autoFetch]);

  return {
    // 데이터
    ubdInventory,
    hospitals,
    
    // 상태
    loading,
    error,
    
    // 액션
    fetchUBDInventory,
    refetch,
    
    // 유틸리티
    getExpiringInventory,
    getInventoryByLocation,
    getInventoryByCFN,
    getUBDSummary,
    filterInventory,
    hasInventory,
  };
}; 