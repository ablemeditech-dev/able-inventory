import React from 'react';
import Link from 'next/link';

interface ManualPageLayoutProps {
  title: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  headerActions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  className?: string;
}

export default function ManualPageLayout({
  title,
  children,
  backHref,
  backLabel = "목록으로",
  headerActions,
  maxWidth = '2xl',
  className = ''
}: ManualPageLayoutProps) {
  const maxWidthClass = {
    'sm': 'max-w-sm',
    'md': 'max-w-md', 
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl'
  }[maxWidth];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className={`${maxWidthClass} mx-auto px-4 sm:px-6 lg:px-8`}>
        <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-primary">{title}</h1>
            <div className="flex items-center gap-2">
              {headerActions}
              {backHref && (
                <Link
                  href={backHref}
                  className="px-4 py-2 bg-accent-soft text-text-secondary rounded-lg hover:bg-accent-light transition-colors"
                >
                  {backLabel}
                </Link>
              )}
            </div>
          </div>

          {/* 컨텐츠 */}
          {children}
        </div>
      </div>
    </div>
  );
} 