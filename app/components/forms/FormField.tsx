import React from 'react';
import { FormField as FormFieldType } from '../../../hooks/useForm';

interface FormFieldProps {
  field: FormFieldType;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  error?: string;
  className?: string;
  disabled?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  field,
  value,
  onChange,
  error,
  className = '',
  disabled = false,
}) => {
  const baseInputClasses = `w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-text-primary bg-white placeholder-text-secondary transition-colors ${
    disabled ? 'bg-gray-50 text-text-secondary cursor-not-allowed' : ''
  } ${
    error ? 'border-status-error-text focus:border-status-error-text focus:ring-status-error-text/20' : 'border-accent-soft'
  }`;

  const renderInput = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            name={field.name}
            value={value || ''}
            onChange={onChange}
            placeholder={field.placeholder}
            disabled={disabled}
            className={`${baseInputClasses} resize-none`}
            rows={3}
          />
        );

      case 'select':
        return (
          <select
            name={field.name}
            value={value || ''}
            onChange={onChange}
            disabled={disabled}
            className={`${baseInputClasses} appearance-none`}
          >
            <option value="">선택해주세요</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              name={field.name}
              checked={value || false}
              onChange={onChange}
              disabled={disabled}
              className={`h-4 w-4 text-primary focus:ring-primary focus:ring-2 focus:ring-offset-2 border-accent-soft rounded transition-colors ${
                disabled ? 'cursor-not-allowed opacity-50' : ''
              }`}
            />
            <label className={`ml-2 block text-sm ${disabled ? 'text-text-secondary cursor-not-allowed' : 'text-text-secondary'}`}>
              {field.label}
            </label>
          </div>
        );

      default:
        return (
          <input
            type={field.type}
            name={field.name}
            value={value || ''}
            onChange={onChange}
            placeholder={field.placeholder}
            disabled={disabled}
            className={baseInputClasses}
          />
        );
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {field.type !== 'checkbox' && (
        <label className={`block text-sm font-medium ${disabled ? 'text-text-secondary' : 'text-text-secondary'}`}>
          {field.label}
          {field.required && <span className="text-status-error-text ml-1">*</span>}
        </label>
      )}
      
      {renderInput()}
      
      {error && (
        <p className="text-status-error-text text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default FormField; 