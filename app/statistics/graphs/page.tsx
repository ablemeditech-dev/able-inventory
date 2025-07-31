"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { StockMovement, Product, Location } from "../../../lib/utils/schema";

interface GraphData {
  monthlyTrends: Array<{
    month: string;
    inbound: number;
    outbound: number;
    usage: number;
  }>;
  hospitalStats: Array<{
    hospitalName: string;
    totalUsage: number;
  }>;
  cfnStats: Array<{
    cfn: string;
    totalQuantity: number;
  }>;
  topCFNs: Array<{
    cfn: string;
    usageCount: number;
    hospitalCount?: number;
  }>;
}

export default function StatisticsGraphsPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGraph, setSelectedGraph] = useState<string>("monthly");

  const calculateGraphData = (
    movements: StockMovement[],
    productMap: Map<string, Product>,
    locationMap: Map<string, Partial<Location>>
  ): GraphData => {
    const monthlyData = new Map<
      string,
      { inbound: number; outbound: number; usage: number }
    >();
    const hospitalUsage = new Map<string, number>();
    const cfnStock = new Map<string, number>();
    const cfnUsage = new Map<string, number>();
    const cfnHospitals = new Map<string, Set<string>>(); // CFN별 병원 Set 추가

    movements.forEach((movement) => {
      const product = productMap.get(movement.product_id);
      const cfn = product?.cfn || "알 수 없음";
      const quantity = movement.quantity || 0;

      // 월별 데이터
      const dateValue =
        movement.inbound_date ||
        movement.created_at ||
        new Date().toISOString();
      const date = new Date(dateValue);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { inbound: 0, outbound: 0, usage: 0 });
      }
      const monthData = monthlyData.get(monthKey)!;

      // CFN별 재고
      cfnStock.set(
        cfn,
        (cfnStock.get(cfn) || 0) +
          (movement.movement_type === "in" ? quantity : -quantity)
      );

      if (movement.movement_type === "in") {
        monthData.inbound += quantity;
      } else if (movement.movement_type === "out") {
        if (movement.movement_reason === "sale") {
          monthData.outbound += quantity;
        } else if (movement.movement_reason === "usage") {
          monthData.usage += quantity;

          // 병원별 사용량
          const hospitalId = movement.from_location_id;
          const hospital = hospitalId ? locationMap.get(hospitalId) : null;
          const hospitalName = hospital?.location_name || "알 수 없음";
          hospitalUsage.set(
            hospitalName,
            (hospitalUsage.get(hospitalName) || 0) + quantity
          );

          // CFN별 사용량
          cfnUsage.set(cfn, (cfnUsage.get(cfn) || 0) + quantity);
          
          // CFN별 병원 집합 추가
          if (!cfnHospitals.has(cfn)) {
            cfnHospitals.set(cfn, new Set());
          }
          cfnHospitals.get(cfn)!.add(hospitalName);
        }
      }
    });

    return {
      monthlyTrends: Array.from(monthlyData.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => {
          const monthStr = month as string;
          const [year, monthNum] = monthStr.split("-");
          const monthNames = [
            "1월",
            "2월",
            "3월",
            "4월",
            "5월",
            "6월",
            "7월",
            "8월",
            "9월",
            "10월",
            "11월",
            "12월",
          ];
          const displayMonth = monthNames[parseInt(monthNum) - 1] || "1월";
          const displayYear = year ? year.slice(-2) : "70";

          return {
            month: displayMonth,
            ...data,
          };
        }),
      hospitalStats: Array.from(hospitalUsage.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([hospitalName, totalUsage]) => ({
          hospitalName,
          totalUsage,
        })),
      cfnStats: Array.from(cfnStock.entries())
        .filter(([, quantity]) => quantity >= 6)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([cfn, totalQuantity]) => ({
          cfn,
          totalQuantity,
        })),
      topCFNs: Array.from(cfnUsage.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([cfn, usageCount]) => ({
          cfn,
          usageCount,
          hospitalCount: cfnHospitals.get(cfn)?.size || 0, // 병원 수 추가
        })),
    };
  };

  const fetchGraphData = async () => {
    try {
      setLoading(true);

      const monthsAgo = 6;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsAgo);

      // 재고 이동 데이터 조회
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

      // 제품 정보 조회
      const productIds = [
        ...new Set(movements?.map((m) => m.product_id) || []),
      ];
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, cfn, description")
        .in("id", productIds);

      if (productsError) throw productsError;

      // 병원/위치 정보 조회
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
      const locationMap = new Map<string, Partial<Location>>(
        locations?.map((l) => [l.id, l]) || []
      );

      const graphData = calculateGraphData(
        movements || [],
        productMap,
        locationMap
      );
      setData(graphData);
    } catch {
      console.error("그래프 데이터 조회 실패:");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  const renderBarChart = (
    data: any[],
    dataKey: string,
    title: string,
    color: string
  ) => {
    const maxValue = Math.max(...data.map((item) => item[dataKey]));

    return (
      <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">{title}</h3>
        <div className="space-y-3">
          {data.map((item, index) => {
            const percentage = (item[dataKey] / maxValue) * 100;
            const label = item.hospitalName || item.cfn || item.month;

            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-20 text-sm text-primary truncate">
                  {label}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div
                    className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`}
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    {item[dataKey].toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <div className="text-primary">
              그래프 데이터를 불러오는 중...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-600">
              그래프 데이터를 불러올 수 없습니다.
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
            <h1 className="text-2xl font-bold text-primary">그래프 통계</h1>
            <p className="text-primary mt-1">
              차트로 보는 재고 관리 현황
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href="/statistics"
              className="px-4 py-2 bg-accent-soft text-primary rounded-lg hover:bg-accent-light transition-colors"
            >
              ← 돌아가기
            </Link>
          </div>
        </div>

        {/* 그래프 선택 탭 */}
        <div className="flex space-x-1 mb-6 bg-accent-soft/30 p-1 rounded-lg">
          {[
            { key: "monthly", label: "월별 사용량 트렌드" },
            { key: "hospital", label: "병원별 사용량" },
            { key: "cfn-trend", label: "주요 CFN 트렌드" },
            { key: "cfn-stock", label: "CFN별 재고" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedGraph(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedGraph === tab.key
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 그래프 표시 */}
        <div className="grid grid-cols-1 gap-6">
          {selectedGraph === "monthly" && (
            <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">
                월별 사용량 트렌드
              </h3>
              <div className="space-y-6">
                {/* 트렌드 라인 차트 스타일 */}
                <div className="relative">
                  <div className="flex items-end justify-between h-64 border-b border-l border-accent-soft/30 pl-4 pb-4">
                                         {data.monthlyTrends.map((item, index) => {
                       const maxUsage = data.monthlyTrends.length > 0 ? Math.max(...data.monthlyTrends.map(t => t.usage)) : 0;
                       const height = maxUsage > 0 ? (item.usage / maxUsage) * 200 : 0;
                       const isHighest = item.usage === maxUsage && maxUsage > 0;
                      
                      return (
                        <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                          <div className="relative">
                            <div 
                              className={`w-8 rounded-t-lg transition-all duration-1000 ease-out ${
                                isHighest ? 'bg-red-500' : 'bg-primary'
                              }`}
                              style={{ height: `${height}px` }}
                            >
                              {item.usage > 0 && (
                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                  {item.usage}개
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-primary font-medium transform -rotate-45 origin-center mt-4">
                            {item.month}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                                     {/* Y축 레이블 */}
                   <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-4">
                     <span className="text-xs text-text-secondary">
                       {data.monthlyTrends.length > 0 ? Math.max(...data.monthlyTrends.map(t => t.usage)) : 0}
                     </span>
                     <span className="text-xs text-text-secondary">0</span>
                   </div>
                </div>

                                 {/* 통계 요약 */}
                 <div className="grid grid-cols-3 gap-4 mt-6">
                   <div className="bg-primary/5 rounded-lg p-4 text-center">
                     <div className="text-2xl font-bold text-primary">
                       {data.monthlyTrends.length > 0 ? data.monthlyTrends.reduce((sum, item) => sum + item.usage, 0) : 0}
                     </div>
                     <div className="text-sm text-text-secondary">총 사용량</div>
                   </div>
                   <div className="bg-accent-soft/20 rounded-lg p-4 text-center">
                     <div className="text-2xl font-bold text-primary">
                       {data.monthlyTrends.length > 0 ? Math.round(data.monthlyTrends.reduce((sum, item) => sum + item.usage, 0) / data.monthlyTrends.length) : 0}
                     </div>
                     <div className="text-sm text-text-secondary">월평균 사용량</div>
                   </div>
                   <div className="bg-red-50 rounded-lg p-4 text-center">
                     <div className="text-2xl font-bold text-red-600">
                       {data.monthlyTrends.length > 0 ? Math.max(...data.monthlyTrends.map(t => t.usage)) : 0}
                     </div>
                     <div className="text-sm text-text-secondary">최대 사용량</div>
                   </div>
                 </div>
              </div>
            </div>
          )}

          {selectedGraph === "hospital" &&
            renderBarChart(
              data.hospitalStats,
              "totalUsage",
              "병원별 사용량",
              "bg-primary"
            )}

          {selectedGraph === "cfn-trend" && (
            <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">
                주요 CFN 사용량 비교
              </h3>
              <div className="space-y-4">
                {data.topCFNs.slice(0, 5).map((cfn, index) => {
                  const maxUsage = Math.max(...data.topCFNs.map(c => c.usageCount));
                  const percentage = (cfn.usageCount / maxUsage) * 100;
                  const colors = ['bg-primary', 'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500'];
                  
                  return (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="w-24 text-sm text-primary font-medium truncate">
                        {cfn.cfn}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                        <div
                          className={`h-full rounded-full ${colors[index]} transition-all duration-1000 ease-out`}
                          style={{ width: `${percentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white">
                          {cfn.usageCount}EA in {cfn.hospitalCount || 0} hospitals
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
                                           {/* CFN 사용량 인사이트 */}
              <div className="mt-6 p-4 bg-accent-soft/10 rounded-lg">
                <h4 className="font-semibold text-primary mb-2">인사이트</h4>
                <ul className="space-y-1 text-sm text-text-secondary">
                  <li>• 가장 많이 사용되는 CFN: <span className="font-medium text-primary">{data.topCFNs[0]?.cfn || 'N/A'}</span> ({data.topCFNs[0]?.usageCount || 0}개)</li>
                  {(() => {
                    const mostWidelyUsed = data.topCFNs.length > 0 
                      ? data.topCFNs.reduce((max, cfn) => (cfn.hospitalCount || 0) > (max.hospitalCount || 0) ? cfn : max)
                      : null;
                    return mostWidelyUsed ? (
                      <li>• 가장 널리 사용되는 CFN: <span className="font-medium text-primary">{mostWidelyUsed.cfn}</span> ({mostWidelyUsed.hospitalCount}개 병원)</li>
                    ) : (
                      <li>• 가장 널리 사용되는 CFN: <span className="font-medium text-primary">N/A</span></li>
                    );
                  })()}
                  <li>• 상위 5개 CFN이 전체 사용량의 <span className="font-medium text-primary">{data.topCFNs.length > 0 ? Math.round((data.topCFNs.slice(0, 5).reduce((sum, cfn) => sum + cfn.usageCount, 0) / data.topCFNs.reduce((sum, cfn) => sum + cfn.usageCount, 0)) * 100) : 0}%</span> 차지</li>
                </ul>
              </div>
            </div>
          )}

          {selectedGraph === "cfn-stock" &&
            renderBarChart(
              data.cfnStats,
              "totalQuantity",
              "CFN별 과잉재고",
              "bg-red-500"
            )}
        </div>
      </div>
    </div>
  );
}
