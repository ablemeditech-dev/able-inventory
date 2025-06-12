// lib/utils/schema.ts
export interface Hospital {
  id: string;
  hospital_name: string;
  address?: string;
  contact?: string;
  created_at?: string;
}

export interface Product {
  id: string;
  cfn: string;
  description: string;
  unit?: string;
  price?: number;
  created_at?: string;
}

export interface Location {
  id: string;
  location_name: string;
  location_type: string;
  hospital_id?: string;
  address?: string;
  created_at?: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  from_location_id?: string;
  to_location_id: string;
  movement_type: "in" | "out";
  movement_reason:
    | "purchase"
    | "sale"
    | "return"
    | "exchange"
    | "transfer"
    | "usage"
    | "damage"
    | "expired"
    | "adjustment"
    | "loss";
  quantity: number;
  lot_number?: string;
  inbound_date?: string;
  expiry_date?: string;
  memo?: string;
  created_at?: string;
}

export interface InventoryItem {
  product_id: string;
  cfn: string;
  description: string;
  current_stock: number;
  lot_number?: string;
  expiry_date?: string;
  location_name: string;
  movements?: StockMovement[];
}

export interface MovementWithDetails extends StockMovement {
  product?: Product;
  from_location?: Location;
  to_location?: Location;
  type?: "in" | "out";
}

// API 응답 타입
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// 재고 현황 조회 응답
export interface InventoryResponse {
  current_stock: InventoryItem[];
  recent_movements: MovementWithDetails[];
}

// 폼 데이터 타입
export interface InboundFormData {
  cfn: string;
  lot_number: string;
  quantity: number;
  inbound_date: string;
  expiry_date?: string;
  memo?: string;
}

export interface OutboundFormData {
  hospital: string;
  cfn: string;
  lot_number: string;
  quantity: number;
  outbound_date: string;
  memo?: string;
}

export interface UsageFormData {
  used_date: string;
  hospital: string;
  cfn: string;
  lot_number: string;
  quantity: number;
  memo?: string;
}

// 유틸리티 타입
export type MovementReason = StockMovement["movement_reason"];
export type MovementType = StockMovement["movement_type"];
export type LocationType = Location["location_type"];
