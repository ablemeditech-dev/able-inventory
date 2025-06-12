"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { productsAPI } from "../../../../lib/supabase";

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

export default function ProductEditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get("id");

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  // 폼 데이터
  const [formData, setFormData] = useState({
    cfn: "",
    upn: "",
    description: "",
    category: "",
    unit: "",
  });

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);
  const loadProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await productsAPI.getById(productId!);

      if (error) {
        throw error;
      }

      if (data) {
        setProduct(data);
        setFormData({
          cfn: data.cfn || "",
          upn: data.upn || "",
          description: data.description || "",
          category: data.category || "",
          unit: data.unit || "",
        });
      }
    } catch (err) {
      console.error("제품 로딩 실패:", err);
      setError("제품 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) return;

    try {
      setSaving(true);
      setError("");

      const { error } = await productsAPI.update(productId, formData);

      if (error) {
        throw error;
      }

      // 성공 시 목록 페이지로 이동
      router.push("/settings/product/list");
    } catch (err) {
      console.error("제품 수정 실패:", err);
      setError("제품 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-text-secondary">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-600">제품을 찾을 수 없습니다.</p>
          <Link
            href="/settings/product/list"
            className="mt-4 inline-block px-4 py-2 bg-primary text-text-primary rounded-lg hover:bg-accent-soft transition-colors"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">제품 수정</h1>
        <Link
          href="/settings/product/list"
          className="px-4 py-2 bg-accent-light text-primary border border-accent-soft rounded-lg hover:bg-accent-soft transition-colors"
        >
          ← 목록으로
        </Link>
      </div>
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}{" "}
      {/* 수정 폼 */}
      <div className="bg-background border border-accent-soft rounded-xl p-6 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="bg-gradient-to-r from-accent-light to-accent-soft p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-primary mb-4">
              기본 정보
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  CFN (제품 코드) *
                </label>
                <input
                  type="text"
                  name="cfn"
                  value={formData.cfn}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-accent-soft rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  UPN (사용자 제품 번호) *
                </label>
                <input
                  type="text"
                  name="upn"
                  value={formData.upn}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-accent-soft rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                />
              </div>
            </div>
          </div>

          {/* 상세 정보 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                제품 설명
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-accent-soft rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                placeholder="제품에 대한 설명을 입력하세요"
              />
            </div>{" "}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  카테고리
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-accent-soft rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                  placeholder="제품 카테고리"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  단위 *
                </label>
                <input
                  type="text"
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-accent-soft rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                  placeholder="개, 박스, kg 등"
                />
              </div>
            </div>
          </div>

          {/* 거래처 정보 (읽기 전용) */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              거래처 정보
            </h3>
            <p className="text-gray-600">
              {product.clients?.company_name || "미지정 거래처"}
            </p>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-accent-soft">
            <Link
              href="/settings/product/list"
              className="px-6 py-3 text-text-secondary bg-accent-light border border-accent-soft rounded-xl hover:bg-accent-soft transition-colors font-medium"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-primary text-text-primary rounded-xl hover:bg-accent-soft transition-colors font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
