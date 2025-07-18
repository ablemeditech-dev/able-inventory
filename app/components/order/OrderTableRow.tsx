import { StatusBadges, getRowBackgroundClass } from './StatusBadges';

interface OrderItem {
  cfn: string;
  client_name: string;
  total_quantity: number;
  six_months_usage: number;
  product_id: string;
  client_id: string;
}

interface OrderTableRowProps {
  item: OrderItem;
  rank?: number;
  topHospital?: string;
}

/**
 * 오더 테이블의 각 행을 렌더링하는 컴포넌트
 */
export const OrderTableRow: React.FC<OrderTableRowProps> = ({
  item,
  rank,
  topHospital,
}) => {
  const rowBgClass = getRowBackgroundClass(item.total_quantity, item.six_months_usage);
  
  return (
    <tr className={rowBgClass}>
      {/* CFN 열 */}
      <td className="px-2 md:px-6 py-2 md:py-3 whitespace-nowrap">
        <div className="font-medium text-primary text-sm md:text-base">
          {item.cfn}
        </div>
      </td>
      
      {/* 거래처 열 */}
      <td className="px-2 md:px-6 py-2 md:py-3 whitespace-nowrap">
        <div className="font-medium text-primary text-sm md:text-base">
          {item.client_name}
        </div>
      </td>
      
      {/* 재고 수량 열 */}
      <td className="px-2 md:px-6 py-2 md:py-3 whitespace-nowrap">
        <div className={`font-medium text-sm md:text-base ${item.total_quantity === 0 ? 'text-red-600' : 'text-text-secondary'}`}>
          {item.total_quantity.toLocaleString()}개
        </div>
      </td>
      
      {/* 6개월 사용량 열 */}
      <td className="px-2 md:px-6 py-2 md:py-3 whitespace-nowrap">
        <div className={`font-medium text-sm md:text-base ${rank ? 'text-primary' : 'text-text-secondary'} flex items-center gap-1 md:gap-2`}>
          <span>{item.six_months_usage.toLocaleString()}개</span>
          <StatusBadges
            totalQuantity={item.total_quantity}
            sixMonthsUsage={item.six_months_usage}
            rank={rank}
            topHospital={topHospital}
          />
        </div>
      </td>
    </tr>
  );
}; 