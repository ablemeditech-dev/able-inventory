import { supabase } from '../lib/supabase';
import type {
  InventoryItem,
  StockMovement,
  Product,
  Client,
  Location,
  ProductMap,
  ClientMap,
  LocationMap,
  InventoryCalculationOptions,
  CFNInventoryItem,
  AvailableStock,
  LotInfo,
  UBDInventoryItem,
  ExchangeInventoryItem
} from '../types/inventory';

// ABLE 중앙창고 ID (상수로 관리)
export const ABLE_LOCATION_ID = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";

/**
 * 제품 정보를 조회하고 Map으로 변환
 */
export const buildProductMap = async (productIds?: string[]): Promise<ProductMap> => {
  try {
    let query = supabase.from("products").select("id, cfn, upn, description, client_id");
    
    if (productIds && productIds.length > 0) {
      query = query.in("id", productIds);
    }
    
    const { data: products, error } = await query;
    
    if (error) throw error;
    
    return new Map(products?.map((p) => [p.id, p]) || []);
  } catch (error) {
    console.error("제품 정보 조회 실패:", error);
    return new Map();
  }
};

/**
 * 거래처 정보를 조회하고 Map으로 변환
 */
export const buildClientMap = async (clientIds?: string[]): Promise<ClientMap> => {
  try {
    if (!clientIds || clientIds.length === 0) {
      return new Map();
    }
    
    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, company_name")
      .in("id", clientIds);
    
    if (error) throw error;
    
    return new Map(clients?.map((c) => [c.id, c]) || []);
  } catch (error) {
    console.error("거래처 정보 조회 실패:", error);
    return new Map();
  }
};

/**
 * 위치 정보를 조회하고 Map으로 변환
 */
export const buildLocationMap = async (locationIds?: string[]): Promise<LocationMap> => {
  try {
    if (!locationIds || locationIds.length === 0) {
      return new Map();
    }
    
    const { data: locations, error } = await supabase
      .from("locations")
      .select("*")
      .in("id", locationIds);
    
    if (error) throw error;
    
    return new Map(locations?.map((l) => [l.id, l]) || []);
  } catch (error) {
    console.error("위치 정보 조회 실패:", error);
    return new Map();
  }
};

/**
 * 특정 위치의 재고 이동 데이터 조회
 */
