import React from 'react';
import Alert from '../ui/Alert';

interface FormContainerProps {
  title: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

const FormContainer: React.FC<FormContainerProps> = ({
  title,
  error,
  children,
  className = '',
}) => {
  return (
    <div className={`p-4 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>

      {/* 폼 */}
      <div className="bg-accent-light p-6 rounded-lg shadow">
        {error && (
          <Alert type="error" message={error} />
        )}
        {children}
      </div>
    </div>
  );
};

export default FormContainer; 