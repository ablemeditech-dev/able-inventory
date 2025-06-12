import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 타입 정의
export interface Database {
  // 데이터베이스 스키마는 나중에 추가
}

// 타입 정의
export interface Client {
  id?: string;
  company_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Product 타입 정의
export interface Product {
  id?: string;
  client_id: string;
  cfn: string;
  upn: string;
  description?: string;
  category?: string;
  unit: string;
  created_at?: string;
  updated_at?: string;
}

// Supplier 타입 정의
export interface Supplier {
  id?: string;
  hospital_name: string;
  hospital_code?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  business_number?: string;
  notes?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Supplier 생성용 타입 (hospital_code와 is_active 제외)
export interface SupplierCreate {
  hospital_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  business_number?: string;
  notes?: string;
}

// 헬퍼 함수들
export const checkConnection = async () => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .limit(1);
    console.log("Supabase 연결 성공:", !error);
    return !error;
  } catch (err) {
    console.log("Supabase 연결 테스트:", err);
    return false;
  }
};

// 거래처 관련 함수들
export const clientsAPI = {
  // 모든 거래처 조회
  getAll: () =>
    supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false }),

  // 특정 거래처 조회
  getById: (id: string) =>
    supabase.from("clients").select("*").eq("id", id).single(),

  // 거래처 추가
  create: async (client: Omit<Client, "id" | "created_at" | "updated_at">) => {
    // 1. 먼저 clients 테이블에 추가
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .insert([client])
      .select()
      .single();

    if (clientError) {
      return { data: null, error: clientError };
    }

    // 2. locations 테이블에도 supplier로 추가
    const locationData = {
      id: clientData.id,
      location_code: `SUPPLIER-${client.company_name
        .replace(/\s+/g, "")
        .toUpperCase()
        .substring(0, 8)}`,
      location_name: client.company_name,
      location_type: "warehouse",
      reference_id: clientData.id,
      parent_location_id: null,
      address: client.address || null,
      notes: `거래처: ${client.company_name}${
        client.contact_person ? ` (담당자: ${client.contact_person})` : ""
      }`,
      is_active: "true",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: locationError } = await supabase
      .from("locations")
      .insert([locationData]);

    if (locationError) {
      console.error("locations 테이블 추가 실패:", locationError);
      // locations 추가 실패해도 clients는 이미 추가되었으므로 성공으로 처리
    }

    return { data: clientData, error: null };
  },

  // 거래처 수정
  update: (id: string, client: Partial<Client>) =>
    supabase.from("clients").update(client).eq("id", id).select(),

  // 거래처 삭제
  delete: (id: string) => supabase.from("clients").delete().eq("id", id),

  // 거래처 검색
  search: (query: string) =>
    supabase
      .from("clients")
      .select("*")
      .or(`company_name.ilike.%${query}%,contact_person.ilike.%${query}%`),
};

// 제품 관련 함수들
export const productsAPI = {
  // 모든 제품 조회
  getAll: () =>
    supabase
      .from("products")
      .select(
        `
        *,
        clients(company_name)
      `
      )
      .order("created_at", { ascending: false }),

  // 특정 제품 조회
  getById: (id: string) =>
    supabase
      .from("products")
      .select(
        `
        *,
        clients(company_name)
      `
      )
      .eq("id", id)
      .single(),

  // 제품 추가
  create: (product: Omit<Product, "id" | "created_at" | "updated_at">) =>
    supabase.from("products").insert([product]).select(),

  // 제품 수정
  update: (id: string, product: Partial<Product>) =>
    supabase.from("products").update(product).eq("id", id).select(),

  // 제품 삭제
  delete: (id: string) => supabase.from("products").delete().eq("id", id),

  // 제품 검색
  search: (query: string) =>
    supabase
      .from("products")
      .select(
        `
        *,
        clients(company_name)
      `
      )
      .or(
        `cfn.ilike.%${query}%,upn.ilike.%${query}%,category.ilike.%${query}%`
      ),
};

// 공급업체 관련 함수들
export const suppliersAPI = {
  // 모든 공급업체 조회
  getAll: () =>
    supabase
      .from("hospitals")
      .select("*")
      .order("created_at", { ascending: false }),

  // 특정 공급업체 조회
  getById: (id: string) =>
    supabase.from("hospitals").select("*").eq("id", id).single(),

  // 공급업체 추가
  create: async (supplier: SupplierCreate) => {
    // 1. 먼저 hospitals 테이블에 추가
    const { data: hospitalData, error: hospitalError } = await supabase
      .from("hospitals")
      .insert([supplier])
      .select();

    if (hospitalError) {
      return { data: null, error: hospitalError };
    }

    // 2. locations 테이블에도 추가
    if (hospitalData && hospitalData.length > 0) {
      const hospital = hospitalData[0];
      const locationData = {
        id: hospital.id,
        location_code: `HOSPITAL-${hospital.hospital_name
          .replace(/\s+/g, "")
          .toUpperCase()
          .substring(0, 8)}`,
        location_name: hospital.hospital_name,
        location_type: "warehouse", // hospital이 허용되지 않을 수 있으므로 warehouse 사용
        reference_id: hospital.id,
        parent_location_id: null,
        address: hospital.address || null,
        notes: `병원: ${hospital.hospital_name}${
          hospital.contact_person ? ` (담당자: ${hospital.contact_person})` : ""
        }`,
        is_active: "true",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: locationError } = await supabase
        .from("locations")
        .insert([locationData]);

      if (locationError) {
        console.error("locations 테이블 추가 실패:", locationError);
        // locations 추가 실패해도 hospitals는 이미 추가되었으므로 성공으로 처리
      }
    }

    return { data: hospitalData, error: null };
  },

  // 공급업체 수정
  update: (id: string, supplier: Partial<Supplier>) =>
    supabase.from("hospitals").update(supplier).eq("id", id).select(),

  // 공급업체 삭제
  delete: (id: string) => supabase.from("hospitals").delete().eq("id", id),

  // 공급업체 검색
  search: (query: string) =>
    supabase
      .from("hospitals")
      .select("*")
      .or(
        `hospital_name.ilike.%${query}%,contact_person.ilike.%${query}%,city.ilike.%${query}%`
      ),
};
