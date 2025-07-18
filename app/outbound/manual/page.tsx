"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import ManualPageLayout from "../../components/layout/ManualPageLayout";
import Alert from "../../components/ui/Alert";
import { SYSTEM_CONSTANTS } from "../../../lib/constants";

interface Hospital {
  id: string;
  hospital_name: string;
}

interface Product {
  id: string;
  cfn: string;
  description: string;
}

interface InventoryItem {
  product_id: string;
  cfn: string;
  description: string;
  lot_number: string;
  ubd_date: string;
  quantity: number;
}

export default function ManualOutboundPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hospitalsLoading, setHospitalsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // 폼 데이터 상태
  const [formData, setFormData] = useState({
    outbound_date: new Date().toISOString().split("T")[0],
    hospital_id: "",
    product_id: "",
    lot_number: "",
    ubd_date: "",
    quantity: "",
    notes: "",
  });

  // 병원 목록 로드
  useEffect(() => {
    loadHospitals();
  }, []);

  // 제품 목록 로드
  useEffect(() => {
    loadProducts();
  }, []);

  // 제품 선택 시 해당 제품의 재고 로드
  useEffect(() => {
    if (formData.product_id) {
      loadInventory(formData.product_id);
    } else {
      setInventory([]);
    }
  }, [formData.product_id]);

  const loadHospitals = async () => {
    try {
      const { data, error } = await supabase
        .from("hospitals")
        .select("id, hospital_name")
        .order("hospital_name");

      if (error) throw error;
      setHospitals(data || []);
    } catch (err) {
      console.error("병원 로드 실패:", err);
      setError("병원 목록을 불러오는데 실패했습니다.");
    } finally {
      setHospitalsLoading(false);
    }
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, cfn, description")
        .order("cfn");

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("제품 로드 실패:", err);
      setError("제품 목록을 불러오는데 실패했습니다.");
    } finally {
      setProductsLoading(false);
    }
  };

  const loadInventory = async (productId: string) => {
    setInventoryLoading(true);
    try {
      // 에이블 중앙창고의 모든 재고 이동 기록 조회
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          product_id,
          lot_number,
          ubd_date,
          quantity,
          movement_type,
          from_location_id,
          to_location_id,
          products!inner(cfn, description)
        `)
        .eq("product_id", productId)
        .or(`from_location_id.eq.${SYSTEM_CONSTANTS.ABLE_WAREHOUSE_ID},to_location_id.eq.${SYSTEM_CONSTANTS.ABLE_WAREHOUSE_ID}`)
        .order("ubd_date");

      if (error) throw error;

      // LOT별로 재고 계산 (입고량 - 출고량)
      const inventoryMap = new Map<string, InventoryItem>();
      
      data?.forEach(item => {
        const products = Array.isArray(item.products) ? item.products[0] : item.products;
        const key = item.lot_number;
        
        if (!inventoryMap.has(key)) {
          inventoryMap.set(key, {
            product_id: item.product_id,
            cfn: products?.cfn || '',
            description: products?.description || '',
            lot_number: item.lot_number,
            ubd_date: item.ubd_date,
            quantity: 0
          });
        }
        
        const inventoryItem = inventoryMap.get(key)!;
        
        // 에이블 중앙창고로 들어오는 것은 입고 (+)
        if (item.to_location_id === SYSTEM_CONSTANTS.ABLE_WAREHOUSE_ID) {
          inventoryItem.quantity += item.quantity;
        }
        // 에이블 중앙창고에서 나가는 것은 출고 (-)
        else if (item.from_location_id === SYSTEM_CONSTANTS.ABLE_WAREHOUSE_ID) {
          inventoryItem.quantity -= item.quantity;
        }
        
        // 더 빠른 UBD 날짜로 업데이트
        if (new Date(item.ubd_date) < new Date(inventoryItem.ubd_date)) {
          inventoryItem.ubd_date = item.ubd_date;
        }
      });

      // 수량이 0보다 큰 재고만 필터링하고 UBD 날짜순 정렬
      const inventoryData = Array.from(inventoryMap.values())
        .filter(item => item.quantity > 0)
        .sort((a, b) => new Date(a.ubd_date).getTime() - new Date(b.ubd_date).getTime());

      setInventory(inventoryData);
    } catch (err) {
      console.error("재고 로드 실패:", err);
      setError("재고 정보를 불러오는데 실패했습니다.");
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInventorySelect = (value: string) => {
    if (value) {
      const [lot_number, ubd_date] = value.split('|');
      setFormData(prev => ({
        ...prev,
        lot_number,
        ubd_date
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        lot_number: "",
        ubd_date: ""
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 병원의 location_id 조회
      const { data: locationData, error: locationError } = await supabase
        .from("locations")
        .select("id")
        .eq("reference_id", formData.hospital_id)
        .single();

      if (locationError) {
        throw new Error("병원 위치 정보를 찾을 수 없습니다.");
      }

      // 재고 이동 기록 추가
      const { error: insertError } = await supabase
        .from("stock_movements")
        .insert({
          product_id: formData.product_id,
          lot_number: formData.lot_number,
          ubd_date: formData.ubd_date,
          quantity: parseInt(formData.quantity),
          movement_type: "out",
          movement_reason: "sale",
          from_location_id: SYSTEM_CONSTANTS.ABLE_WAREHOUSE_ID,
          to_location_id: locationData.id,
          notes: formData.notes || null,
          created_at: new Date().toISOString(),
          inbound_date: formData.outbound_date,
        });

      if (insertError) {
        throw insertError;
      }

      // 성공 시 출고관리 페이지로 이동
      router.push("/outbound");
    } catch (err) {
      console.error("출고 등록 실패:", err);
      setError(err instanceof Error ? err.message : "출고 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const selectedInventoryItem = inventory.find(
    item => item.lot_number === formData.lot_number && item.ubd_date === formData.ubd_date
  );

  return (
    <ManualPageLayout title="수동 출고 등록" backHref="/outbound" backLabel="목록으로">
      {error && (
        <Alert type="error" message={error} className="mb-6" />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 출고일자 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            출고일자 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="outbound_date"
            value={formData.outbound_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
            required
          />
        </div>

        {/* 병원 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            출고 병원 <span className="text-red-500">*</span>
          </label>
          {hospitalsLoading ? (
            <div className="text-sm text-text-secondary">
              병원 목록 로딩 중...
            </div>
          ) : (
            <select
              name="hospital_id"
              value={formData.hospital_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
              required
            >
              <option value="">병원을 선택하세요</option>
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.hospital_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 제품 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CFN <span className="text-red-500">*</span>
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
            >
              <option value="">제품을 선택하세요</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.cfn} - {product.description}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 재고 선택 */}
        {formData.product_id && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LOT <span className="text-red-500">*</span>
            </label>
            {inventoryLoading ? (
              <div className="text-sm text-text-secondary">
                재고 정보 로딩 중...
              </div>
            ) : inventory.length > 0 ? (
              <select
                value={formData.lot_number && formData.ubd_date ? `${formData.lot_number}|${formData.ubd_date}` : ''}
                onChange={(e) => handleInventorySelect(e.target.value)}
                className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
                required
              >
                <option value="">LOT를 선택하세요</option>
                {inventory.map((item, index) => (
                  <option key={index} value={`${item.lot_number}|${item.ubd_date}`}>
                    {item.lot_number} (UBD: {new Date(item.ubd_date).toLocaleDateString()}) - 수량: {item.quantity}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-text-secondary">
                먼저 CFN을 선택해주세요
              </div>
            )}
          </div>
        )}

        {/* 수량 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            출고 수량 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
            required
            min="1"
            max={selectedInventoryItem?.quantity || undefined}
          />
          {selectedInventoryItem && (
            <div className="text-sm text-text-secondary mt-1">
              최대 출고 가능 수량: {selectedInventoryItem.quantity}
            </div>
          )}
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
            {loading ? "등록 중..." : "출고 등록"}
          </button>
          <Link
            href="/outbound"
            className="px-6 py-2 bg-accent-soft text-text-secondary rounded-lg hover:bg-accent-light transition-colors"
          >
            취소
          </Link>
        </div>
      </form>
    </ManualPageLayout>
  );
}
