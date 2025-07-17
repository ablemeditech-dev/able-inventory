// 시스템 상수들
export const SYSTEM_CONSTANTS = {
  // ABLE 중앙창고 ID
  ABLE_WAREHOUSE_ID: "c24e8564-4987-4cfd-bd0b-e9f05a4ab541",
  
  // 페이지네이션 설정
  PAGINATION: {
    DEFAULT_RECORDS_PER_PAGE: 50,
    DEFAULT_MONTHS_LIMIT: 3,
  },
  
  // 데이터베이스 필드 값들
  MOVEMENT_TYPES: {
    IN: "in",
    OUT: "out",
  } as const,
  
  MOVEMENT_REASONS: {
    PURCHASE: "purchase",
    SALE: "sale",
    USED: "used",
    MANUAL_USED: "manual_used",
    USAGE: "usage",
    EXCHANGE: "exchange",
    MANUAL_OUTBOUND: "manual_outbound",
  } as const,
} as const;

// 타입 정의
export type MovementType = typeof SYSTEM_CONSTANTS.MOVEMENT_TYPES[keyof typeof SYSTEM_CONSTANTS.MOVEMENT_TYPES];
export type MovementReason = typeof SYSTEM_CONSTANTS.MOVEMENT_REASONS[keyof typeof SYSTEM_CONSTANTS.MOVEMENT_REASONS]; 