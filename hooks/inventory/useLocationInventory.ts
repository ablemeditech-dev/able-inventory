import { useState, useEffect } from 'react';
import {
  fetchStockMovements,
  buildProductMap,
  buildClientMap,
  calculateInventory,
  calculateAvailableStock,
  calculateAvailableLots,
  calculateUBDInventory,
  calculateExchangeInventory
} from '../../utils/inventory';
import type {
  InventoryItem,
  ExchangeInventoryItem,
  AvailableStock,
  LotInfo,
  UBDInventoryItem,
  InventoryCalculationOptions
} from '../../types/inventory';

export interface LocationInventoryOptions extends InventoryCalculationOptions {
  autoFetch?: boolean;
  includeAvailableStock?: boolean;
  includeExchangeFormat?: boolean;
  includeUBDFormat?: boolean;
  locationName?: string;
}

/**
 * 범용 위치별 재고 관리 Custom Hook
 * 
 * 모든 위치(병원, 창고, 거래처 등)에서 사용할 수 있는 재고 관리 로직을 제공
 * - 위치별 맞춤형 재고 계산
 * - 다양한 형태의 재고 데이터 지원
 * - 유연한 옵션 설정
 */
export const useLocationInventory = (
  locationId: string,
  options: LocationInventoryOptions = {}
) => {
  const {
    autoFetch = true,
    includeAvailableStock = false,
    includeExchangeFormat = false,
    includeUBDFormat = false,
    locationName = '',
    ...calculationOptions
  } = options;

  // 상태 관리
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [exchangeInventory, setExchangeInventory] = useState<ExchangeInventoryItem[]>([]);
  const [availableStock, setAvailableStock] = useState<AvailableStock[]>([]);
  const [ubdInventory, setUbdInventory] = useState<UBDInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 위치별 재고 데이터 조회 및 계산
   */
  const fetchLocationInventory = async () => {
    if (!locationId) {
      setInventory([]);
      setExchangeInventory([]);
      setAvailableStock([]);
      setUbdInventory([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. 재고 이동 데이터 조회
      const movements = await fetchStockMovements(locationId);
      
      if (movements.length === 0) {
        setInventory([]);
        setExchangeInventory([]);
        setAvailableStock([]);
        setUbdInventory([]);
        return;
      }

      // 2. 제품 ID 목록 추출
      const productIds = [...new Set(movements.map(m => m.product_id).filter(Boolean))];
      
      if (productIds.length === 0) {
        setInventory([]);
        setExchangeInventory([]);
        setAvailableStock([]);
        setUbdInventory([]);
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
        locationId,
        productMap,
        clientMap,
        calculationOptions
      );

      setInventory(inventoryData);

      // 5. 교환 모달용 재고 계산 (옵션)
      if (includeExchangeFormat) {
        const exchangeData = calculateExchangeInventory(
          movements,
          locationId,
          productMap,
          clientMap
        );
        setExchangeInventory(exchangeData);
      }

      // 6. 가용 재고 계산 (옵션)
      if (includeAvailableStock) {
        const stockData = calculateAvailableStock(
          movements,
          locationId,
          productMap
        );
        setAvailableStock(stockData);
      }

      // 7. UBD 재고 계산 (옵션)
      if (includeUBDFormat && locationName) {
        const ubdData = calculateUBDInventory(
          movements,
          locationId,
          locationName,
          productMap
        );
        setUbdInventory(ubdData);
      }

    } catch (err) {
      console.error("위치별 재고 조회 실패:", err);
      setError("재고 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 특정 CFN의 LOT 목록 조회
   */
  const fetchAvailableLots = async (cfn: string): Promise<LotInfo[]> => {
    if (!locationId) return [];
    
    try {
      const movements = await fetchStockMovements(locationId);
      const productMap = await buildProductMap();
      
      return calculateAvailableLots(movements, locationId, cfn, productMap);
    } catch (err) {
      console.error("LOT 목록 조회 실패:", err);
      return [];
    }
  };

  /**
   * 재고 검색/필터링
   */
  const filterInventory = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      // 원본 데이터로 복원하려면 다시 조회
      fetchLocationInventory();
      return;
    }

    const filtered = inventory.filter(item =>
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
   * 특정 거래처의 재고 목록 조회
   */
  const getInventoryByClient = (clientId: string): InventoryItem[] => {
    return inventory.filter(item => item.client_id === clientId);
  };

  /**
   * 유통기한 임박 재고 조회
   */
  const getExpiringInventory = (daysThreshold: number = 30): UBDInventoryItem[] => {
    return ubdInventory.filter(item => 
      item.days_until_expiry <= daysThreshold && item.days_until_expiry > 0
    );
  };

  /**
   * 재고 요약 정보 조회
   */
  const getInventorySummary = () => {
    const totalItems = inventory.length;
    const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueCFNs = new Set(inventory.map(item => item.cfn)).size;
    const uniqueClients = new Set(inventory.map(item => item.client_name)).size;
    
    return {
      totalItems,
      totalQuantity,
      uniqueCFNs,
      uniqueClients,
    };
  };

  /**
   * 수동 새로고침
   */
  const refetch = () => {
    fetchLocationInventory();
  };

  // 자동 조회 (locationId 변경 시에도 재조회)
  useEffect(() => {
    if (autoFetch && locationId) {
      fetchLocationInventory();
    }
  }, [autoFetch, locationId]);

  return {
    // 데이터
    inventory,
    exchangeInventory,
    availableStock,
    ubdInventory,
    
    // 상태
    loading,
    error,
    
    // 액션
    fetchLocationInventory,
    fetchAvailableLots,
    filterInventory,
    refetch,
    
    // 유틸리티
    hasInventory,
    getTotalQuantityByCFN,
    getInventoryByClient,
    getExpiringInventory,
    getInventorySummary,
    locationId,
  };
}; 