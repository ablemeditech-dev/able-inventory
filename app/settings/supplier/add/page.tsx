"use client";

import { useForm, FormField as FormFieldType } from '../../../../hooks/useForm';
import { suppliersAPI } from '../../../../lib/supabase';
import FormContainer from '../../../components/forms/FormContainer';
import FormField from '../../../components/forms/FormField';
import FormActions from '../../../components/forms/FormActions';

interface SupplierFormData {
  hospital_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  business_number: string;
  notes: string;
}

const supplierFields: FormFieldType[] = [
  {
    name: 'hospital_name',
    label: '병원명',
    type: 'text',
    required: true,
    placeholder: '병원명을 입력하세요',
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
  {
    name: 'city',
    label: '도시',
    type: 'text',
    placeholder: '도시를 입력하세요',
  },
  {
    name: 'business_number',
    label: '사업자번호',
    type: 'text',
    placeholder: '사업자번호를 입력하세요',
  },
  {
    name: 'address',
    label: '주소',
    type: 'text',
    placeholder: '상세 주소를 입력하세요',
  },
  {
    name: 'notes',
    label: '메모',
    type: 'textarea',
    placeholder: '추가 메모를 입력하세요',
  },
];

export default function AddSupplierPage() {
  const {
    formData,
    loading,
    error,
    handleChange,
    handleSubmit,
  } = useForm<SupplierFormData>({
    initialData: {
      hospital_name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      business_number: "",
      notes: "",
    },
    fields: supplierFields,
    onSubmit: async (data) => {
      const { error } = await suppliersAPI.create(data);
      if (error) {
        throw new Error('공급업체 저장에 실패했습니다. 다시 시도해주세요.');
      }
    },
    successRedirect: '/settings/supplier/list',
  });

  return (
    <FormContainer title="공급업체 추가" error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {supplierFields.map((field) => (
          <FormField
            key={field.name}
            field={field}
            value={formData[field.name]}
            onChange={handleChange}
          />
        ))}
        
        <FormActions
          loading={loading}
          cancelHref="/settings/supplier/list"
        />
      </form>
    </FormContainer>
  );
}
