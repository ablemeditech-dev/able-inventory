"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, clientsAPI } from "../../../lib/supabase";
import Alert from "../../components/ui/Alert";
import { productsAPI } from "../../../lib/supabase";
import FormField from "../../components/forms/FormField";
import Button from "../../components/ui/Button";
import { SYSTEM_CONSTANTS } from "../../../lib/constants";
import ManualPageLayout from "../../components/layout/ManualPageLayout";

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
    }
  }, [formData.client_id]);

  const loadClients = async () => {
    try {
      const { data, error } = await clientsAPI.getAll();
      
      if (error) {
        throw error;
      }
      
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("거래처 로드 실패:", err);
      setError("거래처 목록을 불러오는데 실패했습니다.");
      setClients([]); // 에러 시 빈 배열로 설정
    } finally {
      setClientsLoading(false);
    }
  };

  const loadProducts = async (clientId: string) => {
    setProductsLoading(true);
    try {
      const { data, error } = await productsAPI.getByClient(clientId);
      
      if (error) {
        throw error;
      }
      
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("제품 로드 실패:", err);
      setError("제품 목록을 불러오는데 실패했습니다.");
      setProducts([]); // 에러 시 빈 배열로 설정
    } finally {
      setProductsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 거래처의 location_id 조회
      const { data: locationData, error: locationError } = await supabase
        .from("locations")
        .select("id")
        .eq("reference_id", formData.client_id)
        .single();

      if (locationError) {
        throw new Error("거래처 위치 정보를 찾을 수 없습니다.");
      }

      // 재고 이동 기록 추가
      const { error } = await supabase
        .from("stock_movements")
        .insert([
          {
            product_id: formData.product_id,
            movement_type: "in",
            movement_reason: "purchase",
            from_location_id: locationData.id,
            to_location_id: SYSTEM_CONSTANTS.ABLE_WAREHOUSE_ID,
            quantity: parseInt(formData.quantity),
            lot_number: formData.lot_number || null,
            ubd_date: formData.expiry_date || null,
            notes: formData.notes || null,
            inbound_date: formData.inbound_date,
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      // 성공 시 입고관리 페이지로 이동
      router.push("/inbound");
    } catch {
      setError("입고 정보를 불러오는데 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ManualPageLayout title="직접 입고" backHref="/inbound" backLabel="목록으로">
      {error && (
        <Alert type="error" message={error} />
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
            className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
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
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
              required
            >
              <option value="">거래처를 선택하세요</option>
              {Array.isArray(clients) && clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 제품 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            제품 <span className="text-red-500">*</span>
          </label>
          {productsLoading ? (
            <div className="text-sm text-text-secondary">
              제품 목록 로딩 중...
            </div>
          ) : (
            <select
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
              required
              disabled={!formData.client_id}
            >
              <option value="">제품을 선택하세요</option>
              {Array.isArray(products) && products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.cfn} - {product.description}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* LOT 번호 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            LOT 번호 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="lot_number"
            value={formData.lot_number}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
            required
          />
        </div>

        {/* 유효기간 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            유효기간 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="expiry_date"
            value={formData.expiry_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
            required
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
            className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
            required
            min="1"
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
            className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
            placeholder="추가 메모사항을 입력하세요"
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "등록 중..." : "등록"}
          </button>
          <Link
            href="/inbound"
            className="px-6 py-2 bg-accent-soft text-text-secondary rounded-lg hover:bg-accent-light transition-colors"
          >
            취소
          </Link>
        </div>
      </form>
    </ManualPageLayout>
  );
}
