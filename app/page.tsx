"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import React from "react";

interface ShortUBDItem {
  cfn: string;
  ubd_date: string;
  location_name: string;
  quantity: number;
  days_until_expiry: number;
  lot_number: string;
}

export default function HomePage() {
  const [shortUBDItems, setShortUBDItems] = useState<ShortUBDItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShortUBDItems();
  }, []);

  const fetchShortUBDItems = async () => {
    try {
      setLoading(true);

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
        setShortUBDItems([]);
        return;
      }

      // 3. 제품 정보 조회
      const productIds = [
        ...new Set(movements.map((m) => m.product_id).filter(Boolean)),
      ];
      if (productIds.length === 0) {
        setShortUBDItems([]);
        return;
      }

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, cfn, client_id")
        .in("id", productIds);

      if (productsError) throw productsError;

      // 4. 맵으로 변환
      const productMap = new Map(products?.map((p) => [p.id, p]) || []);

      // 5. 모든 위치의 재고 계산
      const allInventory: ShortUBDItem[] = [];

      // ABLE 중앙창고 ID
      const ableLocationId = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";

      // 5-1. ABLE 중앙창고 재고 계산
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
              days_until_expiry: daysDiff,
            });
          }
        });

      // 5-2. 각 병원별 재고 계산
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
                days_until_expiry: daysDiff,
              });
            }
          });
      }

      // 6. UBD 근접 순으로 정렬하고 상위 5개만 선택
      const sortedInventory = allInventory
        .sort((a, b) => {
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
        })
        .slice(0, 5); // 상위 5개만

      setShortUBDItems(sortedInventory);
    } catch (error) {
      console.error("Short UBD 데이터 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatUBD = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR");
  };

  const getUBDStatusColor = (days: number) => {
    if (days < 180) return "text-red-600"; // 6개월 미만 빨간색
    if (days < 365) return "text-orange-500"; // 1년 미만 주황색
    return "text-green-600"; // 1년 이상 초록색
  };

  const getUBDStatusBg = (days: number) => {
    if (days < 180) return "bg-red-50 border-red-200"; // 6개월 미만
    if (days < 365) return "bg-orange-50 border-orange-200"; // 1년 미만
    return "bg-green-50 border-green-200"; // 1년 이상
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-2">대시보드</h1>
        <p className="text-text-secondary mb-6">
          ABLE MEDITECH 의료기기 관리 시스템
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/statistics" className="block">
            <div className="bg-white rounded-xl shadow-lg border border-accent-soft p-8 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group relative">
              <h3 className="font-bold text-text-secondary mb-3 text-lg">
                통계
              </h3>
              <p className="text-2xl font-bold text-primary mb-1">상세 분석</p>
              <p className="text-accent-soft">실시간 데이터 확인</p>
            </div>
          </Link>

          <Link href="/products" className="block">
            <div className="bg-white rounded-xl shadow-lg border border-accent-soft p-8 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group relative">
              <h3 className="font-bold text-text-secondary mb-3 text-lg">
                제품 소개
              </h3>
              <p className="text-2xl font-bold text-primary mb-1">GUSTA</p>
              <p className="text-accent-soft">혁신적인 의료기기</p>
            </div>
          </Link>

          <Link href="/order" className="block">
            <div className="bg-white rounded-xl shadow-lg border border-accent-soft p-8 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group relative">
              <h3 className="font-bold text-text-secondary mb-3 text-lg">
                오더
              </h3>
              <p className="text-2xl font-bold text-primary mb-1">재고 관리</p>
              <p className="text-accent-soft">전략적 주문 관리</p>
            </div>
          </Link>

          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-6">
            <h3 className="font-semibold text-text-secondary mb-2">
              이번 달 출고
            </h3>
            <p className="text-3xl font-bold text-primary">743</p>
            <p className="text-sm text-accent-soft mt-1">+5% 전월 대비</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-6">
            <h3 className="font-semibold text-primary mb-4">최근 활동</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-accent-light">
                <span className="text-text-secondary">새 제품 등록</span>
                <span className="text-sm text-accent-soft">2시간 전</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-accent-light">
                <span className="text-text-secondary">재고 업데이트</span>
                <span className="text-sm text-accent-soft">4시간 전</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-text-secondary">출고 처리 완료</span>
                <span className="text-sm text-accent-soft">6시간 전</span>
              </div>
            </div>
          </div>

          <Link href="/short-ubd" className="block">
            <div className="bg-white rounded-xl shadow-lg border border-accent-soft p-8 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
              <h3 className="font-bold text-text-secondary mb-4 text-lg">
                Short UBD
              </h3>

              {loading ? (
                <div className="text-center py-4">
                  <div className="text-text-secondary">로딩 중...</div>
                </div>
              ) : shortUBDItems.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-text-secondary">데이터가 없습니다</div>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      {shortUBDItems.map((item, index) => (
                        <React.Fragment key={index}>
                          <tr>
                            <td className="py-1 pr-4">
                              <div className="font-semibold text-primary text-sm">
                                {item.cfn}
                              </div>
                            </td>
                            <td className="py-1 pr-4">
                              <div className="text-sm text-text-secondary">
                                {formatUBD(item.ubd_date)}
                              </div>
                            </td>
                            <td className="py-1 text-right">
                              <div
                                className={`text-sm font-semibold ${getUBDStatusColor(
                                  item.days_until_expiry
                                )}`}
                              >
                                {item.days_until_expiry}일 남음
                              </div>
                            </td>
                          </tr>
                          <tr
                            className={`${
                              index < shortUBDItems.length - 1
                                ? "border-b-2 border-accent-light/30"
                                : ""
                            }`}
                          >
                            <td className="pb-3 pr-4">
                              <div className="text-xs text-text-secondary">
                                {item.location_name}
                              </div>
                            </td>
                            <td className="pb-3 pr-4">{/* 빈 셀 */}</td>
                            <td className="pb-3 text-right">
                              <div className="text-xs text-text-secondary">
                                {item.quantity.toLocaleString()}개
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
