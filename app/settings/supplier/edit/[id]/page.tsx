"use client";

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useForm, FormField as FormFieldType } from '../../../../../hooks/useForm';
import { suppliersAPI } from '../../../../../lib/supabase';
import FormContainer from '../../../../components/forms/FormContainer';
import FormField from '../../../../components/forms/FormField';
import FormActions from '../../../../components/forms/FormActions';

interface SupplierFormData {
  hospital_name: string;
  hospital_code: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  business_number: string;
  notes: string;
  is_active: boolean;
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
    name: 'hospital_code',
    label: '병원 코드',
    type: 'text',
    placeholder: '병원 코드를 입력하세요',
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
    name: 'address',
    label: '주소',
    type: 'text',
    placeholder: '주소를 입력하세요',
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
    name: 'notes',
    label: '메모',
    type: 'textarea',
    placeholder: '추가 메모를 입력하세요',
  },
  {
    name: 'is_active',
    label: '활성 상태',
    type: 'checkbox',
  },
];

export default function EditSupplierPage() {
  const params = useParams();
  const supplierId = params.id as string;
  
  const {
    formData,
    loading,
    error,
    initialLoading,
    handleChange,
    handleSubmit,
    loadData,
  } = useForm<SupplierFormData>({
    initialData: {
      hospital_name: '',
      hospital_code: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      business_number: '',
      notes: '',
      is_active: true,
    },
    fields: supplierFields,
    onSubmit: async (data) => {
      const { error } = await suppliersAPI.update(supplierId, data);
      if (error) {
        throw new Error('공급업체 수정에 실패했습니다. 다시 시도해주세요.');
      }
    },
    successRedirect: '/settings/supplier/list',
    loadInitialData: async () => {
      const { data, error } = await suppliersAPI.getById(supplierId);
      if (error) {
        throw new Error('공급업체 정보를 불러오는데 실패했습니다.');
      }
      
      return {
        hospital_name: data.hospital_name || '',
        hospital_code: data.hospital_code || '',
        contact_person: data.contact_person || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        city: data.city || '',
        business_number: data.business_number || '',
        notes: data.notes || '',
        is_active: data.is_active ?? true,
      };
    },
  });

  useEffect(() => {
    if (supplierId) {
      loadData();
    }
  }, [supplierId, loadData]);

  if (initialLoading) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-text-secondary">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <FormContainer title="공급업체 수정" error={error}>
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
          submitText="수정 완료"
          cancelHref="/settings/supplier/list"
        />
      </form>
    </FormContainer>
  );
}