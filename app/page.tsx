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

interface MonthlyUsage {
  hospital_name: string;
  total_quantity: number;
  product_count: number;
  top_cfn: string;
  top_cfn_quantity: number;
  stock_risk_level: 'safe' | 'warning' | 'danger';
  stock_risk_products: number;
  shortage_cfns?: string[]; // 부족한 CFN 목록 (재고부족 + 부족예정)
  stock_out_cfns?: string[]; // 재고부족 CFN 목록 (수량 0)
  low_stock_cfns?: string[]; // 부족예정 CFN 목록 (3개월치 미만)
  growth_rate: number; // 전월 대비 성장률
}

export default function HomePage() {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [shortUbdProducts, setShortUbdProducts] = useState<UBDProduct[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsage[]>([]);
  const [totalUsage, setTotalUsage] = useState({ quantity: 0, products: 0 });
  const [lastMonthName, setLastMonthName] = useState('');
  const [lastMonthUsageMap, setLastMonthUsageMap] = useState<Map<string, number>>(new Map());
  const [totalLastMonthUsage, setTotalLastMonthUsage] = useState(0);
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

      // 이번달 사용 현황 데이터 가져오기 (개선된 인사이트 포함)
      try {
        const today = new Date();
        const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endOfThisMonth.setHours(23, 59, 59, 999);

        // 월 정보 미리 계산 (JSX에서 사용하기 위해)
        const currentMonth = today.getMonth() + 1;
        const lastMonth = today.getMonth() === 0 ? 12 : today.getMonth(); // 1월인 경우 전월은 12월
        const lastMonthName = `${lastMonth}월`;



        // 전월 범위도 계산 (성장률 비교용)
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        endOfLastMonth.setHours(23, 59, 59, 999);

        // 최근 6개월 데이터 조회 (재고 부족 체크를 위해 더 긴 기간)
        const monthsAgo = 6;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsAgo);

        const { data: recentMovements, error: movementsError } = await supabase
          .from("stock_movements")
          .select(`
            product_id,
            from_location_id,
            quantity,
            movement_type,
            movement_reason,
            inbound_date,
            created_at
          `)
          .eq("movement_type", "out")
          .in("movement_reason", ["used", "manual_used", "usage"])
          .gte("created_at", startDate.toISOString());

        if (movementsError) throw movementsError;



        if (recentMovements && recentMovements.length > 0) {
          // 병원과 제품 정보 조회
          const locationIds = [...new Set(recentMovements.map(m => m.from_location_id).filter(Boolean))];
          const productIds = [...new Set(recentMovements.map(m => m.product_id).filter(Boolean))];
          
          const [hospitalsResult, locationsResult, productsResult, stockMovementsResult] = await Promise.all([
            supabase
              .from("hospitals")
              .select("id, hospital_name")
              .in("id", locationIds),
            supabase
              .from("locations")
              .select("id, location_name")
              .in("id", locationIds),
            supabase
              .from("products")
              .select("id, cfn, client_id")
              .in("id", productIds),
            // ABLE 중앙창고 재고 계산용 (order 페이지와 동일)
            supabase
              .from("stock_movements")
              .select(`
                product_id,
                quantity,
                movement_type,
                from_location_id,
                to_location_id
              `)
              .or(`from_location_id.eq.c24e8564-4987-4cfd-bd0b-e9f05a4ab541,to_location_id.eq.c24e8564-4987-4cfd-bd0b-e9f05a4ab541`)
          ]);

          // 병원명과 위치명을 통합한 맵 생성
          const locationNameMap = new Map<string, string>();
          
          // 먼저 hospitals 테이블에서 매핑
          hospitalsResult.data?.forEach(h => {
            locationNameMap.set(h.id, h.hospital_name);
          });
          
          // locations 테이블에서 추가 매핑 (hospitals에서 못 찾은 것들)
          locationsResult.data?.forEach(l => {
            if (!locationNameMap.has(l.id)) {
              locationNameMap.set(l.id, l.location_name);
            }
          });

          const productMap = new Map(productsResult.data?.map(p => [p.id, { cfn: p.cfn, client_id: p.client_id }]) || []);

          // order 페이지와 동일한 방식으로 CFN별 ABLE 중앙창고 재고 계산
          const ableLocationId = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";
          const cfnStockMap = new Map<string, number>();
          
          // 모든 CFN 초기화 (0으로 설정)
          productsResult.data?.forEach(product => {
            if (product.cfn) {
              cfnStockMap.set(product.cfn, 0);
            }
          });

          // 재고 계산
          stockMovementsResult.data?.forEach(movement => {
            const product = productMap.get(movement.product_id);
            if (!product?.cfn) return;

            const cfn = product.cfn;
            const currentStock = cfnStockMap.get(cfn) || 0;

            // ABLE로 들어오는 경우 (+), ABLE에서 나가는 경우 (-)
            if (movement.to_location_id === ableLocationId) {
              cfnStockMap.set(cfn, currentStock + (movement.quantity || 0));
            } else if (movement.from_location_id === ableLocationId) {
              cfnStockMap.set(cfn, currentStock - (movement.quantity || 0));
            }
          });

          // statistics와 동일한 방식으로 병원별 월별 사용량 및 제품별 사용량 계산
          const hospitalMonthlyUsage = new Map<string, Map<string, number>>();
          const hospitalProductUsage = new Map<string, Map<string, Map<string, number>>>(); // 병원 -> 월 -> CFN -> 수량
          let totalQuantity = 0;
          const allProducts = new Set<string>();

          recentMovements.forEach(movement => {
            const product = productMap.get(movement.product_id);
            if (!product?.cfn) return;

            const hospitalId = movement.from_location_id;
            const hospitalName = locationNameMap.get(hospitalId) || "알 수 없음";
            const quantity = movement.quantity || 0;

            // 월별 키 생성 (statistics와 동일)
            const date = new Date(movement.inbound_date || movement.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

            // 병원별 월별 총 사용량
            if (!hospitalMonthlyUsage.has(hospitalName)) {
              hospitalMonthlyUsage.set(hospitalName, new Map());
            }
            const hospitalData = hospitalMonthlyUsage.get(hospitalName)!;
            hospitalData.set(monthKey, (hospitalData.get(monthKey) || 0) + quantity);

            // 병원별 월별 제품별 사용량
            if (!hospitalProductUsage.has(hospitalName)) {
              hospitalProductUsage.set(hospitalName, new Map());
            }
            const hospitalProducts = hospitalProductUsage.get(hospitalName)!;
            if (!hospitalProducts.has(monthKey)) {
              hospitalProducts.set(monthKey, new Map());
            }
            const monthProducts = hospitalProducts.get(monthKey)!;
            monthProducts.set(product.cfn, (monthProducts.get(product.cfn) || 0) + quantity);

            allProducts.add(product.cfn);
          });

          // 이번달과 전월 키 생성
          const thisMonthKey = `${today.getFullYear()}-${String(currentMonth).padStart(2, "0")}`;
          const lastMonthKey = `${today.getFullYear()}-${String(lastMonth).padStart(2, "0")}`;

          // 병원별 상세 사용량 집계
          const hospitalUsage = new Map<string, { 
            quantity: number; 
            products: Map<string, number>; // CFN -> 수량
          }>();

          // 각 병원의 이번달 사용량 계산
          hospitalMonthlyUsage.forEach((monthlyData, hospitalName) => {
            if (hospitalName === "알 수 없음") return; // 알 수 없음 제외

            const thisMonthQuantity = monthlyData.get(thisMonthKey) || 0;
            if (thisMonthQuantity > 0) {
              totalQuantity += thisMonthQuantity;
              
              // 해당 병원의 이번달 제품별 사용량 가져오기
              const thisMonthProducts = hospitalProductUsage.get(hospitalName)?.get(thisMonthKey) || new Map();
              
              hospitalUsage.set(hospitalName, { 
                quantity: thisMonthQuantity, 
                products: thisMonthProducts
              });
            }
          });

          // 전월 사용량 맵 생성 (JSX에서 사용)
          const lastMonthHospitalUsage = new Map<string, number>();
          let totalLastMonthQuantity = 0;
          hospitalMonthlyUsage.forEach((monthlyData, hospitalName) => {
            const lastMonthQuantity = monthlyData.get(lastMonthKey) || 0;
            lastMonthHospitalUsage.set(hospitalName, lastMonthQuantity);
            if (hospitalName !== "알 수 없음") {
              totalLastMonthQuantity += lastMonthQuantity;
            }
          });

          // 상위 5개 병원으로 제한하고 인사이트 계산 ("알 수 없음" 제외)
          const sortedUsage = Array.from(hospitalUsage.entries())
            .filter(([hospital_name]) => hospital_name !== "알 수 없음")
            .map(([hospital_name, data]) => {
              // 가장 많이 사용한 CFN 찾기
              let topCfn = '';
              let topCfnQuantity = 0;
              data.products.forEach((quantity, cfn) => {
                if (quantity > topCfnQuantity) {
                  topCfn = cfn;
                  topCfnQuantity = quantity;
                }
              });

              // 재고 부족/부족예정 CFN 찾기 (해당 병원에서 6개월간 사용한 모든 제품 확인)
              const shortageProducts: string[] = [];
              const stockOutProducts: string[] = [];
              const lowStockProducts: string[] = [];
              
              // 해당 병원의 6개월간 사용한 모든 CFN 수집
              const hospitalAllProducts = new Set<string>();
              const hospitalProducts = hospitalProductUsage.get(hospital_name);
              if (hospitalProducts) {
                hospitalProducts.forEach((monthData) => {
                  monthData.forEach((quantity, cfn) => {
                    if (quantity > 0) {
                      hospitalAllProducts.add(cfn);
                    }
                  });
                });
              }
              
              // 해당 병원이 사용하는 모든 CFN에 대해 재고 확인 (order 페이지와 동일한 로직)
              hospitalAllProducts.forEach(cfn => {
                const currentStock = cfnStockMap.get(cfn) || 0;
                
                // 해당 병원의 해당 CFN 6개월 사용량 계산
                let cfnSixMonthsUsage = 0;
                if (hospitalProducts) {
                  hospitalProducts.forEach((monthData) => {
                    cfnSixMonthsUsage += monthData.get(cfn) || 0;
                  });
                }
                
                // order 페이지와 동일한 부족 예정 판단 로직
                const monthlyAverageUsage = cfnSixMonthsUsage / 6;
                const isStockOut = currentStock === 0;
                const threeMonthsStock = monthlyAverageUsage * 3;
                const isLowStock = currentStock > 0 && 
                                   currentStock <= threeMonthsStock && 
                                   cfnSixMonthsUsage > 0 &&
                                   monthlyAverageUsage >= 0.1; // 월평균이 너무 작으면 제외
                

                
                if (isStockOut) {
                  stockOutProducts.push(cfn);
                  shortageProducts.push(cfn);
                } else if (isLowStock) {
                  lowStockProducts.push(cfn);
                  shortageProducts.push(cfn);
                }
              });

              // 재고 위험도 계산
              let riskLevel: 'safe' | 'warning' | 'danger' = 'safe';
              if (shortageProducts.length > 0) {
                if (shortageProducts.length >= 3) {
                  riskLevel = 'danger';
                } else if (shortageProducts.length >= 1) {
                  riskLevel = 'warning';
                }
              }

              // 전월 대비 성장률 계산
              const lastMonthQuantity = lastMonthHospitalUsage.get(hospital_name) || 0;
              const growthRate = lastMonthQuantity > 0 
                ? ((data.quantity - lastMonthQuantity) / lastMonthQuantity) * 100 
                : data.quantity > 0 ? 100 : 0;



              return {
                hospital_name,
                total_quantity: data.quantity,
                product_count: data.products.size,
                top_cfn: topCfn,
                top_cfn_quantity: topCfnQuantity,
                stock_risk_level: riskLevel,
                stock_risk_products: shortageProducts.length,
                shortage_cfns: shortageProducts, // 부족한 CFN 목록 (재고부족 + 부족예정)
                stock_out_cfns: stockOutProducts, // 재고부족 CFN 목록
                low_stock_cfns: lowStockProducts, // 부족예정 CFN 목록
                growth_rate: Math.round(growthRate)
              };
            })
            .sort((a, b) => b.total_quantity - a.total_quantity)
            .slice(0, 5);



          setMonthlyUsage(sortedUsage);
          setTotalUsage({ quantity: totalQuantity, products: allProducts.size });
          setLastMonthName(lastMonthName);
          setLastMonthUsageMap(lastMonthHospitalUsage);
          setTotalLastMonthUsage(totalLastMonthQuantity);
        } else {
          setMonthlyUsage([]);
          setTotalUsage({ quantity: 0, products: 0 });
          setLastMonthName(lastMonthName);
          setLastMonthUsageMap(new Map());
          setTotalLastMonthUsage(0);
        }
      } catch (usageError) {
        console.error('사용 현황 데이터 로딩 오류:', usageError);
        setMonthlyUsage([]);
        setTotalUsage({ quantity: 0, products: 0 });
        setLastMonthName('');
        setLastMonthUsageMap(new Map());
        setTotalLastMonthUsage(0);
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

          {/* 메모 카드 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-accent-soft h-32 flex flex-col justify-center">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-primary mb-2">준비 중</h3>
              <p className="text-2xl font-bold text-text-secondary mb-1">-</p>
              <p className="text-xs text-text-secondary">기능 개발 중</p>
            </div>
          </div>
        </div>

        {/* 하단 리스트 카드 2개 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 이번달 사용 현황 카드 - 개선된 인사이트 */}
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft">
            <div className="p-6 border-b border-accent-light">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">이번달 사용 현황</h3>
                <div className="text-right">
                  <p className="text-sm font-medium text-primary">{totalUsage.quantity.toLocaleString()}개</p>
                  <p className="text-xs text-text-secondary">{lastMonthName} {totalLastMonthUsage.toLocaleString()}개</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {monthlyUsage.length > 0 ? (
                <div className="space-y-5">
                  {monthlyUsage.map((usage, index) => (
                    <div key={index} className="border border-accent-light rounded-lg p-4 hover:shadow-sm transition-shadow">
                      {/* 병원명과 순위 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900' :
                            index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800' :  
                            index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-orange-900' :
                            index === 3 ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-blue-900' :
                            'bg-gradient-to-r from-purple-400 to-purple-500 text-purple-900'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-primary">{usage.hospital_name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-text-secondary">
                                {lastMonthName}: {lastMonthUsageMap.get(usage.hospital_name) || 0}개
                              </span>
                              {usage.growth_rate !== 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  usage.growth_rate > 0 
                                    ? 'bg-status-success-bg text-status-success-text' 
                                    : 'bg-status-error-bg text-status-error-text'
                                }`}>
                                  {usage.growth_rate > 0 ? '+' : ''}{usage.growth_rate}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">{usage.total_quantity.toLocaleString()}개</p>
                          <p className="text-xs text-text-secondary">
                            {totalUsage.quantity > 0 ? Math.round((usage.total_quantity / totalUsage.quantity) * 100) : 0}%
                          </p>
                        </div>
                      </div>

                      {/* 인사이트 정보 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-accent-light">
                        {/* 인기 제품 */}
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-secondary truncate">인기 제품</p>
                            <p className="text-xs font-medium text-text-primary truncate" title={usage.top_cfn}>
                              {usage.top_cfn || '-'} {usage.top_cfn_quantity > 0 ? `(${usage.top_cfn_quantity}개)` : ''}
                            </p>
                          </div>
                        </div>

                        {/* 재고 위험도 */}
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            usage.stock_out_cfns && usage.stock_out_cfns.length > 0 
                              ? 'bg-red-500' // 재고부족 - 빨간색
                              : usage.low_stock_cfns && usage.low_stock_cfns.length > 0
                              ? 'bg-orange-500' // 부족예정 - 주황색
                              : 'bg-green-500' // 안전 - 초록색
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-secondary">재고 상태</p>
                            <p className={`text-xs font-medium truncate ${
                              usage.stock_out_cfns && usage.stock_out_cfns.length > 0 
                                ? 'text-red-600' // 재고부족 - 빨간색
                                : usage.low_stock_cfns && usage.low_stock_cfns.length > 0
                                ? 'text-orange-600' // 부족예정 - 주황색
                                : 'text-green-600' // 안전 - 초록색
                            }`}>
                              {usage.stock_out_cfns && usage.stock_out_cfns.length > 0 
                                ? '재고 부족'
                                : usage.low_stock_cfns && usage.low_stock_cfns.length > 0
                                ? '부족 예정'
                                : '안전'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-secondary">
                  <div className="w-16 h-16 mx-auto mb-4 bg-accent-soft rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="font-medium">이번달 사용 기록이 없습니다</p>
                  <p className="text-sm mt-1">출고 기록이 있으면 여기에 표시됩니다</p>
                </div>
              )}
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
