import { StockOutBadge, LowStockBadge, HospitalRankBadge } from '../ui/Badge';

interface StatusBadgesProps {
  totalQuantity: number;
  sixMonthsUsage: number;
  hospitalRankings?: Array<{hospitalName: string, rank: number}>;
}

/**
 * 재고 상태 배지들을 렌더링하는 컴포넌트
 * 재고 부족, 재고 부족 예정, 병원별 Top 순위 배지를 포함
 */
export const StatusBadges: React.FC<StatusBadgesProps> = ({
  totalQuantity,
  sixMonthsUsage,
  hospitalRankings = [],
}) => {
  const monthlyAverageUsage = sixMonthsUsage / 6;
  const isStockOut = totalQuantity === 0;
  
  // 3개월치 재고 기준으로 재고 부족 예정 판단
  const threeMonthsStock = monthlyAverageUsage * 3;
  const isLowStock = totalQuantity > 0 && 
                     totalQuantity < threeMonthsStock && 
                     sixMonthsUsage > 0 &&
                     monthlyAverageUsage >= 0.1; // 월평균이 너무 작으면 제외

  return (
    <div className="flex items-center gap-1 md:gap-2">
      {/* 재고 부족 배지 */}
      {isStockOut && (
        <StockOutBadge className="hidden md:inline">
          재고 부족
        </StockOutBadge>
      )}
      
      {/* 재고 부족 예정 배지 */}
      {isLowStock && (
        <LowStockBadge className="hidden md:inline">
          부족 예정
        </LowStockBadge>
      )}
      
      {/* 병원별 Top 순위 배지들 */}
      {hospitalRankings.map((ranking, index) => (
        <HospitalRankBadge 
          key={`${ranking.hospitalName}-${ranking.rank}`} 
          hospitalName={ranking.hospitalName}
          className="hidden md:inline"
        >
          {ranking.hospitalName} Top {ranking.rank}
        </HospitalRankBadge>
      ))}
    </div>
  );
};

/**
 * 재고 상태에 따른 행 배경 클래스를 반환하는 유틸리티 함수
 */
export const getRowBackgroundClass = (totalQuantity: number, sixMonthsUsage: number): string => {
  const monthlyAverageUsage = sixMonthsUsage / 6;
  const isStockOut = totalQuantity === 0;
  
  // 3개월치 재고 기준으로 재고 부족 예정 판단
  const threeMonthsStock = monthlyAverageUsage * 3;
  const isLowStock = totalQuantity > 0 && 
                     totalQuantity < threeMonthsStock && 
                     sixMonthsUsage > 0 &&
                     monthlyAverageUsage >= 0.1; // 월평균이 너무 작으면 제외
  
  let rowBgClass = 'hover:bg-accent-light';
  if (isStockOut) {
    rowBgClass += ' bg-red-50';
  } else if (isLowStock) {
    rowBgClass += ' bg-orange-50';
  }
  
  return rowBgClass;
}; 