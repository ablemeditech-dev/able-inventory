import React from 'react';
import Button, { ButtonVariant } from './Button';

// 액션 버튼 인터페이스
export interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

// 테이블 액션 props 인터페이스
export interface TableActionsProps {
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  actions?: ActionButton[];
  className?: string;
  children?: React.ReactNode;
}

// 검색 입력 필드 컴포넌트
const SearchInput: React.FC<{
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ placeholder, value, onChange }) => (
  <input
    type="text"
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-text-primary"
  />
);

// 액션 버튼 컴포넌트
const ActionButtonComponent: React.FC<ActionButton> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
}) => (
  <Button
    onClick={onClick}
    variant={variant}
    disabled={disabled}
    loading={loading}
    icon={icon}
  >
    {label}
  </Button>
);

// 메인 테이블 액션 컴포넌트
export default function TableActions({
  title,
  subtitle,
  searchPlaceholder = "검색...",
  searchValue = "",
  onSearchChange,
  actions = [],
  className = "",
  children,
}: TableActionsProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* 제목 및 액션 버튼 영역 */}
      {(title || actions.length > 0) && (
        <div className="flex justify-between items-center">
          <div>
            {title && <h1 className="text-2xl font-bold text-text-primary">{title}</h1>}
            {subtitle && <p className="text-lg text-text-secondary mt-1">{subtitle}</p>}
          </div>
          
          {actions.length > 0 && (
            <div className="flex gap-2">
              {actions.map((action, index) => (
                <ActionButtonComponent key={index} {...action} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 검색 및 필터 영역 */}
      {(onSearchChange || children) && (
        <div className="flex gap-4 items-center">
          {onSearchChange && (
            <SearchInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={onSearchChange}
            />
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// 통계 표시 컴포넌트
export const StatDisplay: React.FC<{
  label: string;
  value: string | number;
  className?: string;
}> = ({ label, value, className = "" }) => (
  <div className={`flex items-center space-x-2 ${className}`}>
    <span className="text-text-secondary">{label}:</span>
    <span className="text-xl font-bold text-primary">{value}</span>
  </div>
);

// 선택 드롭다운 컴포넌트
export const SelectDropdown: React.FC<{
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ label, value, options, onChange, placeholder = "선택해주세요", className = "" }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-text-secondary mb-2">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-text-primary"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
); 