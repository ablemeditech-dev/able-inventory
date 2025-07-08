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

type SortType = "default" | "numeric";

export default function AbleInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [originalInventory, setOriginalInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [cfnSortType, setCfnSortType] = useState<SortType>("default");

  useEffect(() => {
    fetchAbleInventory();
  }, []);

  // CFN 숫자 정렬 함수
  const sortByCfnNumeric = (items: InventoryItem[]) => {
    return [...items].sort((a, b) => {
      // CFN에서 영문 부분과 숫자 부분 추출 (예: DHC2508 -> 영문: DHC, 숫자: 2508)
      const extractParts = (cfn: string) => {
        const match = cfn.match(/^([A-Za-z]+)(\d+)$/);
        if (!match) return { prefix: cfn, first: 0, second: 0 };
        
        const prefix = match[1]; // DHC, DPC 등
        const numbers = match[2]; // 2508 등
        
        if (numbers.length >= 4) {
          // 4자리 이상인 경우 앞 2자리, 뒤 2자리로 분리
          const first = parseInt(numbers.slice(0, -2), 10); // 25
          const second = parseInt(numbers.slice(-2), 10);   // 08
          return { prefix, first, second };
        }
        return { prefix, first: parseInt(numbers, 10), second: 0 };
      };

      const aParts = extractParts(a.cfn);
      const bParts = extractParts(b.cfn);

      // 먼저 영문 부분으로 정렬 (DHC, DPC 등)
      if (aParts.prefix !== bParts.prefix) {
        return aParts.prefix.localeCompare(bParts.prefix);
      }

      // 같은 영문 그룹 내에서 뒤 2자리로 먼저 정렬 (08, 12 등) - 사용자 요구사항에 따라
      if (aParts.second !== bParts.second) {
        return aParts.second - bParts.second;
      }

      // 뒤 2자리가 같으면 앞 2자리로 정렬 (25, 27, 30, 35, 40 등)
      if (aParts.first !== bParts.first) {
        return aParts.first - bParts.first;
      }
      
      // CFN이 같으면 LOT, UBD 순으로 정렬
      if (a.lot_number !== b.lot_number) {
        return a.lot_number.localeCompare(b.lot_number);
      }
      return a.ubd_date.localeCompare(b.ubd_date);
    });
  };

  // 기본 정렬 함수
  const sortByDefault = (items: InventoryItem[]) => {
    return [...items].sort((a, b) => {
      // CFN에서 영문 부분 추출
      const getPrefix = (cfn: string) => {
        const match = cfn.match(/^([A-Za-z]+)/);
        return match ? match[1] : cfn;
      };

      const aPrefix = getPrefix(a.cfn);
      const bPrefix = getPrefix(b.cfn);

      // 먼저 영문 부분으로 정렬 (DHC, DPC 등)
      if (aPrefix !== bPrefix) {
        return aPrefix.localeCompare(bPrefix);
      }

      // 같은 영문 그룹 내에서 CFN 전체로 문자열 정렬
      if (a.cfn !== b.cfn) return a.cfn.localeCompare(b.cfn);
      if (a.lot_number !== b.lot_number)
        return a.lot_number.localeCompare(b.lot_number);
      return a.ubd_date.localeCompare(b.ubd_date);
    });
  };

  // CFN 정렬 토글 핸들러
  const handleCfnSortToggle = () => {
    const newSortType = cfnSortType === "default" ? "numeric" : "default";
    setCfnSortType(newSortType);
    
    if (newSortType === "numeric") {
      const sorted = sortByCfnNumeric(originalInventory);
      setInventory(sorted);
    } else {
      const sorted = sortByDefault(originalInventory);
      setInventory(sorted);
    }
  };

  const fetchAbleInventory = async () => {
    try {
      setLoading(true);
      setError("");

      // ABLE 중앙창고 ID
      const ableLocationId = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";

      // 입고/출고 이력에서 ABLE 창고의 현재 재고 계산
      const { data: movements, error: movementsError } = await supabase
        .from("stock_movements")
        .select(
          `
          product_id,
          lot_number,
          ubd_date,
          quantity,
          movement_type,
          from_location_id,
          to_location_id
        `
        )
        .or(
          `from_location_id.eq.${ableLocationId},to_location_id.eq.${ableLocationId}`
        )
        .order("created_at", { ascending: false });

      if (movementsError) {
        throw movementsError;
      }

      if (!movements || movements.length === 0) {
        setInventory([]);
        return;
      }

      // 제품 ID 목록 추출
      const productIds = [
        ...new Set(movements.map((m) => m.product_id).filter(Boolean)),
      ];

      if (productIds.length === 0) {
        setInventory([]);
        return;
      }

      // 제품 정보 별도 조회
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, cfn, client_id")
        .in("id", productIds);

      if (productsError) {
        throw productsError;
      }

      // 거래처 ID 목록 추출
      const clientIds = [
        ...new Set(products?.map((p) => p.client_id).filter(Boolean)),
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
      const productMap = new Map(products?.map((p) => [p.id, p]) || []);
      const clientMap = new Map(clients.map((c) => [c.id, c]));

      // 재고 계산
      const inventoryMap = new Map<string, InventoryItem>();

      movements.forEach(
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

          // ABLE로 들어오는 경우 (+), ABLE에서 나가는 경우 (-)
          if (movement.to_location_id === ableLocationId) {
            item.quantity += movement.quantity || 0;
          } else if (movement.from_location_id === ableLocationId) {
            item.quantity -= movement.quantity || 0;
          }
        }
      );

      // 수량이 0보다 큰 항목만 필터링
      const filteredInventory = Array.from(inventoryMap.values())
        .filter((item) => item.quantity > 0);

      // 기본 정렬로 초기 설정 (인라인으로 구현)
      const currentInventory = [...filteredInventory].sort((a, b) => {
        // CFN에서 영문 부분 추출
        const getPrefix = (cfn: string) => {
          const match = cfn.match(/^([A-Za-z]+)/);
          return match ? match[1] : cfn;
        };

        const aPrefix = getPrefix(a.cfn);
        const bPrefix = getPrefix(b.cfn);

        // 먼저 영문 부분으로 정렬 (DHC, DPC 등)
        if (aPrefix !== bPrefix) {
          return aPrefix.localeCompare(bPrefix);
        }

        // 같은 영문 그룹 내에서 CFN 전체로 문자열 정렬
        if (a.cfn !== b.cfn) return a.cfn.localeCompare(b.cfn);
        if (a.lot_number !== b.lot_number)
          return a.lot_number.localeCompare(b.lot_number);
        return a.ubd_date.localeCompare(b.ubd_date);
      });
      
      setOriginalInventory(filteredInventory);
      setInventory(currentInventory);
      setCfnSortType("default");
    } catch {
      setError("재고 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-text-secondary">재고 정보를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-300 rounded-lg p-4">
          <div className="text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  const handleStockAudit = () => {
    // 재고조사 기능 구현 예정
    alert("재고조사 기능은 준비 중입니다.");
  };

  return (
    <div className="p-6">
      <div>
        <div className="px-3 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 md:space-x-4">
            <h2 className="text-base md:text-lg font-semibold text-black">
              ABLE 중앙창고
            </h2>
            <span className="text-base md:text-lg font-bold text-primary">
              {inventory
                .reduce((sum, item) => sum + item.quantity, 0)
                .toLocaleString()}
              ea
            </span>
          </div>
          <button
            onClick={handleStockAudit}
            className="px-3 md:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-1 md:space-x-2 text-sm md:text-base"
          >
            <svg
              className="w-3 h-3 md:w-4 md:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <span>재고조사</span>
          </button>
        </div>

        {inventory.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            현재 재고가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-accent-soft/30">
                <tr>
                  <th className="hidden md:table-cell px-6 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    거래처
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    <button
                      onClick={handleCfnSortToggle}
                      className="flex flex-col items-start hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-1 -m-1"
                      title={cfnSortType === "default" ? "숫자 정렬로 변경" : "기본 정렬로 변경"}
                    >
                      <span>CFN</span>
                      <span className="text-xs text-text-secondary lowercase font-normal">
                        {cfnSortType === "default" ? "diameter" : "length"}
                      </span>
                    </button>
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    LOT
                  </th>
                  <th className="hidden md:table-cell px-6 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    UBD
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    수량
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {inventory.map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-accent-soft/20 transition-colors"
                  >
                    <td className="hidden md:table-cell px-6 py-2 whitespace-nowrap text-sm text-primary">
                      {item.client_name}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-primary">
                      {item.cfn}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-text-secondary">
                      {item.lot_number}
                    </td>
                    <td className="hidden md:table-cell px-6 py-2 whitespace-nowrap text-sm text-text-secondary">
                      {item.ubd_date
                        ? new Date(item.ubd_date).toLocaleDateString("ko-KR")
                        : "-"}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-primary">
                      {item.quantity.toLocaleString()}개
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
