import React from 'react';
import Button from './Button';
import { PackageIcon, ArrowLeftIcon, ArrowRightIcon, ClipboardIcon } from './Icons';

// 빈 상태 타입
export type EmptyStateType = 'general' | 'search' | 'inbound' | 'outbound' | 'usage' | 'exchange' | 'inventory' | 'ubd-safe';

// 빈 상태 props
interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  className?: string;
}

// 타입별 기본 설정
const emptyStateConfigs = {
  general: {
    title: '데이터가 없습니다',
    message: '표시할 데이터가 없습니다.',
    icon: <PackageIcon className="w-16 h-16 text-accent-soft" />,
  },
  search: {
    title: '검색 결과가 없습니다',
    message: '다른 검색어로 시도해보세요.',
    icon: (
      <svg className="w-16 h-16 text-accent-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  inbound: {
    title: '입고 기록이 없습니다',
    message: '첫 번째 입고를 등록해보세요.',
    icon: <ArrowLeftIcon className="w-16 h-16 text-accent-soft" />,
  },
  outbound: {
    title: '출고 기록이 없습니다',
    message: '첫 번째 출고를 등록해보세요.',
    icon: <ArrowRightIcon className="w-16 h-16 text-accent-soft" />,
  },
  usage: {
    title: '사용 기록이 없습니다',
    message: '첫 번째 사용분을 등록해보세요.',
    icon: <ClipboardIcon className="w-16 h-16 text-accent-soft" />,
  },
  exchange: {
    title: '교환 기록이 없습니다',
    message: '첫 번째 교환을 등록해보세요.',
    icon: (
      <svg className="w-16 h-16 text-accent-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  inventory: {
    title: '재고가 없습니다',
    message: '현재 재고가 없습니다.',
    icon: <PackageIcon className="w-16 h-16 text-accent-soft" />,
  },
  'ubd-safe': {
    title: '모든 재고가 안전합니다',
    message: '유통기한이 임박한 재고가 없습니다.',
    icon: (
      <svg className="w-16 h-16 text-accent-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

// 메인 EmptyState 컴포넌트
const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'general',
  title,
  message,
  icon,
  action,
  className = '',
}) => {
  const config = emptyStateConfigs[type];
  
  const finalTitle = title || config.title;
  const finalMessage = message || config.message;
  const finalIcon = icon || config.icon;
  
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-accent-soft p-8 text-center ${className}`}>
      <div className="mb-4">
        {finalIcon}
      </div>
      <h2 className="text-xl font-semibold text-primary mb-2">
        {finalTitle}
      </h2>
      <p className="text-text-secondary mb-4">
        {finalMessage}
      </p>
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'primary'}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;

// 특정 용도별 EmptyState 컴포넌트들
export const SearchEmptyState: React.FC<{ searchTerm?: string }> = ({ searchTerm }) => (
  <EmptyState
    type="search"
    title="검색 결과가 없습니다"
    message={searchTerm ? `"${searchTerm}"에 대한 검색 결과가 없습니다.` : '다른 검색어로 시도해보세요.'}
  />
);

export const InboundEmptyState: React.FC<{ onAddClick?: () => void }> = ({ onAddClick }) => (
  <EmptyState
    type="inbound"
    action={onAddClick ? {
      label: '입고 등록',
      onClick: onAddClick,
    } : undefined}
  />
);

export const OutboundEmptyState: React.FC<{ onAddClick?: () => void }> = ({ onAddClick }) => (
  <EmptyState
    type="outbound"
    action={onAddClick ? {
      label: '출고 등록',
      onClick: onAddClick,
    } : undefined}
  />
);

export const UsageEmptyState: React.FC<{ onAddClick?: () => void }> = ({ onAddClick }) => (
  <EmptyState
    type="usage"
    action={onAddClick ? {
      label: '사용분 등록',
      onClick: onAddClick,
    } : undefined}
  />
);

export const ExchangeEmptyState: React.FC<{ onAddClick?: () => void }> = ({ onAddClick }) => (
  <EmptyState
    type="exchange"
    action={onAddClick ? {
      label: '교환 등록',
      onClick: onAddClick,
    } : undefined}
  />
);

export const InventoryEmptyState: React.FC<{ isSearchResult?: boolean }> = ({ isSearchResult = false }) => (
  <EmptyState
    type={isSearchResult ? 'search' : 'inventory'}
    title={isSearchResult ? '검색 결과가 없습니다' : '재고가 없습니다'}
    message={isSearchResult ? '다른 검색어로 시도해보세요.' : '현재 재고가 없습니다.'}
  />
);

export const UBDSafeEmptyState: React.FC = () => (
  <EmptyState type="ubd-safe" />
); 