export const fetchStockMovements = async (locationId: string): Promise<StockMovement[]> => {
  try {
    const { data: movements, error } = await supabase
      .from("stock_movements")
      .select(`
        product_id,
        lot_number,
        ubd_date,
        quantity,
        movement_type,
        movement_reason,
        from_location_id,
        to_location_id,
        created_at,
        inbound_date
      `)
      .or(`from_location_id.eq.${locationId},to_location_id.eq.${locationId}`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    return movements || [];
  } catch (error) {
    console.error("재고 이동 데이터 조회 실패:", error);
    return [];
  }
};

/**
 * 핵심 재고 계산 함수
 */
export const calculateInventory = (
  movements: StockMovement[],
  locationId: string,
  productMap: ProductMap,
  clientMap: ClientMap,
  options: InventoryCalculationOptions = {}
): InventoryItem[] => {
  const {
    includeZeroQuantity = false,
    sortBy = 'cfn',
    filterPositiveOnly = true
  } = options;

  // 재고 계산용 맵
  const inventoryMap = new Map<string, InventoryItem>();

  movements.forEach((movement) => {
    const product = productMap.get(movement.product_id);
    if (!product || !product.cfn) return;

    const client = clientMap.get(product.client_id);
    const key = `${product.cfn}-${movement.lot_number}-${movement.ubd_date}`;

    if (!inventoryMap.has(key)) {
      inventoryMap.set(key, {
        cfn: product.cfn,
        lot_number: movement.lot_number || "",
        ubd_date: movement.ubd_date || "",
        quantity: 0,
        client_name: client?.company_name || "",
        product_id: movement.product_id,
        client_id: product.client_id,
        description: product.description
      });
    }

    const item = inventoryMap.get(key)!;

    // 해당 위치로 들어오는 경우 (+), 위치에서 나가는 경우 (-)
    if (movement.to_location_id === locationId) {
      item.quantity += movement.quantity || 0;
    } else if (movement.from_location_id === locationId) {
      item.quantity -= movement.quantity || 0;
    }
  });

  // 결과 필터링 및 정렬
  let result = Array.from(inventoryMap.values());
  
  if (filterPositiveOnly) {
    result = result.filter(item => item.quantity > 0);
  } else if (!includeZeroQuantity) {
    result = result.filter(item => item.quantity !== 0);
  }

  // 정렬
  result.sort((a, b) => {
    switch (sortBy) {
      case 'cfn':
        if (a.cfn !== b.cfn) return a.cfn.localeCompare(b.cfn);
        if (a.lot_number !== b.lot_number) return a.lot_number.localeCompare(b.lot_number);
        return a.ubd_date.localeCompare(b.ubd_date);
      case 'lot':
        if (a.lot_number !== b.lot_number) return a.lot_number.localeCompare(b.lot_number);
        if (a.cfn !== b.cfn) return a.cfn.localeCompare(b.cfn);
        return a.ubd_date.localeCompare(b.ubd_date);
      case 'ubd':
        if (a.ubd_date !== b.ubd_date) return a.ubd_date.localeCompare(b.ubd_date);
        if (a.cfn !== b.cfn) return a.cfn.localeCompare(b.cfn);
        return a.lot_number.localeCompare(b.lot_number);
      case 'quantity':
        return b.quantity - a.quantity; // 수량 많은 순
      default:
        return 0;
    }
  });

  return result;
};

/**
 * CFN별 집계 재고 계산 (오더 페이지용)
 */
export const calculateCFNInventory = (
  movements: StockMovement[],
  locationId: string,
  productMap: ProductMap,
  clientMap: ClientMap
): CFNInventoryItem[] => {
  const cfnInventoryMap = new Map<string, CFNInventoryItem>();

  // 모든 CFN에 대해 초기값 설정
  productMap.forEach((product) => {
    if (!product.cfn) return;
    
    const client = clientMap.get(product.client_id);
    const clientName = client?.company_name || "알 수 없음";

    cfnInventoryMap.set(product.cfn, {
      cfn: product.cfn,
      client_name: clientName,
      total_quantity: 0,
      product_id: product.id,
      client_id: product.client_id,
    });
  });

  // 재고 계산
  movements.forEach((movement) => {
    const product = productMap.get(movement.product_id);
    if (!product || !product.cfn) return;

    const item = cfnInventoryMap.get(product.cfn);
    if (!item) return;

    // 해당 위치로 들어오는 경우 (+), 위치에서 나가는 경우 (-)
    if (movement.to_location_id === locationId) {
      item.total_quantity += movement.quantity || 0;
    } else if (movement.from_location_id === locationId) {
      item.total_quantity -= movement.quantity || 0;
    }
  });

  return Array.from(cfnInventoryMap.values());
};

/**
 * 가용 재고 계산 (출고용)
 */
export const calculateAvailableStock = (
  movements: StockMovement[],
  locationId: string,
  productMap: ProductMap
): AvailableStock[] => {
  // 먼저 상세 재고 계산
  const detailedInventory = calculateInventory(movements, locationId, productMap, new Map());
  
  // CFN별로 합산
  const stockMap = new Map<string, number>();
  detailedInventory.forEach((item) => {
    const currentQuantity = stockMap.get(item.cfn) || 0;
    stockMap.set(item.cfn, currentQuantity + item.quantity);
  });

  // 가용 재고만 필터링하고 정렬
  const result: AvailableStock[] = [];
  stockMap.forEach((quantity, cfn) => {
    if (quantity > 0) {
      result.push({ cfn, total_quantity: quantity });
    }
  });

  result.sort((a, b) => a.cfn.localeCompare(b.cfn));
  return result;
};

/**
 * LOT별 가용 재고 계산
 */
export const calculateAvailableLots = (
  movements: StockMovement[],
  locationId: string,
  cfn: string,
  productMap: ProductMap
): LotInfo[] => {
  // 해당 CFN의 제품 찾기
  const product = Array.from(productMap.values()).find(p => p.cfn === cfn);
  if (!product) return [];

  // 해당 제품의 이동 기록 필터링
  const productMovements = movements.filter(m => m.product_id === product.id);
  
  // LOT별 재고 계산
  const lotMap = new Map<string, { ubd_date: string; quantity: number }>();

  productMovements.forEach((movement) => {
    const key = movement.lot_number || "";
    if (!key) return;

    if (!lotMap.has(key)) {
      lotMap.set(key, {
        ubd_date: movement.ubd_date || "",
        quantity: 0,
      });
    }

    const lot = lotMap.get(key)!;

    // 해당 위치로 들어오는 경우 (+), 위치에서 나가는 경우 (-)
    if (movement.to_location_id === locationId) {
      lot.quantity += movement.quantity || 0;
    } else if (movement.from_location_id === locationId) {
      lot.quantity -= movement.quantity || 0;
    }
  });

  // 가용 LOT만 필터링하고 정렬
  const result: LotInfo[] = [];
  lotMap.forEach((lot, lotNumber) => {
    if (lot.quantity > 0) {
      result.push({
        lot_number: lotNumber,
        ubd_date: lot.ubd_date,
        available_quantity: lot.quantity,
      });
    }
  });

  result.sort((a, b) => {
    if (a.ubd_date !== b.ubd_date) return a.ubd_date.localeCompare(b.ubd_date);
    return a.lot_number.localeCompare(b.lot_number);
  });

  return result;
};

/**
 * UBD 기반 재고 계산 (유통기한 관리용)
 */
export const calculateUBDInventory = (
  movements: StockMovement[],
  locationId: string,
  locationName: string,
  productMap: ProductMap
): UBDInventoryItem[] => {
  const inventory = calculateInventory(movements, locationId, productMap, new Map());
  const today = new Date();
  
  return inventory
    .filter(item => item.ubd_date && item.quantity > 0)
    .map(item => {
      const ubdDate = new Date(item.ubd_date);
      const timeDiff = ubdDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      return {
        cfn: item.cfn,
        lot_number: item.lot_number,
        ubd_date: item.ubd_date,
        quantity: item.quantity,
        location_name: locationName,
        days_until_expiry: daysDiff,
      };
    })
    .filter(item => item.days_until_expiry > 0) // 만료되지 않은 것만
    .sort((a, b) => a.days_until_expiry - b.days_until_expiry); // 만료일 가까운 순
};

/**
 * 교환 모달용 재고 계산
 */
export const calculateExchangeInventory = (
  movements: StockMovement[],
  locationId: string,
  productMap: ProductMap,
  clientMap: ClientMap
): ExchangeInventoryItem[] => {
  const inventory = calculateInventory(movements, locationId, productMap, clientMap);
  
  return inventory.map(item => ({
    ...item,
    id: `${item.product_id}-${item.lot_number}-${item.ubd_date}`,
    product_id: item.product_id!,
  }));
};

/**
 * CFN 숫자 정렬 함수 (ABLE Inventory용)
 */
export const sortByCfnNumeric = (items: InventoryItem[]): InventoryItem[] => {
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

    // 같은 영문 그룹 내에서 뒤 2자리로 먼저 정렬 (08, 12 등)
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