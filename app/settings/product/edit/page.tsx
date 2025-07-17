"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, FormField as FormFieldType } from '../../../../hooks/useForm';
import { productsAPI } from "../../../../lib/supabase";
import FormContainer from '../../../components/forms/FormContainer';
import FormField from '../../../components/forms/FormField';
import FormActions from '../../../components/forms/FormActions';

interface ProductFormData {
  cfn: string;
  upn: string;
  description: string;
  category: string;
  unit: string;
}

const productFields: FormFieldType[] = [
  {
    name: 'cfn',
    label: 'CFN',
    type: 'text',
    required: true,
    placeholder: '제품명을 입력하세요',
  },
  {
    name: 'upn',
    label: 'UPN',
    type: 'text',
    required: true,
    placeholder: 'UDI를 입력하세요',
  },
  {
    name: 'description',
    label: '제품 설명',
    type: 'textarea',
    placeholder: '제품에 대한 설명을 입력하세요',
  },
  {
    name: 'category',
    label: '카테고리',
    type: 'text',
    placeholder: '제품 카테고리를 입력하세요',
  },
  {
    name: 'unit',
    label: '단위',
    type: 'text',
    required: true,
    placeholder: '개, 박스, kg 등',
  },
];

export default function ProductEditPage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("id");

  const {
    formData,
    loading,
    error,
    initialLoading,
    handleChange,
    handleSubmit,
    loadData,
  } = useForm<ProductFormData>({
    initialData: {
      cfn: "",
      upn: "",
      description: "",
      category: "",
      unit: "",
    },
    fields: productFields,
    onSubmit: async (data) => {
      if (!productId) {
        throw new Error("제품 ID가 없습니다.");
      }
      
      const { error } = await productsAPI.update(productId, data);
      if (error) {
        throw new Error("제품 수정에 실패했습니다.");
      }
    },
    successRedirect: "/settings/product/list",
    loadInitialData: async () => {
      if (!productId) {
        throw new Error("제품 ID가 없습니다.");
      }
      
      const { data, error } = await productsAPI.getById(productId);
      if (error) {
        throw new Error("제품 정보를 불러오는데 실패했습니다.");
      }
      
      return {
        cfn: data.cfn || "",
        upn: data.upn || "",
        description: data.description || "",
        category: data.category || "",
        unit: data.unit || "",
      };
    },
  });

  useEffect(() => {
    if (productId) {
      loadData();
    }
  }, [productId, loadData]);

  if (initialLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-text-secondary">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!productId) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-600">제품을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <FormContainer title="제품 수정" error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {productFields.map((field) => (
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
          cancelHref="/settings/product/list"
        />
      </form>
    </FormContainer>
  );
}
