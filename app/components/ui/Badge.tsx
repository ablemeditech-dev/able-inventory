import React from 'react';

// 배지 변형 타입
export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'stock-out' | 'low-stock' | 'rank' | 'hospital' | 'hospital-1' | 'hospital-2' | 'hospital-3' | 'hospital-4' | 'hospital-5' | 'hospital-6' | 'hospital-7' | 'hospital-8';

// 배지 크기 타입
export type BadgeSize = 'sm' | 'md' | 'lg';

// 배지 props 인터페이스
export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
}

// 클래스 이름 결합 유틸리티 함수
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// 배지 스타일 매핑
const badgeVariants = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-status-success-bg text-status-success-text border-status-success-border',
  warning: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
  error: 'bg-status-error-bg text-status-error-text border-status-error-border',
  info: 'bg-status-info-bg text-status-info-text border-status-info-border',
  outline: 'border border-gray-300 text-gray-700 bg-transparent',
  'stock-out': 'bg-red-500 text-white',
  'low-stock': 'bg-orange-500 text-white',
  'rank': 'bg-blue-100 text-blue-800',
  'hospital': 'bg-green-100 text-green-800',
  // 병원별 색상 팔레트
  'hospital-1': 'bg-blue-100 text-blue-800',
  'hospital-2': 'bg-green-100 text-green-800', 
  'hospital-3': 'bg-purple-100 text-purple-800',
  'hospital-4': 'bg-pink-100 text-pink-800',
  'hospital-5': 'bg-indigo-100 text-indigo-800',
  'hospital-6': 'bg-teal-100 text-teal-800',
  'hospital-7': 'bg-orange-100 text-orange-800',
  'hospital-8': 'bg-cyan-100 text-cyan-800',
};

const badgeSizes = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-2.5 py-1.5 text-sm',
  lg: 'px-3 py-2 text-base',
};

// 메인 배지 컴포넌트
const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';
  
  const variantStyles = badgeVariants[variant];
  const sizeStyles = badgeSizes[size];
  
  const badgeClasses = cn(
    baseStyles,
    variantStyles,
    sizeStyles,
    className
  );

  return (
    <span className={badgeClasses}>
      {children}
    </span>
  );
};

export default Badge;

// 상태별 배지 컴포넌트들
export const SuccessBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge {...props} variant="success" />
);

export const WarningBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge {...props} variant="warning" />
);

export const ErrorBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge {...props} variant="error" />
);

export const InfoBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge {...props} variant="info" />
);

// 특수 배지 컴포넌트들
export const ExpiryBadge: React.FC<{ days: number; children: React.ReactNode }> = ({ days, children }) => {
  const variant = days <= 7 ? 'error' : days <= 30 ? 'warning' : 'success';
  return <Badge variant={variant}>{children}</Badge>;
};

export const MovementTypeBadge: React.FC<{ type: 'in' | 'out' }> = ({ type }) => {
  const variant = type === 'in' ? 'success' : 'error';
  const text = type === 'in' ? '입고' : '출고';
  return <Badge variant={variant}>{text}</Badge>;
};

export const ExchangeTypeBadge: React.FC<{ type: 'out' | 'in' }> = ({ type }) => {
  const variant = type === 'out' ? 'error' : 'success';
  const text = type === 'out' ? '회수' : '교환';
  return <Badge variant={variant}>{text}</Badge>;
};

// 재고 상태 배지 컴포넌트들
export const StockOutBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge {...props} variant="stock-out" size="sm" />
);

export const LowStockBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge {...props} variant="low-stock" size="sm" />
);

export const RankBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge {...props} variant="rank" size="sm" />
);

export const HospitalBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge {...props} variant="hospital" size="sm" />
); 

// 병원명을 기반으로 일관된 색상 variant를 반환하는 함수
export const getHospitalBadgeVariant = (hospitalName: string): BadgeVariant => {
  // 병원명을 해시하여 0-7 범위의 숫자로 변환
  let hash = 0;
  for (let i = 0; i < hospitalName.length; i++) {
    const char = hospitalName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32비트 정수로 변환
  }
  
  // 절댓값으로 변환하고 8개의 색상 중 하나 선택
  const colorIndex = (Math.abs(hash) % 8) + 1;
  return `hospital-${colorIndex}` as BadgeVariant;
};

// 병원별 랭킹 배지 컴포넌트
export interface HospitalRankBadgeProps extends Omit<BadgeProps, 'variant'> {
  hospitalName: string;
}

export const HospitalRankBadge: React.FC<HospitalRankBadgeProps> = ({ hospitalName, ...props }) => {
  const variant = getHospitalBadgeVariant(hospitalName);
  return <Badge {...props} variant={variant} size="sm" />;
}; 