// 차트 컬러 상수 정의
export const CHART_COLORS = {
  primary: '#3B82F6',   // 파란색
  secondary: '#EF4444', // 빨간색  
  tertiary: '#10B981',  // 초록색
  quaternary: '#F59E0B', // 주황색
  quinary: '#8B5CF6',   // 보라색
  senary: '#EC4899',    // 핑크색
  septenary: '#14B8A6', // 청록색
  octonary: '#F97316',  // 주황색 (진한)
  nonary: '#6366F1',    // 인디고색
  denary: '#84CC16',    // 라임색
} as const;

// 차트 컬러 배열 (순서대로 사용)
export const CHART_COLOR_ARRAY = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.tertiary,
  CHART_COLORS.quaternary,
  CHART_COLORS.quinary,
  CHART_COLORS.senary,
  CHART_COLORS.septenary,
  CHART_COLORS.octonary,
  CHART_COLORS.nonary,
  CHART_COLORS.denary,
] as const;

// 특정 목적별 차트 컬러
export const CHART_THEMES = {
  // 재고 상태별 컬러
  inventory: {
    available: CHART_COLORS.tertiary,    // 사용 가능 재고 - 초록색
    low: CHART_COLORS.quaternary,        // 재고 부족 - 주황색
    out: CHART_COLORS.secondary,         // 재고 없음 - 빨간색
    expired: CHART_COLORS.senary,        // 만료 - 핑크색
  },
  // 거래 상태별 컬러
  transaction: {
    inbound: CHART_COLORS.primary,       // 입고 - 파란색
    outbound: CHART_COLORS.secondary,    // 출고 - 빨간색
    exchange: CHART_COLORS.quinary,      // 교환 - 보라색
    return: CHART_COLORS.septenary,      // 반품 - 청록색
  },
  // 통계 유형별 컬러
  statistics: {
    current: CHART_COLORS.primary,       // 현재 데이터 - 파란색
    previous: CHART_COLORS.secondary,    // 이전 데이터 - 빨간색
    target: CHART_COLORS.tertiary,       // 목표 - 초록색
    average: CHART_COLORS.quaternary,    // 평균 - 주황색
  }
} as const; 