"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface OrderItem {
  cfn: string;
  client_name: string;
  total_quantity: number;
  six_months_usage: number;
  product_id: string;
  client_id: string;
}

export const useOrderData = () => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [originalOrderItems, setOriginalOrderItems] = useState<OrderItem[]>([]);
  const [hospitalTopUsage, setHospitalTopUsage] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const fetchOrderData = async () => {
    try {
      setLoading(true);
      setError("");

      // ABLE 중앙창고 ID
      const ableLocationId = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";

      // 모든 제품 정보 조회 (재고가 0인 CFN도 포함하기 위해)
      const { data: allProducts, error: allProductsError } = await supabase
        .from("products")
        .select("id, cfn, client_id")
        .not("cfn", "is", null)
        .order("cfn");

      if (allProductsError) {
        throw allProductsError;
      }

      if (!allProducts || allProducts.length === 0) {
        setOrderItems([]);
        return;
      }

      // 거래처 ID 목록 추출
      const clientIds = [
        ...new Set(allProducts.map((p) => p.client_id).filter(Boolean)),
      ];

      // 거래처 정보 별도 조회
      let clients: { id: string; company_name: string }[] = [];
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, company_name")
          .in("id", clientIds);

        if (!clientsError && clientsData) {
          clients = clientsData;
        }
      }

      // 맵으로 변환
      const productMap = new Map(allProducts.map((p) => [p.id, p]) || []);
      const clientMap = new Map(clients.map((c) => [c.id, c]));

      // CFN별 제품 그룹화
      const cfnProductMap = new Map<string, typeof allProducts[0]>();
      allProducts.forEach((product) => {
        if (product.cfn && !cfnProductMap.has(product.cfn)) {
          cfnProductMap.set(product.cfn, product);
        }
      });

      // ABLE 중앙창고 재고 계산을 위한 stock_movements 조회
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
          to_location_id,
          created_at
        `
        )
        .or(
          `from_location_id.eq.${ableLocationId},to_location_id.eq.${ableLocationId}`
        )
        .order("created_at", { ascending: false });

      if (movementsError) {
        throw movementsError;
      }

      // CFN별 재고 계산
      const cfnInventoryMap = new Map<string, {
        cfn: string;
        client_name: string;
        total_quantity: number;
        product_id: string;
        client_id: string;
      }>();

      // 모든 CFN에 대해 초기값 설정
      Array.from(cfnProductMap.entries()).forEach(([cfn, product]) => {
        const client = clientMap.get(product.client_id);
        const clientName = client?.company_name || "알 수 없음";

        cfnInventoryMap.set(cfn, {
          cfn,
          client_name: clientName,
          total_quantity: 0,
          product_id: product.id,
          client_id: product.client_id,
        });
      });

      // 재고 계산
      movements?.forEach((movement) => {
        const product = productMap.get(movement.product_id);
        if (!product || !product.cfn) return;

        const cfn = product.cfn;
        const item = cfnInventoryMap.get(cfn);
        if (!item) return;

        // ABLE로 들어오는 경우 (+), ABLE에서 나가는 경우 (-)
        if (movement.to_location_id === ableLocationId) {
          item.total_quantity += movement.quantity || 0;
        } else if (movement.from_location_id === ableLocationId) {
          item.total_quantity -= movement.quantity || 0;
        }
      });

      // 최근 6개월 사용량 계산
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: recentMovements, error: recentMovementsError } = await supabase
        .from("stock_movements")
        .select(
          `
          product_id,
          quantity,
          movement_type,
          movement_reason,
          from_location_id,
          to_location_id,
          created_at
        `
        )
        .eq("movement_type", "out")
        .eq("movement_reason", "usage")
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at", { ascending: false });

      if (recentMovementsError) {
        throw recentMovementsError;
      }

      // CFN별 6개월 사용량 집계
      const cfnUsageMap = new Map<string, number>();
      recentMovements?.forEach((movement) => {
        const product = productMap.get(movement.product_id);
        if (!product || !product.cfn) return;

        const cfn = product.cfn;
        const currentUsage = cfnUsageMap.get(cfn) || 0;
        cfnUsageMap.set(cfn, currentUsage + (movement.quantity || 0));
      });

      // 병원별 CFN 사용량 집계를 위한 별도 조회
      try {
        // 병원별 사용량 계산
        const { data: hospitalMovements, error: hospitalError } = await supabase
          .from("stock_movements")
          .select(`
            product_id,
            quantity,
            from_location_id,
            locations!stock_movements_from_location_id_fkey(*)
          `)
          .eq("movement_type", "out")
          .neq("from_location_id", ableLocationId) // ABLE 중앙창고 제외
          .gte("created_at", sixMonthsAgo.toISOString());

        if (!hospitalError && hospitalMovements) {
          const hospitalCfnUsage = new Map<string, Map<string, number>>();
          
          hospitalMovements.forEach((movement: any) => {
            const product = productMap.get(movement.product_id);
            if (!product || !product.cfn) return;

            const location = movement.locations;
            if (!location) return;

            // location이 배열인지 객체인지 확인하고 적절히 처리
            const locationData = Array.isArray(location) ? location[0] : location;
            if (!locationData) return;

            // notes 필드에 "병원:"이 포함된 경우는 병원으로 처리 (타입 안전성 개선)
            const notes = locationData?.notes || '';
            const isHospital = typeof notes === 'string' && notes.includes("병원:");
            const locationName = locationData?.location_name || '';
            const isAbleWarehouse = locationName === "ABLE" || locationData?.id === ableLocationId;
            
            // ABLE 중앙창고나 실제 창고(병원이 아닌)만 제외
            if (!isHospital && (isAbleWarehouse || locationData?.location_type === "warehouse")) {
              return;
            }

            const hospitalId = movement.from_location_id;
            const cfn = product.cfn;
            const quantity = movement.quantity || 0;

            if (!hospitalCfnUsage.has(hospitalId)) {
              hospitalCfnUsage.set(hospitalId, new Map());
            }

            const hospitalMap = hospitalCfnUsage.get(hospitalId)!;
            const currentUsage = hospitalMap.get(cfn) || 0;
            hospitalMap.set(cfn, currentUsage + quantity);
          });

          // 각 병원별 최다 사용 CFN 찾기
          const topCfnByHospital = new Map<string, string>();
          hospitalCfnUsage.forEach((cfnUsageMap, hospitalId) => {
            let maxUsage = 0;
            let topCfn = "";
            let hospitalName = "";

            // 해당 병원의 최다 사용 CFN 찾기
            cfnUsageMap.forEach((usage, cfn) => {
              if (usage > maxUsage) {
                maxUsage = usage;
                topCfn = cfn;
              }
            });

            // 병원 이름 찾기 (notes 필드에서 추출)
            const hospital = hospitalMovements.find((m: any) => m.from_location_id === hospitalId);
            if (hospital?.locations) {
              const loc = hospital.locations;
              
              // location이 배열인지 객체인지 확인하고 적절히 처리
              const locData = Array.isArray(loc) ? loc[0] : loc;
              if (locData) {
                // notes 필드에서 병원명 추출 (예: "병원: 한양대 (담당자: 정미화)" -> "한양대")
                const notes = locData?.notes || '';
                if (typeof notes === 'string' && notes.includes("병원:")) {
                  const match = notes.match(/병원:\s*([^(]*)/);
                  if (match) {
                    hospitalName = match[1].trim();
                  }
                }
                
                // notes에서 추출 실패 시 다른 필드 사용
                if (!hospitalName) {
                  hospitalName = locData?.location_name || locData?.facility_name || locData?.hospital_name || locData?.company_name || "병원";
                }
              }
            }

            if (topCfn && hospitalName) {
              topCfnByHospital.set(topCfn, hospitalName);
            }
          });

          // 병원별 최다 사용 CFN 정보 저장
          setHospitalTopUsage(topCfnByHospital);
        }
      } catch (hospitalErr) {
        // 병원별 계산 실패해도 전체 기능은 계속 작동하도록 함
        setHospitalTopUsage(new Map());
      }

      // 모든 CFN 데이터 생성 (재고가 0인 것도 포함)
      const orderData = Array.from(cfnInventoryMap.values())
        .map(item => ({
          ...item,
          six_months_usage: cfnUsageMap.get(item.cfn) || 0,
        }))
        .sort((a, b) => {
          // 재고가 0인 것을 먼저 보여주고, 그 다음 재고가 적은 순으로 정렬
          if (a.total_quantity === 0 && b.total_quantity > 0) return -1;
          if (a.total_quantity > 0 && b.total_quantity === 0) return 1;
          return a.total_quantity - b.total_quantity;
        });

      setOrderItems(orderData);
      setOriginalOrderItems(orderData);
    } catch (err) {
      console.error("오더 데이터 조회 실패:", err);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderData();
  }, []);

  return {
    orderItems,
    setOrderItems,
    originalOrderItems,
    hospitalTopUsage,
    loading,
    error,
    refetch: fetchOrderData,
  };
}; 