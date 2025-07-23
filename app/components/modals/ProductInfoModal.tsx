"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import BaseModal from "./BaseModal";
import LoadingSpinner from "../ui/LoadingSpinner";

interface ProductInfo {
  id: string;
  client_id: string;
  cfn: string;
  upn: string;
  description?: string;
  category?: string;
  clients?: {
    company_name: string;
  };
}

interface ProductInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  cfn?: string; // CFN으로도 조회 가능
}

export default function ProductInfoModal({
  isOpen,
  onClose,
  productId,
  cfn,
}: ProductInfoModalProps) {
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isOpen && (productId || cfn)) {
      fetchProductInfo();
    }
  }, [isOpen, productId, cfn]);

  const fetchProductInfo = async () => {
    if (!productId && !cfn) return;

    setLoading(true);
    setError("");
    setProduct(null);

    try {
      let query = supabase
        .from("products")
        .select(`
          id,
          client_id,
          cfn,
          upn,
          description,
          category,
          clients!inner(company_name)
        `);

      if (productId) {
        query = query.eq("id", productId);
      } else if (cfn) {
        query = query.eq("cfn", cfn);
      }

      const { data, error: fetchError } = await query.single();

      if (fetchError) {
        throw new Error("제품 정보를 찾을 수 없습니다.");
      }

      // clients 배열에서 첫 번째 요소만 추출
      const processedData = {
        ...data,
        clients: data.clients && Array.isArray(data.clients) && data.clients.length > 0 ? data.clients[0] : null
      };

      setProduct(processedData);
    } catch (err) {
      console.error("제품 정보 조회 실패:", err);
      setError(err instanceof Error ? err.message : "제품 정보 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="제품 정보"
      size="md"
    >
      {loading && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" message="제품 정보를 불러오는 중..." />
        </div>
      )}

      {error && (
        <div className="bg-status-error-bg border border-status-error-border rounded-lg p-4">
          <div className="text-status-error-text text-sm font-medium">
            {error}
          </div>
        </div>
      )}

      {product && !loading && (
        <div className="bg-white rounded-lg border border-accent-soft p-6">
          <div className="space-y-6">
            {/* 제품 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">CFN</label>
                  <p className="text-lg font-semibold text-primary">{product.cfn}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">UPN</label>
                  <p className="text-base text-text-primary font-mono">{product.upn}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">거래처</label>
                  <p className="text-base text-text-primary font-medium">
                    {product.clients?.company_name || "정보 없음"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">카테고리</label>
                  <p className="text-base text-text-primary">
                    {product.category || "미분류"}
                  </p>
                </div>
              </div>
            </div>

            {/* 제품 설명 */}
            {product.description && (
              <div className="border-t pt-6">
                <label className="text-sm font-medium text-text-secondary block mb-2">제품 설명</label>
                <div className="bg-accent-light rounded-md p-4">
                  <p className="text-text-primary leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!product && !loading && !error && (
        <div className="text-center py-8">
          <p className="text-text-secondary">표시할 제품 정보가 없습니다.</p>
        </div>
      )}
    </BaseModal>
  );
} 