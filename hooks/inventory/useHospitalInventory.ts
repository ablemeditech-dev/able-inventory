import { useState, useEffect } from 'react';
import {
  fetchStockMovements,
  buildProductMap,
  buildClientMap,
  calculateInventory,
  calculateAvailableStock,
  calculateAvailableLots,
  calculateExchangeInventory,
  sortByCfnNumeric
} from '../../utils/inventory';
import type {
  InventoryItem,
  ExchangeInventoryItem,
  AvailableStock,
  LotInfo,
  InventoryCalculationOptions
} from '../../types/inventory';

export interface HospitalInventoryOptions extends InventoryCalculationOptions {
  autoFetch?: boolean;
  includeAvailableStock?: boolean;
  includeExchangeFormat?: boolean;
}

/**
 * 병원별 재고 관리 Custom Hook
 * 
 * 기존 5개 파일에서 중복되던 병원별 재고 계산 로직을 통합
 * - HospitalSpecificInventory.tsx
 * - HospitalInventory.tsx
 * - short-ubd/page.tsx
 * - page.tsx (홈페이지)
 * - closing/manual/page.tsx
 * - ExchangeMethodModal.tsx
 */
export const useHospitalInventory = (
  hospitalId: string,
  options: HospitalInventoryOptions = {}
) => {
  const {
    autoFetch = true,
    includeAvailableStock = false,
    includeExchangeFormat = false,
    ...calculationOptions
  } = options;

  // 상태 관리
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [originalInventory, setOriginalInventory] = useState<InventoryItem[]>([]);
  const [exchangeInventory, setExchangeInventory] = useState<ExchangeInventoryItem[]>([]);
  const [availableStock, setAvailableStock] = useState<AvailableStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 정렬 상태
  const [numericSort, setNumericSort] = useState(false);

  /**
   * 병원 재고 데이터 조회 및 계산
   */
  const fetchHospitalInventory = async () => {
    if (!hospitalId) {
      setInventory([]);
      setOriginalInventory([]);
      setExchangeInventory([]);
      setAvailableStock([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. 재고 이동 데이터 조회
      const movements = await fetchStockMovements(hospitalId);
      
      if (movements.length === 0) {
        setInventory([]);
        setOriginalInventory([]);
        setExchangeInventory([]);
        setAvailableStock([]);
        return;
      }

      // 2. 제품 ID 목록 추출
      const productIds = [...new Set(movements.map(m => m.product_id).filter(Boolean))];
      
      if (productIds.length === 0) {
        setInventory([]);
        setOriginalInventory([]);
        setExchangeInventory([]);
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
        hospitalId,
        productMap,
        clientMap,
        calculationOptions
      );

      setInventory(inventoryData);
      setOriginalInventory(inventoryData);

      // 5. 교환 모달용 재고 계산 (옵션)
      if (includeExchangeFormat) {
        const exchangeData = calculateExchangeInventory(
          movements,
          hospitalId,
          productMap,
          clientMap
        );
        setExchangeInventory(exchangeData);
      }

      // 6. 가용 재고 계산 (옵션)
      if (includeAvailableStock) {
        const stockData = calculateAvailableStock(
          movements,
          hospitalId,
          productMap
        );
        setAvailableStock(stockData);
      }

    } catch (err) {
      console.error("병원 재고 조회 실패:", err);
      setError("재고 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 특정 CFN의 LOT 목록 조회
   */
  const fetchAvailableLots = async (cfn: string): Promise<LotInfo[]> => {
    if (!hospitalId) return [];
    
    try {
      const movements = await fetchStockMovements(hospitalId);
      const productMap = await buildProductMap();
      
      return calculateAvailableLots(movements, hospitalId, cfn, productMap);
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
   * 특정 재고 아이템이 존재하는지 확인
   */
  const hasInventory = (): boolean => {
    return inventory.length > 0 && inventory.some(item => item.quantity > 0);
  };

  /**
   * 특정 CFN의 총 재고량 조회
   */
  const getTotalQuantityByCFN = (cfn: string): number => {
    return inventory
      .filter(item => item.cfn === cfn)
      .reduce((total, item) => total + item.quantity, 0);
  };

  /**
   * 수동 새로고침
   */
  const refetch = () => {
    fetchHospitalInventory();
  };

  // 자동 조회 (hospitalId 변경 시에도 재조회)
  useEffect(() => {
    if (autoFetch && hospitalId) {
      fetchHospitalInventory();
    }
  }, [autoFetch, hospitalId]);

  return {
    // 데이터
    inventory,
    originalInventory,
    exchangeInventory,
    availableStock,
    
    // 상태
    loading,
    error,
    numericSort,
    
    // 액션
    fetchHospitalInventory,
    fetchAvailableLots,
    toggleCfnSort,
    filterInventory,
    refetch,
    
    // 유틸리티
    hasInventory,
    getTotalQuantityByCFN,
    locationId: hospitalId,
  };
}; 