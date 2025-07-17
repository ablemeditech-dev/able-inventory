import React from 'react';
import { XIcon } from "./Icons";

export type AlertType = 'error' | 'success' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({ 
  type, 
  title, 
  message, 
  onClose, 
  className = '' 
}) => {
  const getAlertStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-status-error-bg border-status-error-border text-status-error-text';
      case 'success':
        return 'bg-status-success-bg border-status-success-border text-status-success-text';
      case 'warning':
        return 'bg-status-warning-bg border-status-warning-border text-status-warning-text';
      case 'info':
        return 'bg-status-info-bg border-status-info-border text-status-info-text';
      default:
        return 'bg-status-info-bg border-status-info-border text-status-info-text';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return '⚠️';
      case 'success':
        return '✅';
      case 'warning':
        return '⚡';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`mb-4 p-4 border rounded-lg ${getAlertStyles()} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <span className="text-lg leading-none">{getIcon()}</span>
          <div className="flex-1">
            {title && (
              <h4 className="font-medium mb-1">{title}</h4>
            )}
            <p className="text-sm">{message}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XIcon size="sm" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert; 