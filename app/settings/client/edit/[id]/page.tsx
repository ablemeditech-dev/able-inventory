"use client";

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useForm, FormField as FormFieldType } from '../../../../../hooks/useForm';
import { clientsAPI } from '../../../../../lib/supabase';
import FormContainer from '../../../../components/forms/FormContainer';
import FormField from '../../../../components/forms/FormField';
import FormActions from '../../../../components/forms/FormActions';

interface ClientFormData {
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
}

const clientFields: FormFieldType[] = [
  {
    name: 'company_name',
    label: '거래처명',
    type: 'text',
    required: true,
    placeholder: '거래처명을 입력하세요',
  },
  {
    name: 'contact_person',
    label: '담당자명',
    type: 'text',
    placeholder: '담당자명을 입력하세요',
  },
  {
    name: 'phone',
    label: '연락처',
    type: 'tel',
    placeholder: '연락처를 입력하세요',
  },
  {
    name: 'email',
    label: '이메일',
    type: 'email',
    placeholder: '이메일을 입력하세요',
  },
];

export default function EditClientPage() {
  const params = useParams();
  const clientId = params.id as string;
  
  const {
    formData,
    loading,
    error,
    initialLoading,
    handleChange,
    handleSubmit,
    loadData,
  } = useForm<ClientFormData>({
    initialData: {
      company_name: '',
      contact_person: '',
      phone: '',
      email: '',
    },
    fields: clientFields,
    onSubmit: async (data) => {
      const { error } = await clientsAPI.update(clientId, data);
      if (error) {
        throw new Error('거래처 수정에 실패했습니다. 다시 시도해주세요.');
      }
    },
    successRedirect: '/settings/client/list',
    loadInitialData: async () => {
      const { data, error } = await clientsAPI.getById(clientId);
      if (error) {
        throw new Error('거래처 정보를 불러오는데 실패했습니다.');
      }
      return {
        company_name: data.company_name || '',
        contact_person: data.contact_person || '',
        phone: data.phone || '',
        email: data.email || '',
      };
    },
  });

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId, loadData]);

  if (initialLoading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">거래처 수정</h1>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-text-secondary">데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <FormContainer title="거래처 수정" error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {clientFields.map((field) => (
          <FormField
            key={field.name}
            field={field}
            value={formData[field.name]}
            onChange={handleChange}
          />
        ))}
        
        <FormActions
          loading={loading}
          submitText="수정 완료"
          cancelHref="/settings/client/list"
        />
      </form>
    </FormContainer>
  );
}