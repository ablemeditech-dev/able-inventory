'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

interface Product {
  id: string;
  cfn: string;
  product_name: string;
  current_stock: number;
  minimum_stock: number;
  ubd: string;
}

interface UBDProduct {
  cfn: string;
  ubd_date: string;
  days_until_expiry: number;
  quantity: number;
  location_name: string;
}

export default function HomePage() {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [shortUbdProducts, setShortUbdProducts] = useState<UBDProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 부족재고 데이터 가져오기 (임시 데이터)
      const lowStock = [
        { id: '1', cfn: 'CFN001', product_name: '의료용 마스크', current_stock: 5, minimum_stock: 50, ubd: '2024-12-31' },
        { id: '2', cfn: 'CFN002', product_name: '수술용 장갑', current_stock: 10, minimum_stock: 100, ubd: '2024-11-30' },
        { id: '3', cfn: 'CFN003', product_name: '소독용 알코올', current_stock: 2, minimum_stock: 20, ubd: '2024-10-15' },
      ];

      // Short UBD 데이터 가져오기 (/short-ubd 페이지와 동일한 로직)
      try {
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

        if (movements && movements.length > 0) {
          // 3. 제품 정보 조회
          const productIds = [
            ...new Set(movements.map((m) => m.product_id).filter(Boolean)),
          ];
          
          if (productIds.length > 0) {
            const { data: products, error: productsError } = await supabase
              .from("products")
              .select("id, cfn, client_id")
              .in("id", productIds);

            if (productsError) throw productsError;

            // 4. 맵으로 변환
            const productMap = new Map(products?.map((p) => [p.id, p]) || []);

            // 5. 모든 위치의 재고 계산
            const allInventory: UBDProduct[] = [];

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
                    ubd_date: item.ubd_date,
                    days_until_expiry: daysDiff,
                    quantity: item.quantity,
                    location_name: "ABLE 중앙창고"
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
                      ubd_date: item.ubd_date,
                      days_until_expiry: daysDiff,
                      quantity: item.quantity,
                      location_name: hospital.hospital_name
                    });
                  }
                });
            }

            // 6. UBD 근접 순으로 정렬 (같은 UBD 내에서 병원 우선, ABLE 중앙창고 후순위)
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
            }).slice(0, 5); // 상위 5개만 선택

            setShortUbdProducts(sortedInventory);
          } else {
            setShortUbdProducts([]);
          }
        } else {
          setShortUbdProducts([]);
        }
      } catch (ubdError) {
        console.error('UBD 데이터 로딩 오류:', ubdError);
        // 에러 시 빈 배열로 설정
        setShortUbdProducts([]);
      }

      setLowStockProducts(lowStock);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getDaysUntilExpiry = (ubdString: string) => {
    const today = new Date();
    const ubd = new Date(ubdString);
    const diffTime = ubd.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">대시보드</h1>
          <p className="text-text-secondary">ABLE MEDITECH 의료기기 관리 시스템</p>
        </div>
        
        {/* 상단 카드 4개 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 통계 카드 */}
          <Link href="/statistics" className="group">
            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-accent-soft h-32 flex flex-col justify-center">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-primary-dark transition-colors">통계</h3>
                <p className="text-sm font-medium text-primary">상세 분석</p>
                <p className="text-xs text-text-secondary mt-1">실시간 데이터 확인</p>
              </div>
            </div>
          </Link>

          {/* 제품소개 카드 */}
          <Link href="/products" className="group">
            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-accent-soft h-32 flex flex-col justify-center">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-primary-dark transition-colors">제품 소개</h3>
                <p className="text-sm font-medium text-primary">GUSTA</p>
                <p className="text-xs text-text-secondary mt-1">혁신적인 의료기기</p>
              </div>
            </div>
          </Link>

          {/* 오더 카드 */}
          <Link href="/order" className="group">
            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-accent-soft h-32 flex flex-col justify-center">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-primary-dark transition-colors">오더</h3>
                <p className="text-sm font-medium text-primary">재고 관리</p>
                <p className="text-xs text-text-secondary mt-1">전략적 주문 관리</p>
              </div>
            </div>
          </Link>

          {/* 메모 카드 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-accent-soft h-32 flex flex-col justify-center">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-primary mb-2">이번 달 출고</h3>
              <p className="text-2xl font-bold text-primary mb-1">743</p>
              <p className="text-xs text-status-success-text">+5% 전월 대비</p>
            </div>
          </div>
        </div>

        {/* 하단 리스트 카드 2개 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 최근 활동 카드 */}
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft">
            <div className="p-6 border-b border-accent-light">
              <h3 className="text-lg font-semibold text-primary">최근 활동</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-primary">새 제품 등록</p>
                  <p className="text-xs text-text-secondary">2시간 전</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-primary">재고 업데이트</p>
                  <p className="text-xs text-text-secondary">4시간 전</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-primary">출고 처리 완료</p>
                  <p className="text-xs text-text-secondary">6시간 전</p>
                </div>
              </div>
            </div>
          </div>

          {/* Short UBD 카드 */}
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft">
            <div className="p-6 border-b border-accent-light">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">Short UBD</h3>
                <Link href="/short-ubd" className="text-sm text-primary hover:text-primary-dark">
                  전체보기 →
                </Link>
              </div>
            </div>
            <div className="p-6">
              {shortUbdProducts.length > 0 ? (
                <div className="space-y-4">
                  {shortUbdProducts.map((product, index) => {
                    const isExpired = product.days_until_expiry < 0;
                    const isExpiringSoon = product.days_until_expiry <= 30 && product.days_until_expiry >= 0;
                    
                    return (
                      <div key={index} className="border-b border-accent-light pb-4 last:border-b-0 last:pb-0">
                        {/* 첫 번째 줄: CFN, UBD, 남은 일수 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium text-primary">{product.cfn}</span>
                            <span className="text-sm text-text-secondary">{formatDate(product.ubd_date)}</span>
                          </div>
                          <span className={`text-sm font-medium ${
                            isExpired 
                              ? 'text-status-error-text' 
                              : isExpiringSoon 
                              ? 'text-status-warning-text' 
                              : 'text-status-success-text'
                          }`}>
                            {isExpired ? '만료됨' : `${product.days_until_expiry}일 남음`}
                          </span>
                        </div>
                        
                        {/* 두 번째 줄: 병원명, 수량 */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-text-secondary">{product.location_name}</span>
                          <span className="text-sm font-medium text-text-primary">{product.quantity}개</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-text-secondary">
                  <p>유통기한 임박 제품이 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
