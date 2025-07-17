"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface UBDInventoryItem {
  cfn: string;
  lot_number: string;
  ubd_date: string;
  quantity: number;
  location_name: string;
  location_id: string;
  days_until_expiry: number;
}

export default function ShortUBDPage() {
  const [inventory, setInventory] = useState<UBDInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchAllInventoryByUBD();
  }, []);

  const fetchAllInventoryByUBD = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. 모든 병원 정보 조회
      const { data: hospitals, error: hospitalsError } = await supabase
        .from("hospitals")
        .select("id, hospital_name")
        .order("hospital_name");

      if (hospitalsError) throw hospitalsError;

      // 2. 모든 stock_movements 조회
      const { data: movements, error: movementsError } = await supabase
        .from("stock_movements")
        .select(
          `
          product_id,
          lot_number,
          ubd_date,
          quantity,
          movement_type,
          movement_reason,
          from_location_id,
          to_location_id
        `
        )
        .order("created_at", { ascending: false });

      if (movementsError) throw movementsError;

      if (!movements || movements.length === 0) {
        setInventory([]);
        return;
      }

      // 3. 제품 정보 조회
      const productIds = [
        ...new Set(movements.map((m) => m.product_id).filter(Boolean)),
      ];
      if (productIds.length === 0) {
        setInventory([]);
        return;
      }

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, cfn, client_id")
        .in("id", productIds);

      if (productsError) throw productsError;

      // 4. 맵으로 변환
      const productMap = new Map(products?.map((p) => [p.id, p]) || []);

      // 6. 모든 위치의 재고 계산
      const allInventory: UBDInventoryItem[] = [];

      // ABLE 중앙창고 ID
      const ableLocationId = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";

      // 6-1. ABLE 중앙창고 재고 계산
      const ableInventoryMap = new Map<
        string,
        {
          cfn: string;
          lot_number: string;
          ubd_date: string;
          quantity: number;
        }
      >();

      movements.forEach((movement) => {
        const product = productMap.get(movement.product_id);
        if (!product || !movement.lot_number || !movement.ubd_date) return;

        const key = `${product.cfn}-${movement.lot_number}-${movement.ubd_date}`;

        if (!ableInventoryMap.has(key)) {
          ableInventoryMap.set(key, {
            cfn: product.cfn || "",
            lot_number: movement.lot_number || "",
            ubd_date: movement.ubd_date || "",
            quantity: 0,
          });
        }

        const item = ableInventoryMap.get(key)!;

        // ABLE로 들어오는 경우 (+), ABLE에서 나가는 경우 (-)
        if (movement.to_location_id === ableLocationId) {
          item.quantity += movement.quantity || 0;
        } else if (movement.from_location_id === ableLocationId) {
          item.quantity -= movement.quantity || 0;
        }
      });

      // ABLE 중앙창고 재고를 결과에 추가
      Array.from(ableInventoryMap.values())
        .filter((item) => item.quantity > 0 && item.ubd_date)
        .forEach((item) => {
          const ubdDate = new Date(item.ubd_date);
          const today = new Date();
          const timeDiff = ubdDate.getTime() - today.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

          if (daysDiff > 0) {
            allInventory.push({
              cfn: item.cfn,
              lot_number: item.lot_number,
              ubd_date: item.ubd_date,
              quantity: item.quantity,
              location_name: "ABLE 중앙창고",
              location_id: ableLocationId,
              days_until_expiry: daysDiff,
            });
          }
        });

      // 6-2. 각 병원별 재고 계산
      for (const hospital of hospitals || []) {
        const hospitalInventoryMap = new Map<
          string,
          {
            cfn: string;
            lot_number: string;
            ubd_date: string;
            quantity: number;
          }
        >();

        movements.forEach((movement) => {
          const product = productMap.get(movement.product_id);
          if (!product || !movement.lot_number || !movement.ubd_date) return;

          const key = `${product.cfn}-${movement.lot_number}-${movement.ubd_date}`;

          if (!hospitalInventoryMap.has(key)) {
            hospitalInventoryMap.set(key, {
              cfn: product.cfn || "",
              lot_number: movement.lot_number || "",
              ubd_date: movement.ubd_date || "",
              quantity: 0,
            });
          }

          const item = hospitalInventoryMap.get(key)!;

          // 병원으로 들어오는 경우 (+), 병원에서 나가는 경우 (-)
          if (movement.to_location_id === hospital.id) {
            item.quantity += movement.quantity || 0;
          } else if (movement.from_location_id === hospital.id) {
            item.quantity -= movement.quantity || 0;
          }
        });

        // 병원 재고를 결과에 추가
        Array.from(hospitalInventoryMap.values())
          .filter((item) => item.quantity > 0 && item.ubd_date)
          .forEach((item) => {
            const ubdDate = new Date(item.ubd_date);
            const today = new Date();
            const timeDiff = ubdDate.getTime() - today.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

            if (daysDiff > 0) {
              allInventory.push({
                cfn: item.cfn,
                lot_number: item.lot_number,
                ubd_date: item.ubd_date,
                quantity: item.quantity,
                location_name: hospital.hospital_name,
                location_id: hospital.id,
                days_until_expiry: daysDiff,
              });
            }
          });
      }

      // 7. UBD 근접 순으로 정렬 (같은 UBD 내에서 병원 우선, ABLE 중앙창고 후순위)
      const sortedInventory = allInventory.sort((a, b) => {
        // 먼저 UBD 날짜로 정렬 (가까운 순)
        if (a.days_until_expiry !== b.days_until_expiry) {
          return a.days_until_expiry - b.days_until_expiry;
        }

        // 같은 UBD 날짜 내에서는 병원 우선, ABLE 중앙창고 후순위
        if (
          a.location_name === "ABLE 중앙창고" &&
          b.location_name !== "ABLE 중앙창고"
        ) {
          return 1;
        }
        if (
          b.location_name === "ABLE 중앙창고" &&
          a.location_name !== "ABLE 중앙창고"
        ) {
          return -1;
        }

        // 같은 위치 타입이면 위치명으로 정렬
        return a.location_name.localeCompare(b.location_name);
      }).slice(0, 20); // 상위 20개만 선택

      setInventory(sortedInventory);
    } catch (error) {
      console.error("재고 조회 실패:", error);
      setError("재고 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const formatUBD = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR");
  };

  const getUBDStatusColor = (days: number) => {
    if (days <= 30) return "text-red-600";
    if (days <= 90) return "text-yellow-600";
    return "text-green-600";
  };

  const getUBDStatusBg = (days: number) => {
    if (days <= 30) return "bg-red-50";
    if (days <= 90) return "bg-yellow-50";
    return "bg-white";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">재고 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-status-error-text mb-4">{error}</div>
          <button 
            onClick={fetchAllInventoryByUBD}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Short UBD 재고 현황
          </h1>
          <p className="text-text-secondary">
            유통기한 근접 순으로 정렬된 전체 재고 현황 (총 {inventory.length}개 항목)
          </p>
        </div>

        {inventory.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-12 text-center">
            <div className="mb-6">
              <svg
                className="w-20 h-20 mx-auto text-accent-soft"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m10-6h4"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-primary mb-3">
              재고가 없습니다
            </h2>
            <p className="text-text-secondary">
              현재 관리 중인 재고가 없습니다.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-accent-soft/30">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-primary">
                      위치
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-primary">
                      CFN
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-primary">
                      LOT
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-primary">
                      UBD
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-primary">
                      만료까지
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-primary">
                      수량
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-accent-light">
                  {inventory.map((item, index) => (
                    <tr
                      key={index}
                      className={`hover:bg-accent-light transition-colors ${getUBDStatusBg(
                        item.days_until_expiry
                      )}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-primary">
                          {item.location_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-primary">
                          {item.cfn}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {item.lot_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {formatUBD(item.ubd_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`text-sm font-semibold ${getUBDStatusColor(
                            item.days_until_expiry
                          )}`}
                        >
                          {item.days_until_expiry}일 남음
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-primary">
                          {item.quantity.toLocaleString()}개
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
