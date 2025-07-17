"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

interface StatisticsData {
  cfnStats: Array<{ cfn: string; totalQuantity: number; color: string }>;
  monthlyTrends: Array<{
    month: string;
    inbound: number;
    outbound: number;
    usage: number;
  }>;
  hospitalStats: Array<{
    hospitalName: string;
    totalUsage: number;
    cfnCount: number;
    monthlyUsage: Array<{ month: string; usage: number }>;
    topCfns: string[];
    topCfnUsage: Array<{ cfn: string; usage: number }>;
  }>;
  topCFNs: Array<{ cfn: string; usageCount: number; hospitalCount: number }>;
  recentActivity: Array<{
    type: string;
    description: string;
    date: string;
    hospital?: string;
  }>;
  summary: {
    totalProducts: number;
    totalStock: number;
    monthlyInbound: number;
    monthlyOutbound: number;
    monthlyUsage: number;
    activeHospitals: number;
  };
}

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatistics = async () => {
    try {
      setLoading(true);

      const monthsAgo = 6;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsAgo);

      // 1. 모든 재고 이동 데이터 조회
      const { data: movements, error: movementsError } = await supabase
        .from("stock_movements")
        .select(
          `
          id, product_id, movement_type, movement_reason, quantity, 
          inbound_date, created_at, from_location_id, to_location_id
        `
        )
        .gte("created_at", startDate.toISOString());

      if (movementsError) throw movementsError;

      // 2. 제품 정보 조회
      const productIds = [
        ...new Set(movements?.map((m) => m.product_id) || []),
      ];
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, cfn, description")
        .in("id", productIds);

      if (productsError) throw productsError;

      // 3. 병원/위치 정보 조회
      const locationIds = [
        ...new Set([
          ...(movements?.map((m) => m.from_location_id).filter(Boolean) || []),
          ...(movements?.map((m) => m.to_location_id).filter(Boolean) || []),
        ]),
      ];
      const { data: locations, error: locationsError } = await supabase
        .from("locations")
        .select("id, location_name")
        .in("id", locationIds);

      if (locationsError) throw locationsError;

      // 데이터 매핑
      const productMap = new Map(products?.map((p) => [p.id, p]) || []);
      const locationMap = new Map(locations?.map((l) => [l.id, l]) || []);

      // 통계 계산
      const stats = calculateStatistics(
        movements || [],
        productMap,
        locationMap
      );
      setStatistics(stats);
    } catch (error) {
      console.error("통계 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  const calculateStatistics = (
    movements: any[],
    productMap: Map<string, any>,
    locationMap: Map<string, any>
  ): StatisticsData => {
    // CFN별 통계
    const cfnMap = new Map<string, number>();
    const hospitalUsageMap = new Map<
      string,
      {
        usage: number;
        cfns: Set<string>;
        monthlyUsage: Map<string, number>;
        cfnUsage: Map<string, number>;
      }
    >();
    const cfnUsageMap = new Map<
      string,
      { count: number; hospitals: Set<string> }
    >();
    const monthlyData = new Map<
      string,
      { inbound: number; outbound: number; usage: number }
    >();

    let totalInbound = 0,
      totalOutbound = 0,
      totalUsage = 0;

    movements.forEach((movement) => {
      const product = productMap.get(movement.product_id);
      const cfn = product?.cfn || "알 수 없음";
      const quantity = movement.quantity || 0;

      // 월별 트렌드
      const date = new Date(movement.inbound_date || movement.created_at);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { inbound: 0, outbound: 0, usage: 0 });
      }
      const monthData = monthlyData.get(monthKey)!;

      // CFN별 재고 집계
      cfnMap.set(
        cfn,
        (cfnMap.get(cfn) || 0) +
          (movement.movement_type === "in" ? quantity : -quantity)
      );

      // 이동 유형별 집계
      if (movement.movement_type === "in") {
        monthData.inbound += quantity;
        totalInbound += quantity;
      } else if (movement.movement_type === "out") {
        if (movement.movement_reason === "sale") {
          monthData.outbound += quantity;
          totalOutbound += quantity;
        } else if (movement.movement_reason === "usage") {
          monthData.usage += quantity;
          totalUsage += quantity;

          // 병원별 사용 통계
          const hospitalId = movement.from_location_id;
          const hospital = hospitalId ? locationMap.get(hospitalId) : null;
          const hospitalName = hospital?.location_name || "알 수 없음";

          if (!hospitalUsageMap.has(hospitalName)) {
            hospitalUsageMap.set(hospitalName, {
              usage: 0,
              cfns: new Set(),
              monthlyUsage: new Map(),
              cfnUsage: new Map(),
            });
          }
          const hospitalStats = hospitalUsageMap.get(hospitalName)!;
          hospitalStats.usage += quantity;
          hospitalStats.cfns.add(cfn);

          // 병원별 월별 사용량 집계
          hospitalStats.monthlyUsage.set(
            monthKey,
            (hospitalStats.monthlyUsage.get(monthKey) || 0) + quantity
          );

          // 병원별 CFN 사용량 집계
          hospitalStats.cfnUsage.set(
            cfn,
            (hospitalStats.cfnUsage.get(cfn) || 0) + quantity
          );

          // CFN 사용 통계
          if (!cfnUsageMap.has(cfn)) {
            cfnUsageMap.set(cfn, { count: 0, hospitals: new Set() });
          }
          const cfnStats = cfnUsageMap.get(cfn)!;
          cfnStats.count += quantity;
          cfnStats.hospitals.add(hospitalName);
        }
      }
    });

    // 색상 배열
    const colors = [
      "#3B82F6",
      "#EF4444",
      "#10B981",
      "#F59E0B",
      "#8B5CF6",
      "#EC4899",
      "#14B8A6",
      "#F97316",
      "#6366F1",
      "#84CC16",
    ];

    // CFN별 통계 (재고 6개 이상만)
    const cfnStats = Array.from(cfnMap.entries())
      .filter(([_, quantity]) => quantity >= 6)
      .sort(([, a], [, b]) => b - a)
      .map(([cfn, quantity], index) => ({
        cfn,
        totalQuantity: quantity,
        color: colors[index % colors.length],
      }));

    // 월별 트렌드 (최근 6개월)
    const monthlyTrends = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("ko-KR", {
          month: "short",
          year: "2-digit",
        }),
        ...data,
      }));

    // 최근 3개월 키 생성
    const recentMonthKeys = Array.from(monthlyData.keys())
      .sort()
      .slice(-3)
      .reverse();

    // 병원별 통계
    const hospitalStats = Array.from(hospitalUsageMap.entries())
      .sort(([, a], [, b]) => b.usage - a.usage)
      .slice(0, 8)
      .map(([hospitalName, data]) => ({
        hospitalName,
        totalUsage: data.usage,
        cfnCount: data.cfns.size,
        monthlyUsage: recentMonthKeys.map((monthKey) => {
          const monthDate = new Date(monthKey + "-01");
          return {
            month: monthDate.toLocaleDateString("ko-KR", {
              month: "short",
              year: "2-digit",
            }),
            usage: data.monthlyUsage.get(monthKey) || 0,
          };
        }),
        topCfns: Array.from(data.cfns),
        topCfnUsage: Array.from(data.cfnUsage.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([cfn, usage]) => ({ cfn, usage })),
      }));

    // 최다 사용 CFN TOP 10
    const topCFNs = Array.from(cfnUsageMap.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([cfn, data]) => ({
        cfn,
        usageCount: data.count,
        hospitalCount: data.hospitals.size,
      }));

    // 최근 활동 (임시 데이터)
    const recentActivity = [
      {
        type: "usage",
        description: "수술용 스크류 사용",
        date: "1시간 전",
        hospital: "서울대병원",
      },
      { type: "inbound", description: "심장 스텐트 입고", date: "3시간 전" },
      {
        type: "outbound",
        description: "정형외과 임플란트 출고",
        date: "5시간 전",
        hospital: "분당서울대병원",
      },
      {
        type: "usage",
        description: "카테터 사용",
        date: "8시간 전",
        hospital: "한양대병원",
      },
      { type: "inbound", description: "수술용 메쉬 입고", date: "1일 전" },
    ];

    return {
      cfnStats,
      monthlyTrends,
      hospitalStats,
      topCFNs,
      recentActivity,
      summary: {
        totalProducts: productMap.size,
        totalStock: Array.from(cfnMap.values()).reduce(
          (sum, qty) => sum + Math.max(0, qty),
          0
        ),
        monthlyInbound: totalInbound,
        monthlyOutbound: totalOutbound,
        monthlyUsage: totalUsage,
        activeHospitals: hospitalUsageMap.size,
      },
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">통계를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-status-error-text">
            통계 데이터를 불러올 수 없습니다.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">통계 분석</h1>
            <p className="text-text-secondary">재고 관리 현황 및 분석 리포트</p>
          </div>
          <Link
            href="/statistics/graphs"
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors font-medium"
          >
            그래프 보기
          </Link>
        </div>

        {/* 메인 컨텐츠 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 병원별 사용 현황 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-primary mb-4">병원별 사용 현황</h3>
            
            <div className="space-y-4">
              {statistics.hospitalStats.slice(0, 4).map((hospital, index) => (
                <div key={hospital.hospitalName}>
                  <h4 className="font-semibold text-text-primary mb-2 text-base">{hospital.hospitalName}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {hospital.monthlyUsage.map((usage, idx) => {
                      const bgColors = ['bg-primary', 'bg-primary-light', 'bg-accent-light'];
                      const textColors = ['text-white', 'text-white', 'text-primary'];
                      return (
                        <div key={idx} className={`${bgColors[idx]} rounded-md p-1.5 text-center border border-gray-100`}>
                          <div className={`text-base font-bold ${textColors[idx]}`}>{usage.usage}</div>
                          <div className={`text-xs ${textColors[idx]} opacity-80 font-medium`}>{usage.month}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 h-px bg-primary opacity-20"></div>
                </div>
              ))}
            </div>
          </div>

          {/* CFN 사용 현황 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-primary mb-4">CFN 사용 현황</h3>
            
            <div className="space-y-4">
              {statistics.hospitalStats.slice(0, 4).map((hospital, index) => (
                <div key={hospital.hospitalName}>
                  <h4 className="font-semibold text-text-primary mb-2 text-base">{hospital.hospitalName}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {hospital.topCfnUsage.map((cfnData, idx) => {
                      const bgColors = ['bg-primary', 'bg-primary-light', 'bg-accent-light'];
                      const textColors = ['text-white', 'text-white', 'text-primary'];
                      return (
                        <div key={idx} className={`${bgColors[idx]} rounded-md p-1.5 text-center border border-gray-100`}>
                          <div className={`text-base font-bold ${textColors[idx]}`}>{cfnData.usage}</div>
                          <div className={`text-xs ${textColors[idx]} opacity-80 font-medium`}>{cfnData.cfn}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 h-px bg-primary opacity-20"></div>
                </div>
              ))}
            </div>
          </div>

          {/* 월별 재고 이동 현황 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-primary mb-4">월별 재고 이동 현황</h3>
            
            <div className="space-y-4">
              {statistics.monthlyTrends.slice(-4).reverse().map((trend, index) => (
                <div key={index}>
                  <h4 className="font-semibold text-text-primary mb-2 text-base">{trend.month}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-primary rounded-md p-1.5 text-center border border-gray-100">
                      <div className="text-base font-bold text-white">{trend.inbound}</div>
                      <div className="text-xs text-white opacity-80 font-medium">입고</div>
                    </div>
                    <div className="bg-primary-light rounded-md p-1.5 text-center border border-gray-100">
                      <div className="text-base font-bold text-white">{trend.outbound}</div>
                      <div className="text-xs text-white opacity-80 font-medium">출고</div>
                    </div>
                    <div className="bg-accent-light rounded-md p-1.5 text-center border border-gray-100">
                      <div className="text-base font-bold text-primary">{trend.usage}</div>
                      <div className="text-xs text-primary opacity-80 font-medium">사용</div>
                    </div>
                  </div>
                  <div className="mt-1.5 h-px bg-primary opacity-20"></div>
                </div>
              ))}
            </div>
          </div>

          {/* CFN별 과잉재고 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-primary mb-4">CFN별 과잉재고</h3>
            
            {statistics.cfnStats.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <p className="text-lg">과잉재고가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {statistics.cfnStats.slice(0, 1).map((item, index) => (
                  <div key={item.cfn} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                      <span className="font-semibold text-text-primary text-lg">{item.cfn}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-600">{item.totalQuantity}개</div>
                      <div className="text-sm text-text-secondary font-medium">과잉재고</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="mt-12 text-center text-text-secondary text-sm">
          © 2018 ABLE MEDITECH
        </div>
      </div>
    </div>
  );
}
