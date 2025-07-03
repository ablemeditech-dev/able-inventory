"use client";

import React, { useState, useEffect } from "react";
import BaseModal from "./BaseModal";
import { supabase } from "../../../lib/supabase";

interface ExchangeMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Location {
  id: string;
  name: string;
  type: "hospital" | "warehouse";
}

interface InventoryItem {
  id: string;
  product_id: string;
  cfn: string;
  description?: string;
  lot_number: string;
  ubd_date: string;
  quantity: number;
  client_name: string;
}

interface SelectedItemWithQuantity {
  id: string;
  exchangeQuantity: number;
}

export default function ExchangeMethodModal({
  isOpen,
  onClose,
}: ExchangeMethodModalProps) {
  const [step, setStep] = useState(1);
  const [exchangeDate, setExchangeDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedItemsWithQuantity, setSelectedItemsWithQuantity] = useState<Map<string, number>>(new Map());
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // 창고/병원 목록 불러오기
  useEffect(() => {
    if (isOpen) {
      fetchLocationsWithInventory();
    }
  }, [isOpen]);

  // 선택된 창고의 재고 불러오기
  useEffect(() => {
    if (selectedLocation) {
      fetchInventoryByLocation(selectedLocation);
    } else {
      setInventoryItems([]);
    }
    setSelectedItems(new Set());
  }, [selectedLocation]);

  const fetchLocationsWithInventory = async () => {
    try {
      setLoadingLocations(true);

      // 병원 목록과 ABLE 창고 정보를 병렬로 가져오기
      const [hospitalsResult, locationsResult] = await Promise.all([
        supabase
          .from("hospitals")
          .select("id, hospital_name")
          .order("hospital_name"),
        supabase
          .from("locations")
          .select("id, location_name")
          .order("location_name")
      ]);

      const locationsList: Location[] = [];
      const addedIds = new Set<string>(); // 중복 방지를 위한 Set

      // ABLE 중앙창고 추가 (하드코딩된 ID 사용)
      const ableWarehouseId = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";
      locationsList.push({
        id: ableWarehouseId,
        name: "ABLE 중앙창고",
        type: "warehouse"
      });
      addedIds.add(ableWarehouseId);

      // 병원 목록 추가
      if (hospitalsResult.data) {
        hospitalsResult.data.forEach(hospital => {
          if (!addedIds.has(hospital.id)) {
            locationsList.push({
              id: hospital.id,
              name: hospital.hospital_name,
              type: "hospital"
            });
            addedIds.add(hospital.id);
          }
        });
      }

      // 기타 창고 목록 추가 (이미 추가된 ID는 제외)
      if (locationsResult.data) {
        locationsResult.data.forEach(location => {
          if (!addedIds.has(location.id)) {
            locationsList.push({
              id: location.id,
              name: location.location_name,
              type: "warehouse"
            });
            addedIds.add(location.id);
          }
        });
      }

      setLocations(locationsList);

      // 각 창고의 재고 확인하여 재고가 있는 창고만 필터링
      const locationsWithInventory = await checkInventoryForLocations(locationsList);
      setAvailableLocations(locationsWithInventory);
    } catch (error) {
      console.error("창고/병원 목록 조회 실패:", error);
      setLocations([]);
      setAvailableLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  };

  const checkInventoryForLocations = async (locationsList: Location[]): Promise<Location[]> => {
    const locationsWithInventory: Location[] = [];

    for (const location of locationsList) {
      try {
        // 각 창고의 모든 재고 이동 기록 조회
        const { data: movements, error } = await supabase
          .from("stock_movements")
          .select("product_id, quantity, from_location_id, to_location_id")
          .or(`from_location_id.eq.${location.id},to_location_id.eq.${location.id}`);

        if (!error && movements && movements.length > 0) {
          // 정확한 재고 계산
          let hasInventory = false;
          const inventoryMap = new Map<string, number>();

          movements.forEach(movement => {
            const key = movement.product_id;
            if (!inventoryMap.has(key)) {
              inventoryMap.set(key, 0);
            }
            
            if (movement.to_location_id === location.id) {
              inventoryMap.set(key, inventoryMap.get(key)! + (movement.quantity || 0));
            } else if (movement.from_location_id === location.id) {
              inventoryMap.set(key, inventoryMap.get(key)! - (movement.quantity || 0));
            }
          });

          // 하나라도 양수인 재고가 있으면 재고가 있는 것으로 판단
          for (const quantity of inventoryMap.values()) {
            if (quantity > 0) {
              hasInventory = true;
              break;
            }
          }

          if (hasInventory) {
            locationsWithInventory.push(location);
          }
        }
      } catch (error) {
        console.error(`${location.name} 재고 확인 실패:`, error);
        // 에러가 발생해도 해당 창고는 포함시킴 (안전장치)
        locationsWithInventory.push(location);
      }
    }

    return locationsWithInventory;
  };

  const fetchInventoryByLocation = async (locationId: string) => {
    try {
      setLoadingInventory(true);

      // 해당 위치의 입고/출고 이력 조회
      const { data: movements, error: movementsError } = await supabase
        .from("stock_movements")
        .select(`
          product_id,
          lot_number,
          ubd_date,
          quantity,
          from_location_id,
          to_location_id
        `)
        .or(`from_location_id.eq.${locationId},to_location_id.eq.${locationId}`)
        .order("created_at", { ascending: false });

      if (movementsError) {
        throw movementsError;
      }

      if (!movements || movements.length === 0) {
        setInventoryItems([]);
        return;
      }

      // 제품 ID 목록 추출
      const productIds = [...new Set(movements.map(m => m.product_id).filter(Boolean))];

      if (productIds.length === 0) {
        setInventoryItems([]);
        return;
      }

      // 제품 정보 조회
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, cfn, description, client_id")
        .in("id", productIds);

      if (productsError) {
        throw productsError;
      }

      // 거래처 정보 조회
      const clientIds = [...new Set(products?.map(p => p.client_id).filter(Boolean))];
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
      const productMap = new Map(products?.map(p => [p.id, p]) || []);
      const clientMap = new Map(clients.map(c => [c.id, c]));

      // 재고 계산
      const inventoryMap = new Map<string, InventoryItem>();

      movements.forEach(movement => {
        const product = productMap.get(movement.product_id);
        if (!product) return;

        const client = clientMap.get(product.client_id);
        const key = `${product.cfn}-${movement.lot_number}-${movement.ubd_date}`;

        if (!inventoryMap.has(key)) {
          inventoryMap.set(key, {
            id: key,
            product_id: movement.product_id,
            cfn: product.cfn || "",
            description: product.description || "",
            lot_number: movement.lot_number || "",
            ubd_date: movement.ubd_date || "",
            quantity: 0,
            client_name: client?.company_name || "",
          });
        }

        const item = inventoryMap.get(key)!;

        // 해당 위치로 들어오는 경우 (+), 해당 위치에서 나가는 경우 (-)
        if (movement.to_location_id === locationId) {
          item.quantity += movement.quantity || 0;
        } else if (movement.from_location_id === locationId) {
          item.quantity -= movement.quantity || 0;
        }
      });

      // 수량이 0보다 큰 항목만 필터링하고 정렬
      const currentInventory = Array.from(inventoryMap.values())
        .filter(item => item.quantity > 0)
        .sort((a, b) => {
          if (a.cfn !== b.cfn) return a.cfn.localeCompare(b.cfn);
          if (a.lot_number !== b.lot_number) return a.lot_number.localeCompare(b.lot_number);
          return a.ubd_date.localeCompare(b.ubd_date);
        });

      setInventoryItems(currentInventory);
    } catch (error) {
      console.error("재고 조회 실패:", error);
      setInventoryItems([]);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId);
  };

  const handleItemToggle = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    const newQuantities = new Map(selectedItemsWithQuantity);
    
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
      newQuantities.delete(itemId);
    } else {
      newSelected.add(itemId);
      // 기본값으로 1개 설정
      newQuantities.set(itemId, 1);
    }
    
    setSelectedItems(newSelected);
    setSelectedItemsWithQuantity(newQuantities);
  };

  const handleQuantityChange = (itemId: string, quantity: number, maxQuantity: number) => {
    const newQuantities = new Map(selectedItemsWithQuantity);
    
    // 최소 1개, 최대 현재 재고 수량으로 제한
    const validQuantity = Math.max(1, Math.min(quantity, maxQuantity));
    newQuantities.set(itemId, validQuantity);
    
    setSelectedItemsWithQuantity(newQuantities);
  };

  const handleNext = () => {
    if (selectedItems.size > 0) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleClose = () => {
    setStep(1);
    setSelectedLocation("");
    setSelectedItems(new Set());
    setSelectedItemsWithQuantity(new Map());
    setInventoryItems([]);
    onClose();
  };

  const getSelectedItemsData = () => {
    return inventoryItems
      .filter(item => selectedItems.has(item.id))
      .map(item => ({
        ...item,
        exchangeQuantity: selectedItemsWithQuantity.get(item.id) || 1
      }));
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 1 ? "신규 교환 등록" : "교환 상세 설정"}
      size="xl"
    >
      {step === 1 ? (
        <div className="space-y-6">
          {/* 교환일자 */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              교환일자
            </label>
            <input
              type="date"
              value={exchangeDate}
              onChange={(e) => setExchangeDate(e.target.value)}
              className="w-full px-3 py-2 border border-accent-soft rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-black bg-white"
            />
          </div>

          {/* From 창고 선택 */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              From (교환할 제품이 있는 창고)
            </label>
            {loadingLocations ? (
              <div className="w-full px-3 py-2 border border-accent-soft rounded-md bg-gray-50 text-text-secondary">
                창고 목록을 불러오는 중...
              </div>
            ) : (
              <select
                value={selectedLocation}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full px-3 py-2 border border-accent-soft rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-black bg-white"
              >
                <option value="">창고를 선택하세요</option>
                {availableLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 재고 목록 및 체크박스 */}
          {selectedLocation && (
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                교환할 제품 선택 ({selectedItems.size}개 선택됨)
              </label>
              
              {loadingInventory ? (
                <div className="border border-accent-soft rounded-md p-8 text-center">
                  <div className="text-text-secondary">재고를 불러오는 중...</div>
                </div>
              ) : inventoryItems.length > 0 ? (
                <div className="border border-accent-soft rounded-md max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-accent-light sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedItems.size === inventoryItems.length && inventoryItems.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const allItemIds = inventoryItems.map(item => item.id);
                                setSelectedItems(new Set(allItemIds));
                                // 모든 아이템에 기본 수량 1 설정
                                const newQuantities = new Map();
                                inventoryItems.forEach(item => {
                                  newQuantities.set(item.id, 1);
                                });
                                setSelectedItemsWithQuantity(newQuantities);
                              } else {
                                setSelectedItems(new Set());
                                setSelectedItemsWithQuantity(new Map());
                              }
                            }}
                            className="rounded border-accent-soft focus:ring-primary"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">
                          제품코드
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">
                          제품명
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">
                          LOT
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">
                          UBD
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">
                          재고수량
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">
                          교환수량
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">
                          거래처
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-accent-light">
                      {inventoryItems.map((item) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-accent-light cursor-pointer ${
                            selectedItems.has(item.id) ? "bg-blue-50" : ""
                          }`}
                          onClick={() => handleItemToggle(item.id)}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={() => handleItemToggle(item.id)}
                              className="rounded border-accent-soft focus:ring-primary"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-primary">
                            {item.cfn}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {item.description || item.cfn}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {item.lot_number}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {item.ubd_date ? new Date(item.ubd_date).toLocaleDateString("ko-KR") : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {item.quantity}개
                          </td>
                          <td className="px-4 py-3">
                            {selectedItems.has(item.id) ? (
                              <input
                                type="number"
                                min="1"
                                max={item.quantity}
                                value={selectedItemsWithQuantity.get(item.id) || 1}
                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1, item.quantity)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-20 px-2 py-1 border border-accent-soft rounded text-black text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            ) : (
                              <span className="text-text-secondary text-sm">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {item.client_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 border border-accent-soft rounded-md">
                  <div className="text-text-secondary">
                    선택한 창고에 재고가 없습니다.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-accent-soft rounded-md text-text-secondary hover:bg-accent-light transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleNext}
              disabled={selectedItems.size === 0}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음 단계
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 선택된 제품 요약 */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">
              선택된 제품 ({selectedItems.size}개)
            </h3>
            <div className="border border-accent-soft rounded-md">
              <table className="w-full">
                <thead className="bg-accent-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">
                      제품코드
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">
                      제품명
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">
                      LOT
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">
                      교환수량
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-accent-light">
                  {getSelectedItemsData().map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm font-medium text-primary">
                        {item.cfn}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {item.description || item.cfn}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {item.lot_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {item.exchangeQuantity}개
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 다음 단계 옵션 */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">
              교환 처리 방법 선택
            </h3>
            <div className="space-y-3">
              <div className="p-4 border border-accent-soft rounded-md hover:border-primary hover:bg-accent-light transition-all cursor-pointer">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="exchange-method"
                    id="new-product"
                    className="text-primary focus:ring-primary"
                  />
                  <label htmlFor="new-product" className="cursor-pointer">
                    <div className="font-medium text-primary">새로운 제품으로 교환</div>
                    <div className="text-sm text-text-secondary">
                      새로운 배치의 제품을 입력하여 교환합니다
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="p-4 border border-accent-soft rounded-md hover:border-primary hover:bg-accent-light transition-all cursor-pointer">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="exchange-method"
                    id="recall-only"
                    className="text-primary focus:ring-primary"
                  />
                  <label htmlFor="recall-only" className="cursor-pointer">
                    <div className="font-medium text-primary">회수만 진행</div>
                    <div className="text-sm text-text-secondary">
                      제품을 회수만 하고 새로운 제품은 나중에 배송합니다
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-between pt-4">
            <button
              onClick={handleBack}
              className="px-4 py-2 border border-accent-soft rounded-md text-text-secondary hover:bg-accent-light transition-colors"
            >
              이전 단계
            </button>
            <div className="space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-accent-soft rounded-md text-text-secondary hover:bg-accent-light transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  // 교환 등록 로직 구현 예정
                  alert("교환이 등록되었습니다!");
                  handleClose();
                }}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-accent-soft transition-colors"
              >
                교환 등록
              </button>
            </div>
          </div>
        </div>
      )}
    </BaseModal>
  );
} 