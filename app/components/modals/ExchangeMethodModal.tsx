"use client";

import React, { useState, useEffect, useCallback } from "react";
import BaseModal from "./BaseModal";
import { supabase } from "../../../lib/supabase";

interface ExchangeMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExchangeComplete?: () => void;
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

interface NewProduct {
  id: string;
  cfn: string;
  lot_number: string;
  ubd_date: string;
  quantity: number;
}

export default function ExchangeMethodModal({
  isOpen,
  onClose,
  onExchangeComplete,
}: ExchangeMethodModalProps) {
  const [step, setStep] = useState(1);
  const [exchangeDate, setExchangeDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedToLocation, setSelectedToLocation] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedItemsWithQuantity, setSelectedItemsWithQuantity] = useState<Map<string, number>>(new Map());
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [availableToLocations, setAvailableToLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [exchangeMethod, setExchangeMethod] = useState<"new-product" | "recall-only" | "">("");
  const [newProducts, setNewProducts] = useState<NewProduct[]>([]);
  const [processing, setProcessing] = useState(false);

  const fetchLocationsWithInventory = useCallback(async () => {
    try {
      setLoadingLocations(true);
      const [hospitalsResult, locationsResult] = await Promise.all([
        supabase.from("hospitals").select("id, hospital_name").order("hospital_name"),
        supabase.from("locations").select("id, location_name").order("location_name")
      ]);

      const locationsList: Location[] = [];
      const addedIds = new Set<string>();

      const ableWarehouseId = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";
      locationsList.push({ id: ableWarehouseId, name: "ABLE 중앙창고", type: "warehouse" });
      addedIds.add(ableWarehouseId);

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

      const locationsWithInventory = await checkInventoryForLocations(locationsList);
      setAvailableLocations(locationsWithInventory);
      // To 위치는 모든 위치에서 선택 가능
      setAvailableToLocations(locationsList);
    } catch (error) {
      console.error("창고/병원 목록 조회 실패:", error);
      setAvailableLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLocationsWithInventory();
    }
  }, [isOpen, fetchLocationsWithInventory]);

  useEffect(() => {
    if (selectedLocation) {
      fetchInventoryByLocation(selectedLocation);
    } else {
      setInventoryItems([]);
    }
    setSelectedItems(new Set());
    setSelectedItemsWithQuantity(new Map());
  }, [selectedLocation]);

  const checkInventoryForLocations = async (locationsList: Location[]): Promise<Location[]> => {
    const locationsWithInventory: Location[] = [];

    for (const location of locationsList) {
      try {
        const { data: movements, error } = await supabase
          .from("stock_movements")
          .select("product_id, quantity, from_location_id, to_location_id")
          .or(`from_location_id.eq.${location.id},to_location_id.eq.${location.id}`);

        if (!error && movements && movements.length > 0) {
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
        locationsWithInventory.push(location);
      }
    }

    return locationsWithInventory;
  };

  const fetchInventoryByLocation = async (locationId: string) => {
    setLoadingInventory(true);
    try {
      console.log("재고 조회 시작:", locationId);
      
      // 1. 재고 이동 기록 조회
      const { data: movements, error: movementsError } = await supabase
        .from("stock_movements")
        .select(`
          product_id,
          quantity,
          from_location_id,
          to_location_id,
          lot_number,
          ubd_date
        `)
        .or(`from_location_id.eq.${locationId},to_location_id.eq.${locationId}`);

      console.log("재고 이동 기록:", movements?.length || 0, "개");
      if (movementsError) {
        console.error("재고 이동 기록 조회 실패:", movementsError);
        throw movementsError;
      }

      if (!movements || movements.length === 0) {
        console.log("재고 이동 기록이 없음");
        setInventoryItems([]);
        return;
      }

      // 2. 제품 ID 목록 추출
      const productIds = [...new Set(movements.map(m => m.product_id).filter(Boolean))];
      console.log("제품 ID 목록:", productIds.length, "개");

      if (productIds.length === 0) {
        console.log("제품 ID가 없음");
        setInventoryItems([]);
        return;
      }

      // 3. 제품 정보 조회
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, cfn, description, client_id")
        .in("id", productIds);

      console.log("제품 정보:", products?.length || 0, "개");
      if (productsError) {
        console.error("제품 정보 조회 실패:", productsError);
        throw productsError;
      }

      // 4. 거래처 정보 조회
      const clientIds = [...new Set(products?.map(p => p.client_id).filter(Boolean))];
      console.log("거래처 ID 목록:", clientIds.length, "개");
      
      let clients: { id: string; company_name: string }[] = [];
      
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, company_name")
          .in("id", clientIds);

        console.log("거래처 정보:", clientsData?.length || 0, "개");
        if (clientsError) {
          console.error("거래처 정보 조회 실패:", clientsError);
          // 거래처 정보 조회 실패는 치명적이지 않으므로 계속 진행
        } else if (clientsData) {
          clients = clientsData;
        }
      }

      // 5. 맵으로 변환
      const productMap = new Map(products?.map(p => [p.id, p]) || []);
      const clientMap = new Map(clients.map(c => [c.id, c]));

      // 6. 재고 계산
      const inventoryMap = new Map<string, {
        product_id: string;
        cfn: string;
        description?: string;
        lot_number: string;
        ubd_date: string;
        quantity: number;
        client_name: string;
      }>();

      movements.forEach(movement => {
        const product = productMap.get(movement.product_id);
        if (!product) {
          console.warn("제품을 찾을 수 없음:", movement.product_id);
          return;
        }

        const client = clientMap.get(product.client_id);
        const key = `${movement.product_id}-${movement.lot_number}-${movement.ubd_date}`;
        
        if (!inventoryMap.has(key)) {
          inventoryMap.set(key, {
            product_id: movement.product_id,
            cfn: product.cfn || "",
            description: product.description,
            lot_number: movement.lot_number || "",
            ubd_date: movement.ubd_date || "",
            quantity: 0,
            client_name: client?.company_name || ""
          });
        }

        const item = inventoryMap.get(key)!;
        if (movement.to_location_id === locationId) {
          item.quantity += movement.quantity || 0;
        } else if (movement.from_location_id === locationId) {
          item.quantity -= movement.quantity || 0;
        }
      });

      // 7. 양수인 재고만 필터링하고 정렬
      const inventoryItems = Array.from(inventoryMap.entries())
        .filter(([, item]) => item.quantity > 0)
        .map(([key, item]) => ({
          id: key,
          ...item
        }))
        .sort((a, b) => {
          if (a.cfn !== b.cfn) return a.cfn.localeCompare(b.cfn);
          if (a.lot_number !== b.lot_number) return a.lot_number.localeCompare(b.lot_number);
          return a.ubd_date.localeCompare(b.ubd_date);
        });

      console.log("최종 재고 목록:", inventoryItems.length, "개");
      setInventoryItems(inventoryItems);
    } catch (error) {
      console.error("재고 조회 실패:", error);
      console.error("에러 상세:", JSON.stringify(error, null, 2));
      setInventoryItems([]);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId);
  };

  const handleItemToggle = (itemId: string) => {
    const newSelectedItems = new Set(selectedItems);
    const newQuantities = new Map(selectedItemsWithQuantity);

    if (newSelectedItems.has(itemId)) {
      newSelectedItems.delete(itemId);
      newQuantities.delete(itemId);
    } else {
      newSelectedItems.add(itemId);
      newQuantities.set(itemId, 1);
    }

    setSelectedItems(newSelectedItems);
    setSelectedItemsWithQuantity(newQuantities);
  };

  const handleQuantityChange = (itemId: string, quantity: number, maxQuantity: number) => {
    const validQuantity = Math.min(Math.max(1, quantity), maxQuantity);
    const newQuantities = new Map(selectedItemsWithQuantity);
    newQuantities.set(itemId, validQuantity);
    setSelectedItemsWithQuantity(newQuantities);
  };

  const handleNext = () => {
    if (step === 1) {
      if (selectedItems.size === 0) {
        alert("교환할 제품을 선택해주세요.");
        return;
      }
      if (!selectedToLocation) {
        alert("교환받을 제품이 들어갈 위치를 선택해주세요.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (exchangeMethod === "new-product") {
        setStep(3);
      } else {
        handleExchangeSubmit();
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleClose = () => {
    setStep(1);
    setExchangeDate(new Date().toISOString().split("T")[0]);
    setSelectedLocation("");
    setSelectedToLocation("");
    setSelectedItems(new Set());
    setSelectedItemsWithQuantity(new Map());
    setInventoryItems([]);
    setExchangeMethod("");
    setNewProducts([]);
    setProcessing(false);
    onClose();
  };

  const addNewProduct = () => {
    const newProduct: NewProduct = {
      id: Date.now().toString(),
      cfn: "",
      lot_number: "",
      ubd_date: "",
      quantity: 1,
    };
    setNewProducts([...newProducts, newProduct]);
  };

  const removeNewProduct = (productId: string) => {
    setNewProducts(newProducts.filter(p => p.id !== productId));
  };

  const updateNewProduct = (productId: string, field: keyof NewProduct, value: string | number) => {
    setNewProducts(newProducts.map(p => 
      p.id === productId ? { ...p, [field]: value } : p
    ));
  };

  const handleExchangeMethodChange = (method: "new-product" | "recall-only") => {
    setExchangeMethod(method);
  };

  const handleExchangeSubmit = async () => {
    try {
      setProcessing(true);
      const ABLE_WAREHOUSE_ID = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";
      const selectedItemsData = getSelectedItemsData();

      const outboundMovements = [];
      for (const item of selectedItemsData) {
        const outboundRecord = {
          product_id: item.product_id,
          movement_type: "out",
          movement_reason: "exchange",
          from_location_id: selectedToLocation,  // 실제 거래처에서 회수
          to_location_id: ABLE_WAREHOUSE_ID,     // ABLE 중앙창고로
          quantity: item.exchangeQuantity,
          lot_number: item.lot_number,
          ubd_date: item.ubd_date,
          inbound_date: exchangeDate,
          notes: `교환 회수 - ${item.cfn}`,
        };
        
        console.log("회수 기록 생성:", {
          item_cfn: item.cfn,
          from_location_id: selectedToLocation,
          to_location_id: ABLE_WAREHOUSE_ID,
          movement_type: "out"
        });
        
        outboundMovements.push(outboundRecord);
      }

      const { error: outError } = await supabase
        .from("stock_movements")
        .insert(outboundMovements);

      if (outError) throw outError;

      if (exchangeMethod === "new-product" && newProducts.length > 0) {
        const inboundMovements = [];
        
        for (const newProduct of newProducts) {
          if (!newProduct.cfn || !newProduct.lot_number || !newProduct.ubd_date || newProduct.quantity <= 0) {
            throw new Error("모든 새 제품 정보를 정확히 입력해주세요.");
          }

          const { data: productData, error: productError } = await supabase
            .from("products")
            .select("id")
            .eq("cfn", newProduct.cfn)
            .single();

          if (productError) {
            throw new Error(`제품 코드 ${newProduct.cfn}을 찾을 수 없습니다.`);
          }

          const inboundRecord = {
            product_id: productData.id,
            movement_type: "in",
            movement_reason: "exchange",
            from_location_id: ABLE_WAREHOUSE_ID,
            to_location_id: selectedToLocation,
            quantity: newProduct.quantity,
            lot_number: newProduct.lot_number,
            ubd_date: newProduct.ubd_date,
            inbound_date: exchangeDate,
            notes: `교환 입고 - ${newProduct.cfn}`,
          };
          
          console.log("교환 기록 생성:", {
            cfn: newProduct.cfn,
            from_location_id: ABLE_WAREHOUSE_ID,
            to_location_id: selectedToLocation,
            movement_type: "in"
          });
          
          inboundMovements.push(inboundRecord);
        }

        const { error: inError } = await supabase
          .from("stock_movements")
          .insert(inboundMovements);

        if (inError) throw inError;
      }

      alert(exchangeMethod === "new-product" ? "교환이 완료되었습니다!" : "회수가 완료되었습니다!");
      onExchangeComplete?.();
      handleClose();
    } catch (error) {
      console.error("교환 처리 오류:", error);
      alert(error instanceof Error ? error.message : "교환 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
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
      title={step === 1 ? "신규 교환 등록" : step === 2 ? "교환 방법 선택" : "교환 제품 설정"}
      size="xl"
    >
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">교환일자</label>
            <input
              type="date"
              value={exchangeDate}
              onChange={(e) => setExchangeDate(e.target.value)}
              className="w-full px-3 py-2 border border-accent-soft rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-black bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">From (교환할 제품이 있는 창고)</label>
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

          <div>
            <label className="block text-sm font-medium text-primary mb-2">To (교환받을 제품이 들어갈 창고)</label>
            {loadingLocations ? (
              <div className="w-full px-3 py-2 border border-accent-soft rounded-md bg-gray-50 text-text-secondary">
                창고 목록을 불러오는 중...
              </div>
            ) : (
              <select
                value={selectedToLocation}
                onChange={(e) => setSelectedToLocation(e.target.value)}
                className="w-full px-3 py-2 border border-accent-soft rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-black bg-white"
              >
                <option value="">창고를 선택하세요</option>
                {availableToLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            )}
          </div>

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
                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">제품코드</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">제품명</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">LOT</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">UBD</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">재고수량</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">교환수량</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">거래처</th>
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
                          <td className="px-4 py-3 text-sm font-medium text-primary">{item.cfn}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{item.description || item.cfn}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{item.lot_number}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {item.ubd_date ? new Date(item.ubd_date).toLocaleDateString("ko-KR") : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{item.quantity}개</td>
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
                          <td className="px-4 py-3 text-sm text-text-secondary">{item.client_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 border border-accent-soft rounded-md">
                  <div className="text-text-secondary">선택한 창고에 재고가 없습니다.</div>
                </div>
              )}
            </div>
          )}

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
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">선택된 제품 ({selectedItems.size}개)</h3>
            <div className="border border-accent-soft rounded-md">
              <table className="w-full">
                <thead className="bg-accent-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">제품코드</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">제품명</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">LOT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">교환수량</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-accent-light">
                  {getSelectedItemsData().map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm font-medium text-primary">{item.cfn}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{item.description || item.cfn}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{item.lot_number}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{item.exchangeQuantity}개</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">교환 처리 방법 선택</h3>
            <div className="space-y-3">
              <div className="p-4 border border-accent-soft rounded-md hover:border-primary hover:bg-accent-light transition-all cursor-pointer">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="exchange-method"
                    id="new-product"
                    value="new-product"
                    checked={exchangeMethod === "new-product"}
                    onChange={(e) => handleExchangeMethodChange(e.target.value as "new-product")}
                    className="text-primary focus:ring-primary"
                  />
                  <label htmlFor="new-product" className="cursor-pointer">
                    <div className="font-medium text-primary">새로운 제품으로 교환</div>
                    <div className="text-sm text-text-secondary">새로운 배치의 제품을 입력하여 교환합니다</div>
                  </label>
                </div>
              </div>
              
              <div className="p-4 border border-accent-soft rounded-md hover:border-primary hover:bg-accent-light transition-all cursor-pointer">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="exchange-method"
                    id="recall-only"
                    value="recall-only"
                    checked={exchangeMethod === "recall-only"}
                    onChange={(e) => handleExchangeMethodChange(e.target.value as "recall-only")}
                    className="text-primary focus:ring-primary"
                  />
                  <label htmlFor="recall-only" className="cursor-pointer">
                    <div className="font-medium text-primary">회수만 진행</div>
                    <div className="text-sm text-text-secondary">제품을 회수만 하고 새로운 제품은 나중에 배송합니다</div>
                  </label>
                </div>
              </div>
            </div>
          </div>

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
                onClick={handleNext}
                disabled={!exchangeMethod || processing}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? "처리 중..." : 
                 exchangeMethod === "new-product" ? "다음 단계" : 
                 exchangeMethod === "recall-only" ? "회수 등록" : "교환 방법 선택"}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">회수할 제품 ({selectedItems.size}개)</h3>
            <div className="border border-accent-soft rounded-md">
              <table className="w-full">
                <thead className="bg-red-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">제품코드</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">LOT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">UBD</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">수량</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-accent-light">
                  {getSelectedItemsData().map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.cfn}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.lot_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.ubd_date ? new Date(item.ubd_date).toLocaleDateString("ko-KR") : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.exchangeQuantity}개</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">교환받을 제품 ({newProducts.length}개)</h3>
              <button
                onClick={addNewProduct}
                className="px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-accent-soft transition-colors"
              >
                + 제품 추가
              </button>
            </div>
            
            {newProducts.length > 0 ? (
              <div className="border border-accent-soft rounded-md">
                <table className="w-full">
                  <thead className="bg-green-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase">CFN *</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase">수량 *</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase">LOT *</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase">UBD *</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-green-700 uppercase">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-accent-light">
                    {newProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-green-50">
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={product.cfn}
                            onChange={(e) => updateNewProduct(product.id, "cfn", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900"
                            placeholder="제품 코드 입력"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) => updateNewProduct(product.id, "quantity", parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={product.lot_number}
                            onChange={(e) => updateNewProduct(product.id, "lot_number", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900"
                            placeholder="LOT 번호 입력"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={product.ubd_date}
                            onChange={(e) => updateNewProduct(product.id, "ubd_date", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {newProducts.length > 1 && (
                            <button
                              onClick={() => removeNewProduct(product.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                              title="삭제"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 border border-accent-soft rounded-md">
                <div className="text-text-secondary mb-4">교환받을 제품을 추가해주세요</div>
                <button
                  onClick={addNewProduct}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-accent-soft transition-colors"
                >
                  첫 번째 제품 추가
                </button>
              </div>
            )}
          </div>

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
                onClick={handleExchangeSubmit}
                disabled={processing || newProducts.length === 0 || newProducts.some(p => !p.cfn || !p.lot_number || !p.ubd_date)}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? "교환 중..." : "교환 완료"}
              </button>
            </div>
          </div>
        </div>
      )}
    </BaseModal>
  );
} 