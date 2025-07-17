import React from 'react';
import Link from 'next/link';
import Button, { LinkButton } from '../ui/Button';

interface FormActionsProps {
  loading?: boolean;
  submitText?: string;
  cancelText?: string;
  cancelHref?: string;
  onCancel?: () => void;
  submitDisabled?: boolean;
  className?: string;
}

const FormActions: React.FC<FormActionsProps> = ({
  loading,
  submitText = '저장',
  cancelText = '취소',
  cancelHref,
  onCancel,
  submitDisabled = false,
  className = '',
}) => {
  return (
    <div className={`flex space-x-3 pt-4 ${className}`}>
      <Button
        type="submit"
        variant="primary"
        disabled={loading || submitDisabled}
        loading={loading}
      >
        {submitText}
      </Button>
      
      {cancelHref ? (
        <LinkButton
          href={cancelHref}
          variant="secondary"
        >
          {cancelText}
        </LinkButton>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
        >
          {cancelText}
        </Button>
      )}
    </div>
  );
};

export default FormActions; 