"use client";

import BaseModal from "./BaseModal";

interface Product {
  id: string;
  client_id: string;
  cfn: string;
  upn: string;
  description?: string;
  category?: string;
  unit: string;
  created_at?: string;
  clients?: {
    company_name: string;
  };
}

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  cfn: string;
}

export default function ProductDetailModal({
  isOpen,
  onClose,
  products,
  cfn,
}: ProductDetailModalProps) {
  if (!products || products.length === 0) return null;

  const firstProduct = products[0];

  const handleEdit = () => {
    onClose();
    window.location.href = `/settings/product/edit?id=${firstProduct.id}`;
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="제품 상세 정보"
      size="lg"
      customHeaderActions={
        <button
          onClick={handleEdit}
          className="p-2 hover:bg-accent-light rounded-lg transition-colors"
          title="수정하기"
        >
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      }
    >
      <div className="space-y-4">
        {/* 기본 정보 */}
        <div className="bg-white p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                CFN (제품 코드)
              </label>
              <div className="text-primary font-semibold text-xl">{cfn}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                거래처명
              </label>
              <div className="text-primary font-medium">
                {firstProduct.clients?.company_name || "미지정 거래처"}
              </div>
            </div>
          </div>
        </div>

        {/* UPN 목록 테이블 */}
        <div className="overflow-hidden rounded-lg border border-accent-soft">
          <table className="w-full">
            <thead>
              <tr className="bg-accent-light border-b border-accent-soft">
                <th className="px-4 py-3 text-left text-sm font-medium text-primary">
                  UPN
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-primary">
                  제품 설명
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-accent-soft">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-accent-light">
                  <td className="px-4 py-3">
                    <span className="text-primary font-medium">
                      {product.upn}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {product.description || "설명이 없습니다."}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </BaseModal>
  );
}
