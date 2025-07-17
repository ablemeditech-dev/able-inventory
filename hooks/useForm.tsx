import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// 폼 필드 타입 정의
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: any) => string | null;
}

// 폼 설정 타입
export interface FormConfig<T> {
  initialData: T;
  fields: FormField[];
  onSubmit: (data: T) => Promise<void>;
  successRedirect?: string;
  loadInitialData?: () => Promise<T>;
}

// 폼 상태 타입
export interface FormState<T> {
  formData: T;
  loading: boolean;
  error: string;
  initialLoading: boolean;
}

// 폼 액션 타입
export interface FormActions<T> {
  setFormData: (data: T | ((prev: T) => T)) => void;
  setError: (error: string) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  reset: () => void;
  loadData: () => Promise<void>;
}

// 유효성 검사 유틸리티
const validateField = (field: FormField, value: any): string | null => {
  // 필수 필드 검증
  if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return `${field.label}은(는) 필수 입력 항목입니다.`;
  }

  // 이메일 검증
  if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return '올바른 이메일 형식을 입력해주세요.';
  }

  // 커스텀 검증
  if (field.validation) {
    return field.validation(value);
  }

  return null;
};

// 전체 폼 유효성 검사
const validateForm = <T,>(fields: FormField[], formData: T): string | null => {
  for (const field of fields) {
    const value = (formData as any)[field.name];
    const error = validateField(field, value);
    if (error) {
      return error;
    }
  }
  return null;
};

/**
 * 폼 처리 로직을 통합하는 커스텀 훅
 */
export const useForm = <T extends Record<string, any>>({
  initialData,
  fields,
  onSubmit,
  successRedirect,
  loadInitialData,
}: FormConfig<T>) => {
  const router = useRouter();
  
  // 폼 상태
  const [formData, setFormData] = useState<T>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(false);

  // 초기 데이터 로드
  const loadData = useCallback(async () => {
    if (!loadInitialData) return;
    
    try {
      setInitialLoading(true);
      setError('');
      const data = await loadInitialData();
      setFormData(data);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setInitialLoading(false);
    }
  }, [loadInitialData]);

  // 입력값 변경 핸들러
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  }, []);

  // 폼 제출 핸들러
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    const validationError = validateForm(fields, formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await onSubmit(formData);
      
      // 성공 시 리다이렉트
      if (successRedirect) {
        router.push(successRedirect);
      }
    } catch (err) {
      console.error('폼 제출 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '저장에 실패했습니다. 다시 시도해주세요.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [formData, fields, onSubmit, router, successRedirect]);

  // 폼 초기화
  const reset = useCallback(() => {
    setFormData(initialData);
    setError('');
    setLoading(false);
  }, [initialData]);

  return {
    // 상태
    formData,
    loading,
    error,
    initialLoading,
    
    // 액션
    setFormData,
    setError,
    handleChange,
    handleSubmit,
    reset,
    loadData,
  };
}; 