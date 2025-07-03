"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

interface Hospital {
  id: string;
  hospital_name: string;
  hospital_code?: string;
}

interface AvailableStock {
  cfn: string;
  total_quantity: number;
}

interface LotInfo {
  lot_number: string;
  ubd_date: string;
  available_quantity: number;
}

export default function ManualOutboundPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(true);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 데이터 상태
  const [clients, setClients] = useState<Hospital[]>([]);
  const [availableStock, setAvailableStock] = useState<AvailableStock[]>([]);
  const [availableLots, setAvailableLots] = useState<LotInfo[]>([]);

  // 폼 데이터 상태
  const [formData, setFormData] = useState({
    outbound_date: new Date().toISOString().split("T")[0],
    client_id: "",
    cfn: "",
    lot_number: "",
    quantity: "",
    notes: "",
  });

  useEffect(() => {
    loadClients();
    loadAvailableStock();
  }, []);

  // CFN이 변경될 때 해당 CFN의 LOT 목록 로드
  useEffect(() => {
    if (formData.cfn) {
      loadAvailableLots(formData.cfn);
    } else {
      setAvailableLots([]);
    }
    // CFN이 변경되면 LOT 선택 초기화
    setFormData((prev) => ({ ...prev, lot_number: "" }));
  }, [formData.cfn]);

  const loadClients = async () => {
    try {
      setClientsLoading(true);

      const { data, error } = await supabase
        .from("hospitals")
        .select("id, hospital_name, hospital_code")
        .order("hospital_name");

      if (error) {
        throw error;
      }

      setClients(data || []);
    } catch {
      setError("병원 목록을 불러오는데 실패했습니다. 다시 시도해주세요.");
    } finally {
      setClientsLoading(false);
    }
  };

  const loadAvailableStock = async () => {
    try {
      setStockLoading(true);

      // stock_movements에서 입고(in) 기록 조회
      const { data: inboundData, error: inboundError } = await supabase
        .from("stock_movements")
        .select(
          `
          product_id,
          quantity,
          products!inner(cfn)
        `
        )
        .eq("movement_type", "in");

      if (inboundError) {
        throw inboundError;
      }

      // stock_movements에서 출고(out) 기록 조회
      const { data: outboundData, error: outboundError } = await supabase
        .from("stock_movements")
        .select(
          `
          product_id,
          quantity,
          products!inner(cfn)
        `
        )
        .eq("movement_type", "out")
        .eq("movement_reason", "sale");

      if (outboundError) {
        throw outboundError;
      }

      // CFN별 재고 계산
      const stockMap = new Map<string, number>();

      // 입고 수량 더하기
      inboundData?.forEach((record) => {
        const cfn = (record.products as { cfn?: string })?.cfn;
        if (cfn) {
          stockMap.set(cfn, (stockMap.get(cfn) || 0) + record.quantity);
        }
      });

      // 출고 수량 빼기
      outboundData?.forEach((record) => {
        const cfn = (record.products as { cfn?: string })?.cfn;
        if (cfn) {
          stockMap.set(cfn, (stockMap.get(cfn) || 0) - record.quantity);
        }
      });

      // 가용 재고만 필터링 (수량 > 0)
      const availableStockArray: AvailableStock[] = [];
      stockMap.forEach((quantity, cfn) => {
        if (quantity > 0) {
          availableStockArray.push({ cfn, total_quantity: quantity });
        }
      });

      // CFN 순으로 정렬
      availableStockArray.sort((a, b) => a.cfn.localeCompare(b.cfn));
      setAvailableStock(availableStockArray);
    } catch {
      setError("재고 정보를 불러오는데 실패했습니다. 다시 시도해주세요.");
    } finally {
      setStockLoading(false);
    }
  };

  const loadAvailableLots = async (cfn: string) => {
    try {
      setLotsLoading(true);

      // 선택된 CFN의 product_id 조회
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id")
        .eq("cfn", cfn)
        .single();

      if (productError) throw productError;

      // 해당 제품의 입고 기록 조회
      const { data: inboundLots, error: inboundError } = await supabase
        .from("stock_movements")
        .select("lot_number, ubd_date, quantity")
        .eq("movement_type", "in")
        .eq("product_id", productData.id);

      if (inboundError) throw inboundError;

      // 해당 제품의 출고 기록 조회
      const { data: outboundLots, error: outboundError } = await supabase
        .from("stock_movements")
        .select("lot_number, quantity")
        .eq("movement_type", "out")
        .eq("movement_reason", "sale")
        .eq("product_id", productData.id);

      if (outboundError) throw outboundError;

      // LOT별 재고 계산
      const lotMap = new Map<string, { ubd_date: string; quantity: number }>();

      // 입고 수량 더하기
      inboundLots?.forEach((record) => {
        const key = record.lot_number;
        if (key) {
          const existing = lotMap.get(key);
          lotMap.set(key, {
            ubd_date: record.ubd_date || "",
            quantity: (existing?.quantity || 0) + record.quantity,
          });
        }
      });

      // 출고 수량 빼기
      outboundLots?.forEach((record) => {
        const key = record.lot_number;
        if (key) {
          const existing = lotMap.get(key);
          if (existing) {
            lotMap.set(key, {
              ...existing,
              quantity: existing.quantity - record.quantity,
            });
          }
        }
      });

      // 가용 재고만 필터링 (수량 > 0)
      const availableLotsArray: LotInfo[] = [];
      lotMap.forEach((info, lotNumber) => {
        if (info.quantity > 0) {
          availableLotsArray.push({
            lot_number: lotNumber,
            ubd_date: info.ubd_date,
            available_quantity: info.quantity,
          });
        }
      });

      // UBD 날짜 순으로 정렬 (빠른 날짜부터)
      availableLotsArray.sort((a, b) => {
        if (!a.ubd_date) return 1;
        if (!b.ubd_date) return -1;
        return new Date(a.ubd_date).getTime() - new Date(b.ubd_date).getTime();
      });

      setAvailableLots(availableLotsArray);
    } catch {
      setError("LOT 정보를 불러오는데 실패했습니다.");
    } finally {
      setLotsLoading(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 필수 필드 검증
    if (!formData.client_id) {
      setError("출고병원을 선택해주세요.");
      return;
    }
    if (!formData.cfn) {
      setError("CFN을 선택해주세요.");
      return;
    }
    if (!formData.lot_number) {
      setError("LOT를 선택해주세요.");
      return;
    }
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      setError("올바른 수량을 입력해주세요.");
      return;
    }

    // 선택된 LOT의 가용 수량 확인
    const selectedLot = availableLots.find(
      (lot) => lot.lot_number === formData.lot_number
    );
    if (!selectedLot) {
      setError("선택된 LOT 정보를 찾을 수 없습니다.");
      return;
    }

    const requestedQuantity = parseInt(formData.quantity);
    if (requestedQuantity > selectedLot.available_quantity) {
      setError(
        `요청 수량(${requestedQuantity})이 가용 재고(${selectedLot.available_quantity})를 초과합니다.`
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      // CFN으로 product_id 조회
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id")
        .eq("cfn", formData.cfn)
        .single();

      if (productError) throw productError;

      // ABLE 중앙창고 ID
      const ABLE_WAREHOUSE_ID = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";

      // stock_movements에 출고 기록 추가
      const { error: insertError } = await supabase
        .from("stock_movements")
        .insert([
          {
            product_id: productData.id,
            movement_type: "out",
            movement_reason: "sale",
            from_location_id: ABLE_WAREHOUSE_ID,
            to_location_id: formData.client_id,
            quantity: requestedQuantity,
            lot_number: formData.lot_number,
            ubd_date: selectedLot.ubd_date,
            inbound_date: formData.outbound_date,
            notes: formData.notes || null,
          },
        ]);

      if (insertError) throw insertError;

      setSuccess("출고가 성공적으로 등록되었습니다.");

      // 성공 후 출고 목록으로 이동
      setTimeout(() => {
        router.push("/outbound");
      }, 1500);
    } catch {
      setError("출고 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">수동 출고 등록</h1>
          <Link
            href="/outbound"
            className="px-4 py-2 bg-accent-soft text-text-secondary rounded-lg hover:bg-accent-light transition-colors"
          >
            ← 돌아가기
          </Link>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 성공 메시지 */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* 폼 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-accent-soft">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 출고일자 */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
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

            {/* 출고병원 */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                출고병원 <span className="text-red-500">*</span>
              </label>
              {clientsLoading ? (
                <div className="text-sm text-text-secondary">
                  병원 목록 로딩 중...
                </div>
              ) : (
                <select
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary bg-white text-gray-900"
                  required
                >
                  <option value="">출고병원을 선택하세요</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.hospital_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* CFN */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                CFN <span className="text-red-500">*</span>
              </label>
              {stockLoading ? (
                <div className="text-sm text-text-secondary">
                  재고 정보 로딩 중...
                </div>
              ) : (
                <select
                  name="cfn"
                  value={formData.cfn}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary bg-white text-gray-900"
                  required
                >
                  <option value="">CFN을 선택하세요</option>
                  {availableStock.map((stock) => (
                    <option key={stock.cfn} value={stock.cfn}>
                      {stock.cfn} (재고: {stock.total_quantity}개)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* LOT */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                LOT <span className="text-red-500">*</span>
              </label>
              {!formData.cfn ? (
                <div className="text-sm text-text-secondary">
                  먼저 CFN을 선택해주세요
                </div>
              ) : lotsLoading ? (
                <div className="text-sm text-text-secondary">
                  LOT 정보 로딩 중...
                </div>
              ) : (
                <select
                  name="lot_number"
                  value={formData.lot_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary bg-white text-gray-900"
                  required
                >
                  <option value="">LOT를 선택하세요</option>
                  {availableLots.map((lot) => (
                    <option key={lot.lot_number} value={lot.lot_number}>
                      {lot.lot_number} (UBD:{" "}
                      {lot.ubd_date
                        ? new Date(lot.ubd_date).toLocaleDateString("ko-KR")
                        : "미정"}
                      , 재고: {lot.available_quantity}개)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 수량 */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                수량 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
                placeholder="출고할 수량을 입력하세요"
                required
              />
              {formData.lot_number && availableLots.length > 0 && (
                <div className="mt-1 text-sm text-text-secondary">
                  최대 출고 가능:{" "}
                  {availableLots.find(
                    (lot) => lot.lot_number === formData.lot_number
                  )?.available_quantity || 0}
                  개
                </div>
              )}
            </div>

            {/* 메모 */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                메모
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
                placeholder="출고 관련 메모를 입력하세요 (선택사항)"
              />
            </div>

            {/* 버튼 */}
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </div>
    </div>
  );
}
