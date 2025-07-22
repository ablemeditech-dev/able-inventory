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
  unit: string;
  created_at?: string;
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
          unit,
          created_at,
          clients(company_name)
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

      setProduct(data);
    } catch (err) {
      console.error("제품 정보 조회 실패:", err);
      setError(err instanceof Error ? err.message : "제품 정보 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ko-KR");
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
        <div className="space-y-6">
          {/* 기본 정보 카드 */}
          <div className="bg-accent-light rounded-lg border border-accent-soft p-4">
            <h3 className="text-lg font-semibold text-primary mb-4">기본 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-text-secondary">CFN</label>
                  <p className="text-base font-semibold text-primary mt-1">{product.cfn}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">UPN</label>
                  <p className="text-base text-text-primary mt-1 font-mono">{product.upn}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">거래처</label>
                  <p className="text-base text-text-primary mt-1">
                    {product.clients?.company_name || "정보 없음"}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-text-secondary">카테고리</label>
                  <p className="text-base text-text-primary mt-1">
                    {product.category || "미분류"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">단위</label>
                  <p className="text-base text-text-primary mt-1">{product.unit}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">등록일</label>
                  <p className="text-base text-text-primary mt-1">{formatDate(product.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 제품 설명 카드 */}
          <div className="bg-white rounded-lg border border-accent-soft p-4">
            <h3 className="text-lg font-semibold text-primary mb-3">제품 설명</h3>
            <div className="bg-accent-light rounded-md p-3">
              <p className="text-text-primary leading-relaxed">
                {product.description || "제품 설명이 없습니다."}
              </p>
            </div>
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