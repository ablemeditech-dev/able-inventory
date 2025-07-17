import React from 'react';

// 아이콘 props 인터페이스
interface IconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  strokeWidth?: number;
}

// 아이콘 크기 매핑
const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

// 기본 아이콘 컴포넌트
const Icon: React.FC<IconProps & { children: React.ReactNode }> = ({
  className = '',
  size = 'md',
  strokeWidth = 2,
  children,
}) => {
  const sizeClass = iconSizes[size];
  
  return (
    <svg
      className={`${sizeClass} ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
    >
      {children}
    </svg>
  );
};

// Plus 아이콘 (추가 버튼용)
export const PlusIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4v16m8-8H4"
    />
  </Icon>
);

// ChevronDown 아이콘 (아코디언 화살표용)
export const ChevronDownIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 9l-7 7-7-7"
    />
  </Icon>
);

// Menu 아이콘 (햄버거 메뉴용)
export const MenuIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6h16M4 12h16M4 18h16"
    />
  </Icon>
);

// X 아이콘 (닫기 버튼용)
export const XIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </Icon>
);

// Edit 아이콘 (수정 버튼용)
export const EditIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </Icon>
);

// Trash 아이콘 (삭제 버튼용)
export const TrashIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </Icon>
);

// Package 아이콘 (재고/박스 관련용)
export const PackageIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </Icon>
);

// ArrowRight 아이콘 (출고 관련용)
export const ArrowRightIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 8l4 4m0 0l-4 4m4-4H3"
    />
  </Icon>
);

// ArrowLeft 아이콘 (입고 관련용)
export const ArrowLeftIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 16l-4-4m0 0l4-4m-4 4h18"
    />
  </Icon>
);

// Clipboard 아이콘 (사용기록 관련용)
export const ClipboardIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
  </Icon>
);

// List 아이콘 (목록 관련용)
export const ListIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6h16M4 10h16M4 14h16M4 18h16"
    />
  </Icon>
);

// Settings 아이콘 (설정 관련용)
export const SettingsIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </Icon>
);

// ChartBar 아이콘 (통계/차트 관련용)
export const ChartBarIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </Icon>
);

// Cube 아이콘 (재고/박스 관련용)
export const CubeIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </Icon>
);

// ExclamationTriangle 아이콘 (경고/주의 관련용)
export const ExclamationTriangleIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </Icon>
);

export default {
  Plus: PlusIcon,
  ChevronDown: ChevronDownIcon,
  Menu: MenuIcon,
  X: XIcon,
  Edit: EditIcon,
  Trash: TrashIcon,
  Package: PackageIcon,
  ArrowRight: ArrowRightIcon,
  ArrowLeft: ArrowLeftIcon,
  Clipboard: ClipboardIcon,
  List: ListIcon,
  Settings: SettingsIcon,
  ChartBar: ChartBarIcon,
  Cube: CubeIcon,
  ExclamationTriangle: ExclamationTriangleIcon,
}; 