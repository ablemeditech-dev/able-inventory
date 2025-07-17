import { useState } from 'react';

interface OrderItem {
  cfn: string;
  client_name: string;
  total_quantity: number;
  six_months_usage: number;
  product_id: string;
  client_id: string;
}

export type SortKey = 'quantity' | 'usage';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: SortKey | null;
  direction: SortDirection;
}

export const useTableSort = () => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: null, 
    direction: 'asc' 
  });

  const handleSort = (key: SortKey, items: OrderItem[], setItems: (items: OrderItem[]) => void) => {
    let direction: SortDirection = 'asc';
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    setSortConfig({ key, direction });

    const sortedItems = [...items].sort((a, b) => {
      let aValue: number, bValue: number;
      
      if (key === 'quantity') {
        aValue = a.total_quantity;
        bValue = b.total_quantity;
      } else {
        aValue = a.six_months_usage;
        bValue = b.six_months_usage;
      }

      if (direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    setItems(sortedItems);
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    if (sortConfig.direction === 'asc') {
      return (
        <svg className="w-4 h-4 ml-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 ml-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l-4-4" />
        </svg>
      );
    }
  };

  return {
    sortConfig,
    handleSort,
    renderSortIcon,
  };
}; 