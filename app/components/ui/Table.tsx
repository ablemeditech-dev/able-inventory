import React from 'react';

// 테이블 컬럼 정의 인터페이스
export interface TableColumn<T> {
  key: keyof T;
  header: string;
  headerRender?: () => React.ReactNode;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

// 테이블 props 인터페이스
export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
  onRetry?: () => void;
}

// 로딩 상태 컴포넌트
const LoadingState: React.FC<{ message?: string }> = ({ message = "데이터를 불러오는 중..." }) => (
  <div className="flex justify-center items-center h-64">
    <div className="text-lg">{message}</div>
  </div>
);

// 에러 상태 컴포넌트
const ErrorState: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center h-64">
    <div className="text-red-500 text-lg mb-4">{error}</div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        다시 시도
      </button>
    )}
  </div>
);

// 빈 결과 상태 컴포넌트
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-8 text-gray-500">
    {message}
  </div>
);

// 메인 테이블 컴포넌트
export default function Table<T>({
  columns,
  data,
  loading = false,
  error,
  emptyMessage = "결과가 없습니다.",
  className = "",
  onRowClick,
  onRetry
}: TableProps<T>) {
  
  // 로딩 상태 처리
  if (loading) {
    return <LoadingState />;
  }

  // 에러 상태 처리
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  // 빈 결과 처리
  if (data.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-50">
            {columns.map((column, index) => (
              <th
                key={index}
                className={`px-2 md:px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.align === 'center' ? 'text-center' : 
                  column.align === 'right' ? 'text-right' : 'text-left'
                }`}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.headerRender ? column.headerRender() : column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => onRowClick?.(item, rowIndex)}
              className={onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={colIndex}
                  className={`px-2 md:px-4 py-2 whitespace-nowrap ${
                    column.align === 'center' ? 'text-center' : 
                    column.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {column.render 
                    ? column.render(item[column.key], item)
                    : String(item[column.key] || '')
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 헬퍼 함수들
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
};

export const formatNumber = (value: number): string => {
  if (value === null || value === undefined) return '';
  return value.toLocaleString();
};

export const formatQuantity = (value: number): string => {
  if (value === null || value === undefined) return '';
  return `${value.toLocaleString()}개`;
}; 