import { useState, useEffect } from 'react';
import {
  fetchStockMovements,
  buildProductMap,
  buildClientMap,
  calculateInventory,
  calculateCFNInventory,
  calculateAvailableStock,
  calculateAvailableLots,
  sortByCfnNumeric,
  ABLE_LOCATION_ID
} from '../../utils/inventory';
import type {
  InventoryItem,
  CFNInventoryItem,
  AvailableStock,
  LotInfo,
  InventoryResponse,
  InventoryCalculationOptions
} from '../../types/inventory';

export interface AbleInventoryOptions extends InventoryCalculationOptions {
  autoFetch?: boolean;
  includeCFNInventory?: boolean;
  includeAvailableStock?: boolean;
}

/**
 * ABLE 중앙창고 재고 관리 Custom Hook
 * 
 * 기존 6개 파일에서 중복되던 ABLE 중앙창고 재고 계산 로직을 통합
 * - AbleInventory.tsx
 * - outbound/manual/page.tsx
 * - hooks/useOrderData.ts
 * - short-ubd/page.tsx
 * - page.tsx (홈페이지)
 * - outbound/scan/page.tsx
 */
export const useAbleInventory = (options: AbleInventoryOptions = {}) => {
  const {
    autoFetch = true,
    includeCFNInventory = false,
    includeAvailableStock = false,
    ...calculationOptions
  } = options;

  // 상태 관리
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [originalInventory, setOriginalInventory] = useState<InventoryItem[]>([]);
  const [cfnInventory, setCfnInventory] = useState<CFNInventoryItem[]>([]);
  const [availableStock, setAvailableStock] = useState<AvailableStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 정렬 상태
  const [numericSort, setNumericSort] = useState(false);

  /**
   * ABLE 중앙창고 재고 데이터 조회 및 계산
   */
  const fetchAbleInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. 재고 이동 데이터 조회
      const movements = await fetchStockMovements(ABLE_LOCATION_ID);
      
      if (movements.length === 0) {
        setInventory([]);
        setOriginalInventory([]);
        setCfnInventory([]);
        setAvailableStock([]);
        return;
      }

      // 2. 제품 ID 목록 추출
      const productIds = [...new Set(movements.map(m => m.product_id).filter(Boolean))];
      
      if (productIds.length === 0) {
        setInventory([]);
        setOriginalInventory([]);
        setCfnInventory([]);
        setAvailableStock([]);
        return;
      }

      // 3. 제품 및 거래처 정보 조회
      const [productMap, clientMap] = await Promise.all([
        buildProductMap(productIds),
        buildClientMap([...new Set(Array.from((await buildProductMap(productIds)).values())
          .map(p => p.client_id).filter(Boolean))])
      ]);

      // 4. 기본 재고 계산
      const inventoryData = calculateInventory(
        movements,
        ABLE_LOCATION_ID,
        productMap,
        clientMap,
        calculationOptions
      );

      setInventory(inventoryData);
      setOriginalInventory(inventoryData);

      // 5. CFN별 집계 재고 계산 (옵션)
      if (includeCFNInventory) {
        const cfnData = calculateCFNInventory(
          movements,
          ABLE_LOCATION_ID,
          productMap,
          clientMap
        );
        setCfnInventory(cfnData);
      }

      // 6. 가용 재고 계산 (옵션)
      if (includeAvailableStock) {
        const stockData = calculateAvailableStock(
          movements,
          ABLE_LOCATION_ID,
          productMap
        );
        setAvailableStock(stockData);
      }

    } catch (err) {
      console.error("ABLE 재고 조회 실패:", err);
      setError("재고 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 특정 CFN의 LOT 목록 조회
   */
  const fetchAvailableLots = async (cfn: string): Promise<LotInfo[]> => {
    try {
      const movements = await fetchStockMovements(ABLE_LOCATION_ID);
      const productMap = await buildProductMap();
      
      return calculateAvailableLots(movements, ABLE_LOCATION_ID, cfn, productMap);
    } catch (err) {
      console.error("LOT 목록 조회 실패:", err);
      return [];
    }
  };

  /**
   * CFN 정렬 방식 토글
   */
  const toggleCfnSort = () => {
    const newSortType = !numericSort;
    setNumericSort(newSortType);
    
    if (newSortType) {
      const sorted = sortByCfnNumeric(originalInventory);
      setInventory(sorted);
    } else {
      // 기본 정렬
      const sorted = [...originalInventory].sort((a, b) => {
        if (a.cfn !== b.cfn) return a.cfn.localeCompare(b.cfn);
        if (a.lot_number !== b.lot_number) return a.lot_number.localeCompare(b.lot_number);
        return a.ubd_date.localeCompare(b.ubd_date);
      });
      setInventory(sorted);
    }
  };

  /**
   * 재고 검색/필터링
   */
  const filterInventory = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setInventory(originalInventory);
      return;
    }

    const filtered = originalInventory.filter(item =>
      item.cfn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lot_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setInventory(filtered);
  };

  /**
   * 수동 새로고침
   */
  const refetch = () => {
    fetchAbleInventory();
  };

  // 자동 조회
  useEffect(() => {
    if (autoFetch) {
      fetchAbleInventory();
    }
  }, [autoFetch]);

  return {
    // 데이터
    inventory,
    originalInventory,
    cfnInventory,
    availableStock,
    
    // 상태
    loading,
    error,
    numericSort,
    
    // 액션
    fetchAbleInventory,
    fetchAvailableLots,
    toggleCfnSort,
    filterInventory,
    refetch,
    
    // 유틸리티
    locationId: ABLE_LOCATION_ID,
  };
}; 