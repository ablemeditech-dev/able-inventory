import React from 'react';
import Button from './Button';
import Alert from './Alert';

// 에러 상태 타입
export type ErrorStateType = 'general' | 'network' | 'permission' | 'notfound' | 'server';

// 에러 상태 props
interface ErrorStateProps {
  type?: ErrorStateType;
  title?: string;
  message?: string;
  error?: string;
  icon?: React.ReactNode;
  showRetry?: boolean;
  retryLabel?: string;
  onRetry?: () => void;
  showAlert?: boolean;
  fullPage?: boolean;
  className?: string;
}

// 타입별 기본 설정
const errorStateConfigs = {
  general: {
    title: '오류가 발생했습니다',
    message: '다시 시도해주세요.',
    icon: (
      <svg className="w-16 h-16 text-status-error-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  network: {
    title: '네트워크 오류',
    message: '인터넷 연결을 확인하고 다시 시도해주세요.',
    icon: (
      <svg className="w-16 h-16 text-status-error-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  permission: {
    title: '접근 권한이 없습니다',
    message: '이 페이지에 접근할 권한이 없습니다.',
    icon: (
      <svg className="w-16 h-16 text-status-error-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  notfound: {
    title: '데이터를 찾을 수 없습니다',
    message: '요청한 데이터가 존재하지 않습니다.',
    icon: (
      <svg className="w-16 h-16 text-status-error-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  server: {
    title: '서버 오류',
    message: '일시적인 서버 오류입니다. 잠시 후 다시 시도해주세요.',
    icon: (
      <svg className="w-16 h-16 text-status-error-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

// 메인 ErrorState 컴포넌트
const ErrorState: React.FC<ErrorStateProps> = ({
  type = 'general',
  title,
  message,
  error,
  icon,
  showRetry = true,
  retryLabel = '다시 시도',
  onRetry,
  showAlert = false,
  fullPage = false,
  className = '',
}) => {
  const config = errorStateConfigs[type];
  
  const finalTitle = title || config.title;
  const finalMessage = message || config.message;
  const finalIcon = icon || config.icon;
  
  // 전체 페이지 에러
  if (fullPage) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${className}`}>
        <div className="text-center max-w-md">
          <div className="mb-4">
            {finalIcon}
          </div>
          <h1 className="text-2xl font-bold text-primary mb-4">
            {finalTitle}
          </h1>
          <p className="text-text-secondary mb-6">
            {finalMessage}
          </p>
          {error && (
            <div className="mb-6">
              <Alert type="error" message={error} />
            </div>
          )}
          {showRetry && onRetry && (
            <Button onClick={onRetry} variant="primary">
              {retryLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }
  
  // Alert 형태 에러
  if (showAlert) {
    return (
      <div className={`py-4 ${className}`}>
        <Alert 
          type="error" 
          title={finalTitle}
          message={error || finalMessage}
        />
        {showRetry && onRetry && (
          <div className="mt-4 text-center">
            <Button onClick={onRetry} variant="primary">
              {retryLabel}
            </Button>
          </div>
        )}
      </div>
    );
  }
  
  // 일반 에러 상태
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
      {error && (
        <div className="mb-4 p-3 bg-status-error-bg text-status-error-text rounded text-sm">
          {error}
        </div>
      )}
      {showRetry && onRetry && (
        <Button onClick={onRetry} variant="primary">
          {retryLabel}
        </Button>
      )}
    </div>
  );
};

export default ErrorState;

// 특정 용도별 ErrorState 컴포넌트들
export const NetworkErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorState
    type="network"
    onRetry={onRetry}
    retryLabel="재연결 시도"
  />
);

export const ServerErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorState
    type="server"
    onRetry={onRetry}
    retryLabel="새로고침"
  />
);

export const PermissionErrorState: React.FC = () => (
  <ErrorState
    type="permission"
    showRetry={false}
  />
);

export const NotFoundErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorState
    type="notfound"
    onRetry={onRetry}
    retryLabel="새로고침"
  />
);

export const DataLoadErrorState: React.FC<{ error?: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <ErrorState
    title="데이터를 불러오는데 실패했습니다"
    message="잠시 후 다시 시도해주세요."
    error={error}
    onRetry={onRetry}
  />
);

export const FullPageErrorState: React.FC<{ 
  title?: string; 
  message?: string; 
  error?: string; 
  onRetry?: () => void;
}> = ({ title, message, error, onRetry }) => (
  <ErrorState
    title={title}
    message={message}
    error={error}
    onRetry={onRetry}
    fullPage={true}
  />
); 