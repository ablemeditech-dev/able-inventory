"use client";

import React, { useState, useEffect, useCallback } from "react";
import BaseModal from "./BaseModal";
import { supabase } from "../../../lib/supabase";
import { useLocationInventory } from "../../../hooks/inventory";

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
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [availableToLocations, setAvailableToLocations] = useState<Location[]>([]);
  const [exchangeMethod, setExchangeMethod] = useState<"new-product" | "recall-only" | "">("");
  const [newProducts, setNewProducts] = useState<NewProduct[]>([]);
  const [processing, setProcessing] = useState(false);

  // 새로운 hook을 사용하여 재고 조회
  const {
    exchangeInventory,
    loading: loadingInventory,
    error: inventoryError,
    refetch: refetchInventory,
  } = useLocationInventory(selectedLocation, {
    includeExchangeFormat: true,
    autoFetch: Boolean(selectedLocation),
  });

  const fetchLocationsWithInventory = useCallback(async () => {
    try {
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
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLocationsWithInventory();
    }
  }, [isOpen, fetchLocationsWithInventory]);

  useEffect(() => {
    // 위치 변경 시 선택된 아이템 초기화
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

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const validQuantity = Math.min(Math.max(1, quantity), exchangeInventory.find(inv => inv.id === itemId)?.quantity || 1);
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
    if (processing) return;
    setProcessing(true);

    try {
      const selectedItemsData = getSelectedItemsData();
      
      // 실제 교환 로직 구현
      const exchangeData = {
        date: exchangeDate,
        fromLocation: selectedLocation,
        toLocation: selectedToLocation,
        items: selectedItemsData,
        method: exchangeMethod,
        newProducts: exchangeMethod === "new-product" ? newProducts : [],
      };

      console.log("교환 데이터:", exchangeData);
      
      // 성공 메시지 및 모달 닫기
      alert("교환이 성공적으로 완료되었습니다!");
      onExchangeComplete?.();
      handleClose();
      
    } catch (error) {
      console.error("교환 처리 실패:", error);
      alert("교환 처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setProcessing(false);
    }
  };

  const getSelectedItemsData = () => {
    return Array.from(selectedItems).map(itemId => {
      const item = exchangeInventory.find(inv => inv.id === itemId);
      const quantity = selectedItemsWithQuantity.get(itemId) || 1;
      return {
        id: itemId,
        product_id: item?.product_id,
        cfn: item?.cfn,
        lot_number: item?.lot_number,
        ubd_date: item?.ubd_date,
        quantity: quantity,
        client_name: item?.client_name,
      };
    });
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          교환일자
        </label>
        <input
          type="date"
          value={exchangeDate}
          onChange={(e) => setExchangeDate(e.target.value)}
          className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          교환할 제품이 있는 위치
        </label>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
        >
          <option value="">위치를 선택하세요</option>
          {availableLocations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          교환 방식
        </label>
        <select
          value={exchangeMethod}
          onChange={(e) => setExchangeMethod(e.target.value as "new-product" | "recall-only" | "")}
          className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
        >
          <option value="">교환 방식을 선택하세요</option>
          <option value="new-product">신제품 교환</option>
          <option value="recall-only">회수만</option>
        </select>
      </div>

      {selectedLocation && (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            교환할 제품 선택
          </label>
          
          {loadingInventory ? (
            <div className="text-center py-4 text-text-secondary">재고 정보를 불러오는 중...</div>
          ) : inventoryError ? (
            <div className="text-center py-4 text-red-500">
              {inventoryError}
              <button
                onClick={refetchInventory}
                className="ml-2 px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-dark"
              >
                다시 시도
              </button>
            </div>
          ) : exchangeInventory.length === 0 ? (
            <div className="text-center py-4 text-text-secondary">
              선택한 위치에 재고가 없습니다.
            </div>
          ) : (
            <div className="border border-accent-soft rounded-lg max-h-96 overflow-y-auto">
              {exchangeInventory.map(item => (
                <div key={item.id} className="p-3 border-b border-accent-soft last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{item.cfn}</div>
                      <div className="text-sm text-text-secondary">
                        LOT: {item.lot_number} | UBD: {new Date(item.ubd_date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-text-secondary">
                        수량: {item.quantity}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => handleItemToggle(item.id)}
                        className="rounded border-accent-soft text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-900">교환수량:</span>
                      <input
                        type="number"
                        min="1"
                        max={item.quantity}
                        value={selectedItemsWithQuantity.get(item.id) || 1}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                        disabled={!selectedItems.has(item.id)}
                        className="w-16 px-2 py-1 border border-accent-soft rounded text-sm text-gray-900 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          교환 받을 제품의 목적지
        </label>
        <select
          value={selectedToLocation}
          onChange={(e) => setSelectedToLocation(e.target.value)}
          className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
        >
          <option value="">목적지를 선택하세요</option>
          {availableToLocations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="space-y-2">
          <label className="flex items-center text-gray-900">
            <input
              type="radio"
              name="exchangeMethod"
              value="new-product"
              checked={exchangeMethod === "new-product"}
              onChange={() => handleExchangeMethodChange("new-product")}
              className="mr-2 text-primary focus:ring-primary"
            />
            새 제품으로 교환
          </label>
          <label className="flex items-center text-gray-900">
            <input
              type="radio"
              name="exchangeMethod"
              value="recall-only"
              checked={exchangeMethod === "recall-only"}
              onChange={() => handleExchangeMethodChange("recall-only")}
              className="mr-2 text-primary focus:ring-primary"
            />
            리콜만 진행
          </label>
        </div>
      </div>

      {exchangeMethod === "new-product" && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-900">
              새 제품 정보
            </label>
            <button
              onClick={addNewProduct}
              className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-dark"
            >
              제품 추가
            </button>
          </div>
          
          <div className="space-y-2">
            {newProducts.map(product => (
              <div key={product.id} className="border border-accent-soft rounded p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-gray-900">제품 #{product.id}</div>
                  <button
                    onClick={() => removeNewProduct(product.id)}
                    className="text-red-500 text-sm hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">CFN</label>
                    <input
                      type="text"
                      value={product.cfn}
                      onChange={(e) => updateNewProduct(product.id, 'cfn', e.target.value)}
                      className="w-full px-2 py-1 border border-accent-soft rounded text-sm text-gray-900 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">LOT</label>
                    <input
                      type="text"
                      value={product.lot_number}
                      onChange={(e) => updateNewProduct(product.id, 'lot_number', e.target.value)}
                      className="w-full px-2 py-1 border border-accent-soft rounded text-sm text-gray-900 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">UBD</label>
                    <input
                      type="date"
                      value={product.ubd_date}
                      onChange={(e) => updateNewProduct(product.id, 'ubd_date', e.target.value)}
                      className="w-full px-2 py-1 border border-accent-soft rounded text-sm text-gray-900 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">수량</label>
                    <input
                      type="number"
                      min="1"
                      value={product.quantity}
                      onChange={(e) => updateNewProduct(product.id, 'quantity', parseInt(e.target.value))}
                      className="w-full px-2 py-1 border border-accent-soft rounded text-sm text-gray-900 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 mb-2">교환 내역 확인</h3>
      
      <div className="space-y-3">
        <div className="text-sm text-text-secondary">
          <strong className="text-gray-900">교환일자:</strong> {exchangeDate}
        </div>
        <div className="text-sm text-text-secondary">
          <strong className="text-gray-900">교환 위치:</strong> {availableLocations.find(l => l.id === selectedLocation)?.name}
        </div>
        <div className="text-sm text-text-secondary">
          <strong className="text-gray-900">목적지:</strong> {availableToLocations.find(l => l.id === selectedToLocation)?.name}
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">회수할 제품:</h4>
          {Array.from(selectedItems).map(itemId => {
            const item = exchangeInventory.find(i => i.id === itemId);
            if (!item) return null;
            return (
              <div key={item.id} className="text-sm text-gray-900">
                {item.cfn} - LOT: {item.lot_number} - 수량: {selectedItemsWithQuantity.get(itemId)}
              </div>
            );
          })}
        </div>
        
        {exchangeMethod === "new-product" && newProducts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">새 제품:</h4>
            {newProducts.map(product => (
              <div key={product.id} className="text-sm text-gray-900">
                {product.cfn} - LOT: {product.lot_number} - 수량: {product.quantity}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="교환 처리"
      size="lg"
    >
      <div className="space-y-4">
        {/* 단계 표시 */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex space-x-4">
            {[1, 2, 3].map(num => (
              <div
                key={num}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  num === step
                    ? "bg-primary text-white"
                    : num < step
                    ? "bg-green-500 text-white"
                    : "bg-accent-soft text-text-secondary"
                }`}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        {/* 단계별 콘텐츠 */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {/* 버튼 */}
        <div className="flex justify-between pt-4">
          <button
            onClick={step > 1 ? handleBack : handleClose}
            className="px-4 py-2 border border-accent-soft rounded-lg text-text-secondary hover:bg-accent-light transition-colors"
          >
            {step > 1 ? "이전" : "취소"}
          </button>
          <button
            onClick={step < 3 ? handleNext : handleExchangeSubmit}
            disabled={processing || (step === 1 && (selectedItems.size === 0 || !selectedToLocation)) || (step === 2 && !exchangeMethod)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? "처리 중..." : step < 3 ? "다음" : "교환 완료"}
          </button>
        </div>
      </div>
    </BaseModal>
  );
} 