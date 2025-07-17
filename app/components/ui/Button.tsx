import React from 'react';

// 클래스 이름 결합 유틸리티 함수
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// 버튼 변형 타입
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'ghost';

// 버튼 크기 타입
export type ButtonSize = 'sm' | 'md' | 'lg';

// 버튼 props 인터페이스
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

// 버튼 스타일 매핑
const buttonVariants = {
  primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary/50',
  secondary: 'bg-gray-500 text-white hover:bg-gray-600 focus:ring-gray-500/50',
  success: 'bg-status-success-text text-white hover:bg-green-700 focus:ring-green-500/50',
  warning: 'bg-status-warning-text text-white hover:bg-amber-700 focus:ring-amber-500/50',
  danger: 'bg-status-error-text text-white hover:bg-red-700 focus:ring-red-500/50',
  outline: 'border border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary/50',
  ghost: 'text-primary hover:bg-primary/10 focus:ring-primary/50',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

// 로딩 스피너 컴포넌트
const LoadingSpinner: React.FC<{ size?: ButtonSize }> = ({ size = 'md' }) => {
  const spinnerSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  
  return (
    <svg
      className={`animate-spin ${spinnerSize}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// 메인 버튼 컴포넌트
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = buttonVariants[variant];
  const sizeStyles = buttonSizes[size];
  const widthStyles = fullWidth ? 'w-full' : '';
  
  const buttonClasses = cn(
    baseStyles,
    variantStyles,
    sizeStyles,
    widthStyles,
    className
  );

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner size={size} />}
      {!loading && icon && (
        <span className="mr-2">{icon}</span>
      )}
      {!loading && children}
      {loading && <span className="ml-2">{children}</span>}
    </button>
  );
};

export default Button;

// 아이콘 버튼 컴포넌트
export const IconButton: React.FC<Omit<ButtonProps, 'children'> & { 
  icon: React.ReactNode; 
  'aria-label': string;
}> = ({ icon, ...props }) => (
  <Button {...props} className={cn('p-2', props.className)}>
    {icon}
  </Button>
);

// 버튼 그룹 컴포넌트
export const ButtonGroup: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={cn('inline-flex rounded-lg shadow-sm', className)}>
    {React.Children.map(children, (child, index) => {
      if (React.isValidElement(child)) {
        const isFirst = index === 0;
        const isLast = index === React.Children.count(children) - 1;
        
        return React.cloneElement(child, {
          className: cn(
            child.props.className,
            !isFirst && !isLast && 'rounded-none border-l-0',
            isFirst && 'rounded-r-none',
            isLast && 'rounded-l-none border-l-0'
          ),
        });
      }
      return child;
    })}
  </div>
);

// 링크 버튼 컴포넌트
export const LinkButton: React.FC<ButtonProps & { href: string }> = ({ 
  href, 
  children, 
  ...props 
}) => (
  <a href={href} className="inline-block">
    <Button {...props}>{children}</Button>
  </a>
); 