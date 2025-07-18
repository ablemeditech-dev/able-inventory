"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import Button, { LinkButton } from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import ManualPageLayout from "../../components/layout/ManualPageLayout";

interface Hospital {
  id: string;
  hospital_name: string;
}

interface Product {
  id: string;
  cfn: string;
  product_name: string;
  category: string;
  client_name: string;
}

interface InventoryItem {
  product_id: string;
  cfn: string;
  description: string;
  lot_number: string;
  ubd_date: string;
  quantity: number;
}

export default function ManualClosingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hospitalsLoading, setHospitalsLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // 오늘 날짜로 초기화
    hospital_id: "",
    product_id: "",
    cfn: "",
    lot_number: "",
    ubd_date: "",
    quantity: "",
    notes: "",
  });

  // 병원 목록 로드
  useEffect(() => {
    loadHospitals();
  }, []);

  // 날짜 또는 병원 선택 시 해당 병원의 재고 로드
  useEffect(() => {
    if (formData.hospital_id && formData.date) {
      loadHospitalInventory(formData.hospital_id, formData.date);
    } else {
      setInventory([]);
    }
  }, [formData.hospital_id, formData.date]);

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

  const loadHospitalInventory = async (hospitalId: string, date: string) => {
    setInventoryLoading(true);
    try {
      // 선택된 날짜까지의 재고 조회
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
          created_at,
          products!inner(cfn, description)
        `)
        .or(`from_location_id.eq.${hospitalId},to_location_id.eq.${hospitalId}`)
        .lte('created_at', `${date}T23:59:59`)
        .order("ubd_date");

      if (error) throw error;

      // LOT별로 재고 계산 (입고량 - 출고량)
      const inventoryMap = new Map<string, InventoryItem>();
      
      data?.forEach(item => {
        const products = Array.isArray(item.products) ? item.products[0] : item.products;
        const key = `${products?.cfn}-${item.lot_number}`;
        
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
        
        // 해당 병원으로 들어오는 것은 입고 (+)
        if (item.to_location_id === hospitalId) {
          inventoryItem.quantity += item.quantity;
        }
        // 해당 병원에서 나가는 것은 출고 (-)
        else if (item.from_location_id === hospitalId) {
          inventoryItem.quantity -= item.quantity;
        }
        
        // 더 빠른 UBD 날짜로 업데이트
        if (new Date(item.ubd_date) < new Date(inventoryItem.ubd_date)) {
          inventoryItem.ubd_date = item.ubd_date;
        }
      });

      // 수량이 0보다 큰 재고만 필터링하고 CFN순 정렬
      const inventoryData = Array.from(inventoryMap.values())
        .filter(item => item.quantity > 0)
        .sort((a, b) => a.cfn.localeCompare(b.cfn));

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

  const handleCfnSelect = (value: string) => {
    if (value) {
      const [cfn, lot_number, ubd_date, product_id] = value.split('|');
      setFormData(prev => ({
        ...prev,
        cfn,
        lot_number,
        ubd_date,
        product_id
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        cfn: "",
        lot_number: "",
        ubd_date: "",
        product_id: ""
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // 입력값 검증
      if (!formData.product_id || !formData.lot_number || !formData.ubd_date || !formData.quantity) {
        throw new Error("필수 항목이 누락되었습니다.");
      }

      // 등록할 데이터 준비
      const insertData = {
        product_id: formData.product_id,
        lot_number: formData.lot_number,
        ubd_date: formData.ubd_date,
        quantity: parseInt(formData.quantity),
        movement_type: "out",
        movement_reason: "usage",
        from_location_id: formData.hospital_id, // 병원 ID를 직접 사용
        to_location_id: null,
        notes: formData.notes || null,
        created_at: new Date().toISOString(),
        inbound_date: formData.date, // 선택한 날짜를 inbound_date로 사용
      };

      // 재고 이동 기록 등록
      const { error: insertError } = await supabase
        .from("stock_movements")
        .insert(insertData);

      if (insertError) {
        throw insertError;
      }

      setSuccess("소모 등록이 완료되었습니다.");
      
      // 3초 후 목록 페이지로 이동
      setTimeout(() => {
        router.push("/closing");
      }, 3000);

    } catch (err) {
      console.error("등록 실패:", err);
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const selectedInventoryItem = inventory.find(
    item => `${item.cfn}|${item.lot_number}|${item.ubd_date}|${item.product_id}` === 
           `${formData.cfn}|${formData.lot_number}|${formData.ubd_date}|${formData.product_id}`
  );

  return (
    <ManualPageLayout title="수동 소모 등록" backHref="/closing" backLabel="목록으로">
      {/* 에러 메시지 */}
      {error && (
        <Alert 
          type="error" 
          message={error} 
          className="mb-4"
        />
      )}

      {/* 성공 메시지 */}
      {success && (
        <Alert 
          type="success" 
          message={success} 
          className="mb-4"
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 날짜 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            조회 날짜 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
            required
          />
          <div className="text-sm text-text-secondary mt-1">
            선택한 날짜 기준으로 재고 현황을 조회합니다.
          </div>
        </div>

        {/* 병원 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            병원 선택 <span className="text-red-500">*</span>
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

        {/* CFN 선택 */}
        {formData.hospital_id && formData.date && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CFN <span className="text-red-500">*</span>
            </label>
            {inventoryLoading ? (
              <div className="text-sm text-text-secondary">
                재고 정보 로딩 중...
              </div>
            ) : inventory.length > 0 ? (
              <select
                value={formData.cfn && formData.lot_number && formData.ubd_date && formData.product_id ? 
                       `${formData.cfn}|${formData.lot_number}|${formData.ubd_date}|${formData.product_id}` : ''}
                onChange={(e) => handleCfnSelect(e.target.value)}
                className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
                required
              >
                <option value="">CFN을 선택하세요</option>
                {inventory.map((item, index) => (
                  <option key={index} value={`${item.cfn}|${item.lot_number}|${item.ubd_date}|${item.product_id}`}>
                    {item.cfn} (LOT: {item.lot_number}, UBD: {new Date(item.ubd_date).toLocaleDateString()}) - 수량: {item.quantity}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-text-secondary">
                선택한 병원에 {formData.date} 기준으로 재고가 없습니다.
              </div>
            )}
          </div>
        )}

        {/* 선택된 재고 정보 */}
        {selectedInventoryItem && (
          <div>
            <div className="bg-accent-light p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">선택된 재고 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">CFN:</span>
                  <span className="ml-2 text-gray-900">{selectedInventoryItem.cfn}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">LOT:</span>
                  <span className="ml-2 text-gray-900">{selectedInventoryItem.lot_number}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">UBD:</span>
                  <span className="ml-2 text-gray-900">{new Date(selectedInventoryItem.ubd_date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">현재 수량:</span>
                  <span className="ml-2 text-gray-900">{selectedInventoryItem.quantity}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">제품명:</span>
                  <span className="ml-2 text-gray-900">{selectedInventoryItem.description}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 소모 수량 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            소모 수량 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            min="1"
            max={selectedInventoryItem?.quantity || undefined}
            className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
            placeholder="소모된 수량을 입력하세요"
            required
          />
          {selectedInventoryItem && (
            <div className="text-sm text-text-secondary mt-1">
              최대 소모 가능 수량: {selectedInventoryItem.quantity}
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

        {/* 제출 버튼 */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "등록 중..." : "등록"}
          </button>
          <Link
            href="/closing"
            className="px-6 py-2 bg-accent-soft text-text-secondary rounded-lg hover:bg-accent-light transition-colors"
          >
            취소
          </Link>
        </div>
      </form>
    </ManualPageLayout>
  );
}
