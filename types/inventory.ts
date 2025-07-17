// 기본 재고 아이템 인터페이스
export interface InventoryItem {
  cfn: string;
  lot_number: string;
  ubd_date: string;
  quantity: number;
  client_name: string;
  product_id?: string;
  client_id?: string;
  description?: string;
}

// 재고 이동 기록 인터페이스
export interface StockMovement {
  product_id: string;
  lot_number?: string;
  ubd_date?: string;
  quantity: number;
  from_location_id?: string;
  to_location_id?: string;
  movement_type: string;
  movement_reason?: string;
  created_at?: string;
  inbound_date?: string;
}

// 제품 정보 인터페이스
export interface Product {
  id: string;
  cfn?: string;
  upn?: string;
  description?: string;
  client_id: string;
}

// 거래처 정보 인터페이스
export interface Client {
  id: string;
  company_name: string;
}

// 병원/위치 정보 인터페이스
export interface Location {
  id: string;
  location_name?: string;
  hospital_name?: string;
  facility_name?: string;
  company_name?: string;
  notes?: string;
  location_type?: string;
}

// CFN별 집계 재고 인터페이스 (오더 페이지용)
export interface CFNInventoryItem {
  cfn: string;
  client_name: string;
  total_quantity: number;
  product_id: string;
  client_id: string;
  six_months_usage?: number;
}

// 가용 재고 인터페이스 (출고/사용 페이지용)
export interface AvailableStock {
  cfn: string;
  total_quantity: number;
}

// LOT 정보 인터페이스
export interface LotInfo {
  lot_number: string;
  ubd_date: string;
  available_quantity: number;
}

// UBD 기반 재고 아이템 인터페이스 (유통기한 관리용)
export interface UBDInventoryItem {
  cfn: string;
  lot_number: string;
  ubd_date: string;
  quantity: number;
  location_name: string;
  days_until_expiry: number;
}

// 교환 모달용 확장 재고 아이템
export interface ExchangeInventoryItem extends InventoryItem {
  id: string;
  product_id: string;
}

// 재고 계산 옵션
export interface InventoryCalculationOptions {
  includeZeroQuantity?: boolean;
  sortBy?: 'cfn' | 'lot' | 'ubd' | 'quantity';
  filterPositiveOnly?: boolean;
}

// 공통 응답 타입
export interface InventoryResponse<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

// 데이터 맵 타입
export type ProductMap = Map<string, Product>;
export type ClientMap = Map<string, Client>;
export type LocationMap = Map<string, Location>; 