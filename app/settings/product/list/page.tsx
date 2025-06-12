"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { productsAPI } from "../../../../lib/supabase";
import ProductDetailModal from "../../../components/modals/ProductDetailModal";

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

interface GroupedProducts {
  [clientName: string]: Product[];
}

export default function ProductsListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedCfn, setSelectedCfn] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await productsAPI.getAll();

      if (error) {
        throw error;
      }

      setProducts(data || []);
    } catch (err) {
      console.error("제품 로딩 실패:", err);
      setError("제품 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 거래처별로 제품 그룹핑 및 CFN 내림차순 정렬
  const groupedProducts: GroupedProducts = products.reduce((acc, product) => {
    const clientName = product.clients?.company_name || "미지정 거래처";

    if (!acc[clientName]) {
      acc[clientName] = [];
    }

    acc[clientName].push(product);
    return acc;
  }, {} as GroupedProducts);

  // 각 거래처 내에서 CFN 오름차순 정렬
  Object.keys(groupedProducts).forEach((clientName) => {
    groupedProducts[clientName].sort((a, b) => a.cfn.localeCompare(b.cfn));
  });

  const toggleAccordion = (clientName: string) => {
    setOpenAccordions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clientName)) {
        newSet.delete(clientName);
      } else {
        newSet.add(clientName);
      }
      return newSet;
    });
  };

  const handleProductClick = (product: Product) => {
    // 같은 CFN을 가진 모든 제품들을 찾기
    const sameProducts = products.filter((p) => p.cfn === product.cfn);
    setSelectedProducts(sameProducts);
    setSelectedCfn(product.cfn);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProducts([]);
    setSelectedCfn("");
  };

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">제품 목록</h1>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-text-secondary">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">제품 목록</h1>
        <Link
          href="/settings"
          className="px-4 py-2 bg-primary text-text-primary rounded-lg hover:bg-accent-soft transition-colors"
        >
          ← 돌아가기
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 아코디언 카드들 */}
      <div className="space-y-4">
        {Object.keys(groupedProducts).length === 0 ? (
          <div className="bg-accent-light p-8 rounded-lg text-center">
            <p className="text-text-secondary mb-4">등록된 제품이 없습니다.</p>
            <Link
              href="/settings/product/add"
              className="inline-block px-4 py-2 bg-primary text-text-primary rounded hover:bg-accent-soft transition-colors"
            >
              제품 추가
            </Link>
          </div>
        ) : (
          Object.keys(groupedProducts)
            .sort() // 거래처명 알파벳 순 정렬
            .map((clientName) => {
              const isOpen = openAccordions.has(clientName);
              const clientProducts = groupedProducts[clientName];

              return (
                <div
                  key={clientName}
                  className="bg-accent-light rounded-lg shadow overflow-hidden"
                >
                  {/* 아코디언 헤더 */}
                  <button
                    onClick={() => toggleAccordion(clientName)}
                    className="w-full px-6 py-4 bg-primary text-text-primary text-left hover:bg-accent-soft transition-colors flex items-center justify-between focus:outline-none"
                  >
                    <div>
                      <h3 className="font-semibold text-lg">{clientName}</h3>
                      <p className="text-sm opacity-90">
                        {clientProducts.length}개 제품
                      </p>
                    </div>
                    <div className="text-xl">{isOpen ? "−" : "+"}</div>
                  </button>

                  {/* 아코디언 바디 */}
                  {isOpen && (
                    <div className="bg-white border-t border-accent-soft">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                                CFN
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                                설명
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                                카테고리
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {clientProducts.map((product, index) => (
                              <tr
                                key={product.id}
                                onClick={() => handleProductClick(product)}
                                className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${
                                  index % 2 === 0 ? "bg-white" : "bg-gray-25"
                                }`}
                              >
                                <td className="px-4 py-3">
                                  <span className="text-primary font-semibold">
                                    {product.cfn}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-text-secondary text-sm">
                                    {product.description || "-"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {product.category ? (
                                    <span className="px-2 py-1 bg-accent-light text-text-secondary text-xs rounded">
                                      {product.category}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-sm">
                                      -
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>

      {/* 제품 상세 모달 */}
      <ProductDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        products={selectedProducts}
        cfn={selectedCfn}
      />
    </div>
  );
}
