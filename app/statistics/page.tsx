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

  useEffect(() => {
    fetchStatistics();
  }, []);

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
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <div className="text-text-secondary">통계를 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-600">
              통계 데이터를 불러올 수 없습니다.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">통계 분석</h1>
            <p className="text-text-secondary mt-1">
              재고 관리 현황 및 분석 리포트
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href="/statistics/graphs"
              className="bg-primary text-text-primary px-4 py-2 rounded-lg hover:bg-accent-soft transition-colors"
            >
              그래프 보기
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 병원별 사용 통계 */}
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">
              병원별 사용 현황
            </h3>
            <div className="space-y-3">
              {statistics.hospitalStats.map((hospital, index) => {
                return (
                  <div
                    key={hospital.hospitalName}
                    className="border-b border-accent-soft pb-2 last:border-b-0"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-primary">
                        {hospital.hospitalName}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {hospital.monthlyUsage.map((usage, idx) => {
                        const colors = [
                          "bg-primary/10",
                          "bg-accent-soft/40",
                          "bg-gray-100",
                        ];
                        return (
                          <div
                            key={idx}
                            className={`text-center p-1.5 ${colors[idx]} rounded`}
                          >
                            <div className="font-bold text-primary">
                              {usage.usage}
                            </div>
                            <div className="text-text-secondary">
                              {usage.month}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CFN 사용 현황 */}
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">
              CFN 사용 현황
            </h3>
            <div className="space-y-3">
              {statistics.hospitalStats.slice(0, 8).map((hospital, index) => (
                <div
                  key={hospital.hospitalName}
                  className="border-b border-accent-soft pb-2 last:border-b-0"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-primary">
                      {hospital.hospitalName}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                    {hospital.topCfnUsage.map((cfnData, idx) => {
                      const colors = [
                        "bg-primary/10",
                        "bg-accent-soft/40",
                        "bg-gray-100",
                      ];
                      return (
                        <div
                          key={idx}
                          className={`text-center p-1.5 ${colors[idx]} rounded`}
                        >
                          <div className="font-bold text-primary">
                            {cfnData.usage}
                          </div>
                          <div className="text-text-secondary">
                            {cfnData.cfn}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 월별 트렌드 */}
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">
              월별 재고 이동 현황
            </h3>
            <div className="space-y-3">
              {statistics.monthlyTrends
                .slice(-5)
                .reverse()
                .map((item) => (
                  <div
                    key={item.month}
                    className="border-b border-accent-soft pb-2 last:border-b-0"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-primary">
                        {item.month}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center p-1.5 bg-primary/10 rounded">
                        <div className="font-bold text-primary">
                          {item.inbound.toLocaleString()}
                        </div>
                        <div className="text-text-secondary">입고</div>
                      </div>
                      <div className="text-center p-1.5 bg-accent-soft/40 rounded">
                        <div className="font-bold text-primary">
                          {item.outbound.toLocaleString()}
                        </div>
                        <div className="text-text-secondary">출고</div>
                      </div>
                      <div className="text-center p-1.5 bg-gray-100 rounded">
                        <div className="font-bold text-primary">
                          {item.usage.toLocaleString()}
                        </div>
                        <div className="text-text-secondary">사용</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* CFN별 과잉재고 */}
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">
              CFN별 과잉재고
            </h3>
            {statistics.cfnStats.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                과잉재고가 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {statistics.cfnStats.slice(0, 6).map((item, index) => (
                  <div
                    key={item.cfn}
                    className="flex items-center justify-between p-3 bg-accent-soft/20 rounded-lg hover:bg-accent-soft/30 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-bold">
                        !
                      </div>
                      <span className="font-medium text-primary">
                        {item.cfn}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">
                        {item.totalQuantity.toLocaleString()}개
                      </div>
                      <div className="text-sm text-text-secondary">
                        과잉재고
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
