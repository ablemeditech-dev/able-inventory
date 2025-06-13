"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

interface InventoryItem {
  cfn: string;
  lot_number: string;
  ubd_date: string;
  quantity: number;
  client_name: string;
}

interface Hospital {
  id: string;
  hospital_name: string;
}

export default function HospitalInventory() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchHospitals();
  }, []);

  useEffect(() => {
    if (selectedHospital) {
      fetchHospitalInventory(selectedHospital);
    }
  }, [selectedHospital]);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      setError("");

      const { data: hospitalData, error: hospitalError } = await supabase
        .from("hospitals")
        .select("id, hospital_name")
        .order("hospital_name");

      if (hospitalError) {
        throw hospitalError;
      }

      setHospitals(hospitalData || []);

      // 첫 번째 병원을 기본 선택
      if (hospitalData && hospitalData.length > 0) {
        setSelectedHospital(hospitalData[0].id);
      }
    } catch (err) {
      console.error("병원 목록 조회 에러:", err);
      setError("병원 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitalInventory = async (hospitalId: string) => {
    try {
      setInventoryLoading(true);
      setError("");

      // hospitals 테이블에서 locations 테이블의 ID 찾기
      const { data: locationData, error: locationError } = await supabase
        .from("locations")
        .select("id")
        .eq("hospital_id", hospitalId)
        .single();

      if (locationError) {
        throw locationError;
      }

      const locationId = locationData.id;

      // 입고/출고 이력에서 해당 병원의 현재 재고 계산
      const { data: movements, error: movementsError } = await supabase
        .from("stock_movements")
        .select(
          `
          product_id,
          lot_number,
          ubd_date,
          quantity,
          movement_type
        `
        )
        .or(`from_location_id.eq.${locationId},to_location_id.eq.${locationId}`)
        .order("created_at", { ascending: false });

      if (movementsError) {
        throw movementsError;
      }

      // 제품별 CFN과 거래처 정보 가져오기
      const productIds = [
        ...new Set(movements?.map((m) => m.product_id).filter(Boolean)),
      ];

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, cfn, client_id")
        .in("id", productIds);

      if (productsError) {
        throw productsError;
      }

      // 거래처 정보 가져오기
      const clientIds = [
        ...new Set(products?.map((p) => p.client_id).filter(Boolean)),
      ];

      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, company_name")
        .in("id", clientIds);

      if (clientsError) {
        throw clientsError;
      }

      // 맵으로 변환
      const productMap = new Map(products?.map((p) => [p.id, p]) || []);
      const clientMap = new Map(clients?.map((c) => [c.id, c]) || []);

      // 재고 계산
      const inventoryMap = new Map<string, InventoryItem>();

      movements?.forEach(
        (movement: {
          product_id: string;
          lot_number?: string;
          ubd_date?: string;
          quantity: number;
          from_location_id?: string;
          to_location_id?: string;
        }) => {
          const product = productMap.get(movement.product_id);
          if (!product) return;

          const client = clientMap.get(product.client_id);
          const key = `${product.cfn}-${movement.lot_number}-${movement.ubd_date}`;

          if (!inventoryMap.has(key)) {
            inventoryMap.set(key, {
              cfn: product.cfn || "",
              lot_number: movement.lot_number || "",
              ubd_date: movement.ubd_date || "",
              quantity: 0,
              client_name: client?.company_name || "",
            });
          }

          const item = inventoryMap.get(key)!;

          // 병원으로 들어오는 경우 (+), 병원에서 나가는 경우 (-)
          if (movement.to_location_id === hospitalId) {
            item.quantity += movement.quantity || 0;
          } else if (movement.from_location_id === hospitalId) {
            item.quantity -= movement.quantity || 0;
          }
        }
      );

      // 수량이 0보다 큰 항목만 필터링하고 정렬
      const currentInventory = Array.from(inventoryMap.values())
        .filter((item) => item.quantity > 0)
        .sort((a, b) => {
          if (a.cfn !== b.cfn) return a.cfn.localeCompare(b.cfn);
          if (a.lot_number !== b.lot_number)
            return a.lot_number.localeCompare(b.lot_number);
          return a.ubd_date.localeCompare(b.ubd_date);
        });

      setInventory(currentInventory);
    } catch (_err) {
      setError("재고 정보를 불러오는데 실패했습니다.");
    } finally {
      setInventoryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">병원 정보를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  if (hospitals.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-700">등록된 병원이 없습니다.</div>
        </div>
      </div>
    );
  }

  const selectedHospitalName =
    hospitals.find((h) => h.id === selectedHospital)?.hospital_name || "";

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              병원 재고 현황
            </h2>
            <select
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.hospital_name}
                </option>
              ))}
            </select>
          </div>
          {selectedHospitalName && (
            <p className="text-sm text-gray-600 mt-2">
              {selectedHospitalName} - 총{" "}
              {inventory
                .reduce((sum, item) => sum + item.quantity, 0)
                .toLocaleString()}
              ea
            </p>
          )}
        </div>

        {inventoryLoading ? (
          <div className="p-8 text-center text-gray-500">
            재고 정보를 불러오는 중...
          </div>
        ) : inventory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            현재 재고가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    거래처
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CFN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    LOT
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UBD
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수량
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.client_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.cfn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.lot_number}
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.ubd_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.quantity.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
