import React from 'react';
import Button from './Button';

interface LoadMoreButtonProps {
  hasMore: boolean;
  loading: boolean;
  onClick: () => void;
  loadingText?: string;
  buttonText?: string;
  className?: string;
}

const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  hasMore,
  loading,
  onClick,
  loadingText = "로딩 중...",
  buttonText = "더보기",
  className = "",
}) => {
  if (!hasMore) return null;

  return (
    <div className={`mt-6 text-center ${className}`}>
      <Button
        onClick={onClick}
        disabled={loading}
        variant="outline"
        className="min-w-32"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            {loadingText}
          </div>
        ) : (
          buttonText
        )}
      </Button>
    </div>
  );
};

export default LoadMoreButton; 