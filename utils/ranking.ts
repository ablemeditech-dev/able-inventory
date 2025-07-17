interface OrderItem {
  cfn: string;
  client_name: string;
  total_quantity: number;
  six_months_usage: number;
  product_id: string;
  client_id: string;
}

/**
 * 오더 아이템 목록에서 Top 5 순위를 계산합니다.
 * 사용량이 0인 항목은 제외됩니다.
 * 
 * @param orderItems 오더 아이템 목록
 * @returns CFN을 키로 하고 순위를 값으로 하는 Map
 */
export const getTopFiveRanking = (orderItems: OrderItem[]): Map<string, number> => {
  // 사용량이 0보다 큰 항목들만 필터링하고 사용량 순으로 정렬
  const itemsWithUsage = orderItems.filter(item => item.six_months_usage > 0);
  
  if (itemsWithUsage.length === 0) return new Map();
  
  const sortedByUsage = itemsWithUsage.sort((a, b) => b.six_months_usage - a.six_months_usage);
  
  // CFN을 키로 하고 순위를 값으로 하는 Map 생성
  const rankingMap = new Map<string, number>();
  
  sortedByUsage.forEach((item, index) => {
    if (index < 5) { // Top 5까지만
      rankingMap.set(item.cfn, index + 1);
    }
  });
  
  return rankingMap;
}; 