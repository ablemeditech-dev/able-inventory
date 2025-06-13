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
            month: `${displayMonth} ${displayYear}`,
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
                <div className="w-20 text-sm text-text-secondary truncate">
                  {label}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div
                    className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`}
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary">
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
            <div className="text-text-secondary">
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
            <p className="text-text-secondary mt-1">
              차트로 보는 재고 관리 현황
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href="/statistics"
              className="px-4 py-2 bg-accent-soft text-text-secondary rounded-lg hover:bg-accent-light transition-colors"
            >
              ← 돌아가기
            </Link>
          </div>
        </div>

        {/* 그래프 선택 탭 */}
        <div className="flex space-x-1 mb-6 bg-accent-soft/30 p-1 rounded-lg">
          {[
            { key: "monthly", label: "월별 이동량" },
            { key: "hospital", label: "병원별 사용량" },
            { key: "cfn-stock", label: "CFN별 재고" },
            { key: "cfn-usage", label: "CFN별 사용량" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedGraph(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedGraph === tab.key
                  ? "bg-primary text-text-primary shadow-sm"
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
                월별 재고 이동량
              </h3>
              <div className="space-y-4">
                {data.monthlyTrends.map((item, index) => (
                  <div
                    key={index}
                    className="border-b border-accent-soft pb-4 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-primary mb-2">
                      {item.month}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <div className="text-xs text-text-secondary">입고</div>
                        <div className="bg-blue-200 rounded-full h-6 relative">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                            style={{
                              width: `${
                                (item.inbound /
                                  Math.max(
                                    ...data.monthlyTrends.map((t) => t.inbound)
                                  )) *
                                100
                              }%`,
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                            {item.inbound}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-text-secondary">출고</div>
                        <div className="bg-orange-200 rounded-full h-6 relative">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                            style={{
                              width: `${
                                (item.outbound /
                                  Math.max(
                                    ...data.monthlyTrends.map((t) => t.outbound)
                                  )) *
                                100
                              }%`,
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                            {item.outbound}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-text-secondary">사용</div>
                        <div className="bg-red-200 rounded-full h-6 relative">
                          <div
                            className="h-full bg-red-500 rounded-full transition-all duration-1000"
                            style={{
                              width: `${
                                (item.usage /
                                  Math.max(
                                    ...data.monthlyTrends.map((t) => t.usage)
                                  )) *
                                100
                              }%`,
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                            {item.usage}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedGraph === "hospital" &&
            renderBarChart(
              data.hospitalStats,
              "totalUsage",
              "병원별 사용량",
              "bg-green-500"
            )}

          {selectedGraph === "cfn-stock" &&
            renderBarChart(
              data.cfnStats,
              "totalQuantity",
              "CFN별 과잉재고",
              "bg-red-500"
            )}

          {selectedGraph === "cfn-usage" &&
            renderBarChart(
              data.topCFNs,
              "usageCount",
              "CFN별 사용량",
              "bg-purple-500"
            )}
        </div>
      </div>
    </div>
  );
}
