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

export default function AbleInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchAbleInventory();
  }, []);

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

      // 수량이 0보다 큰 항목만 필터링하고 정렬
      const currentInventory = Array.from(inventoryMap.values())
        .filter((item) => item.quantity > 0)
        .sort((a, b) => {
          if (a.cfn !== b.cfn) return a.cfn.localeCompare(b.cfn);
          if (a.lot_number !== b.lot_number)
            return a.lot_number.localeCompare(b.lot_number);
          return a.ubd_date.localeCompare(b.ubd_date);
        });

      setInventory(currentInventory);
    } catch (_err) {
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

  return (
    <div className="p-6">
      <div>
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold text-black">
            ABLE 중앙창고 재고 (총{" "}
            {inventory
              .reduce((sum, item) => sum + item.quantity, 0)
              .toLocaleString()}
            ea)
          </h2>
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
                    CFN
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
