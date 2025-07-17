"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, FormField as FormFieldType } from '../../../../hooks/useForm';
import { supabase, clientsAPI } from "../../../../lib/supabase";
import FormContainer from '../../../components/forms/FormContainer';
import FormField from '../../../components/forms/FormField';
import FormActions from '../../../components/forms/FormActions';

interface Client {
  id: string;
  company_name: string;
}

interface ProductFormData {
  client_id: string;
  cfn: string;
  upn: string;
  description: string;
  category: string;
  unit: string;
}

function AddProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  const productFields: FormFieldType[] = [
    {
      name: 'client_id',
      label: '거래처',
      type: 'select',
      required: true,
      options: clients.map(client => ({
        value: client.id,
        label: client.company_name
      })),
    },
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
      placeholder: '제품에 대한 상세 설명을 입력하세요',
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
      type: 'select',
      options: [
        { value: 'EA', label: 'EA' },
        { value: 'BOX', label: 'BOX' },
        { value: 'SET', label: 'SET' },
      ],
    },
  ];

  const {
    formData,
    loading,
    error,
    setFormData,
    handleChange,
    handleSubmit,
  } = useForm<ProductFormData>({
    initialData: {
      client_id: "",
      cfn: "",
      upn: "",
      description: "",
      category: "",
      unit: "EA",
    },
    fields: productFields,
    onSubmit: async (data) => {
      const { error } = await supabase
        .from("products")
        .insert([data])
        .select();

      if (error) {
        if (error.code === "23505") {
          throw new Error("이미 등록된 CFN/UPN 조합입니다.");
        } else {
          throw new Error("제품 저장에 실패했습니다. 다시 시도해주세요.");
        }
      }
    },
    successRedirect: "/settings/product/list",
  });

  // 거래처 목록 로드
  useEffect(() => {
    const loadClients = async () => {
      try {
        setClientsLoading(true);
        const { data, error } = await clientsAPI.getAll();

        if (error) throw error;

        setClients(data || []);
      } catch (err) {
        console.error("거래처 로딩 실패:", err);
      } finally {
        setClientsLoading(false);
      }
    };

    loadClients();
  }, []);

  // URL 파라미터에서 UPN 받아오기
  useEffect(() => {
    const upnParam = searchParams.get("upn");
    if (upnParam) {
      setFormData((prev) => ({
        ...prev,
        upn: upnParam,
      }));
    }
  }, [searchParams, setFormData]);

  return (
    <FormContainer title="제품 추가" error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {clientsLoading ? (
          <div className="text-sm text-text-secondary">
            거래처 목록 로딩 중...
          </div>
        ) : (
          productFields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={formData[field.name]}
              onChange={handleChange}
            />
          ))
        )}
        
        <FormActions
          loading={loading || clientsLoading}
          cancelHref="/settings/product/list"
        />
      </form>
    </FormContainer>
  );
}

export default function AddProductPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AddProductForm />
    </Suspense>
  );
}
