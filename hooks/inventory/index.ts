/**
 * 재고 관리 Custom Hooks
 * 
 * 기존 12개 파일에서 중복되던 재고 관리 로직을 통합하여 제공
 * - ABLE 중앙창고 재고 관리
 * - 병원별 재고 관리
 * - 위치별 범용 재고 관리
 * - UBD 기반 재고 관리 (NEW)
 * 
 * 사용법:
 * import { useAbleInventory, useHospitalInventory, useLocationInventory, useUBDInventory } from '@/hooks/inventory';
 */

export { useAbleInventory } from './useAbleInventory';
export { useHospitalInventory } from './useHospitalInventory';
export { useLocationInventory } from './useLocationInventory';
export { useUBDInventory } from './useUBDInventory';

// 타입 재export
export type { AbleInventoryOptions } from './useAbleInventory';
export type { HospitalInventoryOptions } from './useHospitalInventory';
export type { LocationInventoryOptions } from './useLocationInventory';
export type { UBDInventoryOptions } from './useUBDInventory';

// 유틸리티 함수 재출력
export {
  ABLE_LOCATION_ID,
  buildProductMap,
  buildClientMap,
  buildLocationMap,
  fetchStockMovements,
  calculateInventory,
  calculateCFNInventory,
  calculateAvailableStock,
  calculateAvailableLots,
  calculateUBDInventory,
  calculateExchangeInventory,
  sortByCfnNumeric,
} from '../../utils/inventory'; 