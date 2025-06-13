"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, clientsAPI } from "../../../lib/supabase";

interface Client {
  id: string;
  company_name: string;
}

interface Product {
  id: string;
  cfn: string;
  description?: string;
}

export default function ManualInboundPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // 폼 데이터 상태
  const [formData, setFormData] = useState({
    inbound_date: new Date().toISOString().split("T")[0], // 오늘 날짜
    client_id: "",
    product_id: "",
    lot_number: "",
    expiry_date: "",
    quantity: "",
    notes: "",
  });

  // 거래처 목록 로드
  useEffect(() => {
    loadClients();
  }, []);

  // 거래처 변경 시 해당 거래처의 제품 목록 로드
  useEffect(() => {
    if (formData.client_id) {
      loadProducts(formData.client_id);
    } else {
      setProducts([]);
      setFormData((prev) => ({ ...prev, product_id: "" }));
    }
  }, [formData.client_id]);

  const loadClients = async () => {
    try {
      setClientsLoading(true);
      const { data, error } = await clientsAPI.getAll();

      if (error) throw error;

      setClients(data || []);
    } catch {
      console.error("거래처 로딩 실패:");
      setError("거래처 목록을 불러오는데 실패했습니다.");
    } finally {
      setClientsLoading(false);
    }
  };

  const loadProducts = async (clientId: string) => {
    try {
      setProductsLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, cfn, description")
        .eq("client_id", clientId)
        .order("cfn");

      if (error) throw error;

      setProducts(data || []);
    } catch {
      console.error("제품 로딩 실패:");
      setError("제품 목록을 불러오는데 실패했습니다.");
    } finally {
      setProductsLoading(false);
    }
  };

  // 입력값 변경 핸들러
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 필수 필드 검증
    if (!formData.client_id) {
      setError("거래처를 선택해주세요.");
      return;
    }
    if (!formData.product_id) {
      setError("제품을 선택해주세요.");
      return;
    }
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      setError("올바른 수량을 입력해주세요.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // stock_movements 테이블에 입고 기록 추가
      const { data, error } = await supabase
        .from("stock_movements")
        .insert([
          {
            product_id: formData.product_id,
            movement_type: "in",
            movement_reason: "purchase",
            from_location_id: formData.client_id, // 거래처 ID (이제 locations에 있음)
            to_location_id: "c24e8564-4987-4cfd-bd0b-e9f05a4ab541", // ABLE 중앙창고
            quantity: parseInt(formData.quantity),
            lot_number: formData.lot_number || null,
            ubd_date: formData.expiry_date || null,
            notes: formData.notes || null,
            inbound_date: formData.inbound_date, // 입고일 별도 컬럼 사용
          },
        ])
        .select();

      if (error) throw error;

      console.log("입고 등록 성공:", data);

      // 성공 시 입고관리 페이지로 이동
      router.push("/inbound");
    } catch {
      setError("입고 정보를 불러오는데 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">직접 입고</h1>
      </div>

      {/* 폼 */}
      <div className="bg-accent-light p-6 rounded-lg shadow">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 입고일자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              입고일자 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="inbound_date"
              value={formData.inbound_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary"
              required
            />
          </div>

          {/* 거래처 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              거래처 <span className="text-red-500">*</span>
            </label>
            {clientsLoading ? (
              <div className="text-sm text-text-secondary">
                거래처 목록 로딩 중...
              </div>
            ) : (
              <select
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary bg-white appearance-none"
                required
              >
                <option value="">거래처를 선택하세요</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* CFN 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CFN <span className="text-red-500">*</span>
            </label>
            {!formData.client_id ? (
              <div className="text-sm text-text-secondary bg-gray-100 px-3 py-2 rounded-lg">
                먼저 거래처를 선택해주세요
              </div>
            ) : productsLoading ? (
              <div className="text-sm text-text-secondary">
                제품 목록 로딩 중...
              </div>
            ) : (
              <select
                name="product_id"
                value={formData.product_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary bg-white appearance-none"
                required
                disabled={!formData.client_id}
              >
                <option value="">CFN을 선택하세요</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.cfn}{" "}
                    {product.description && `- ${product.description}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* LOT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LOT 번호
            </label>
            <input
              type="text"
              name="lot_number"
              value={formData.lot_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary"
              placeholder="LOT 번호를 입력하세요"
            />
          </div>

          {/* UBD (유통기한) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              UBD (유통기한)
            </label>
            <input
              type="date"
              name="expiry_date"
              value={formData.expiry_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* 수량 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              수량 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary"
              placeholder="입고 수량을 입력하세요"
              min="1"
              required
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메모
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary"
              placeholder="입고 관련 메모를 입력하세요"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading || clientsLoading}
              className="px-6 py-2 bg-primary text-text-primary rounded-lg hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "등록 중..." : "입고 등록"}
            </button>
            <Link
              href="/inbound"
              className="px-6 py-2 bg-accent-soft text-text-secondary rounded-lg hover:bg-accent-light transition-colors"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
