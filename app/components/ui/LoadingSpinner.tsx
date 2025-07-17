import React from 'react';

// 로딩 스피너 크기 타입
export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';

// 로딩 스피너 props
interface LoadingSpinnerProps {
  size?: LoadingSize;
  message?: string;
  className?: string;
  fullScreen?: boolean;
  centered?: boolean;
}

// 크기별 스피너 클래스
const spinnerSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

// 크기별 메시지 텍스트 클래스
const textSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

// 기본 스피너 컴포넌트
export const Spinner: React.FC<{ size?: LoadingSize; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClass = spinnerSizes[size];
  
  return (
    <div
      className={`inline-block animate-spin rounded-full border-b-2 border-primary ${sizeClass} ${className}`}
    />
  );
};

// 메인 로딩 스피너 컴포넌트
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message = "로딩 중...",
  className = '',
  fullScreen = false,
  centered = true,
}) => {
  const textClass = textSizes[size];
  
  // 전체 화면 로딩
  if (fullScreen) {
    return (
      <div className={`fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 ${className}`}>
        <div className="text-center">
          <Spinner size={size} />
          {message && (
            <p className={`mt-4 text-text-secondary ${textClass}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  // 중앙 정렬 로딩
  if (centered) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
        <Spinner size={size} />
        {message && (
          <p className={`mt-2 text-text-secondary ${textClass}`}>
            {message}
          </p>
        )}
      </div>
    );
  }
  
  // 인라인 로딩
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Spinner size={size} />
      {message && (
        <span className={`text-text-secondary ${textClass}`}>
          {message}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;

// 특정 용도별 로딩 컴포넌트들
export const PageLoading: React.FC<{ message?: string }> = ({ 
  message = "페이지를 불러오는 중..." 
}) => (
  <div className="flex justify-center items-center min-h-screen">
    <LoadingSpinner size="lg" message={message} />
  </div>
);

export const SectionLoading: React.FC<{ message?: string }> = ({ 
  message = "데이터를 불러오는 중..." 
}) => (
  <div className="flex justify-center items-center h-64">
    <LoadingSpinner size="md" message={message} />
  </div>
);

export const TableLoading: React.FC<{ message?: string }> = ({ 
  message = "데이터를 불러오는 중..." 
}) => (
  <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-8 text-center">
    <LoadingSpinner size="md" message={message} />
  </div>
);

export const ButtonLoading: React.FC = () => (
  <Spinner size="sm" />
);

export const InlineLoading: React.FC<{ message?: string }> = ({ 
  message = "처리 중..." 
}) => (
  <LoadingSpinner size="sm" message={message} centered={false} />
); 