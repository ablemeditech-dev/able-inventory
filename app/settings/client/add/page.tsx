"use client";

import { useForm, FormField as FormFieldType } from '../../../../hooks/useForm';
import { clientsAPI } from '../../../../lib/supabase';
import FormContainer from '../../../components/forms/FormContainer';
import FormField from '../../../components/forms/FormField';
import FormActions from '../../../components/forms/FormActions';

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

export default function AddClientPage() {
  const {
    formData,
    loading,
    error,
    handleChange,
    handleSubmit,
  } = useForm<ClientFormData>({
    initialData: {
      company_name: '',
      contact_person: '',
      phone: '',
      email: '',
    },
    fields: clientFields,
    onSubmit: async (data) => {
      const { error } = await clientsAPI.create(data);
      if (error) {
        throw new Error('거래처 저장에 실패했습니다. 다시 시도해주세요.');
      }
    },
    successRedirect: '/settings/client/list',
  });

  return (
    <FormContainer title="거래처 추가" error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {clientFields.map((field) => (
          <FormField
            key={field.name}
            field={field}
            value={formData[field.name as keyof ClientFormData]}
            onChange={handleChange}
          />
        ))}
        
        <FormActions
          loading={loading}
          cancelHref="/settings/client/list"
        />
      </form>
    </FormContainer>
  );
}