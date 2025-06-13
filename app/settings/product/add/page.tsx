"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, clientsAPI } from "../../../../lib/supabase";

interface Client {
  id: string;
  company_name: string;
}

function AddProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);

  // 폼 데이터 상태
  const [formData, setFormData] = useState({
    client_id: "",
    cfn: "",
    upn: "",
    description: "",
    category: "",
    unit: "EA",
  });

  // 거래처 목록 로드
  useEffect(() => {
    loadClients();
  }, []);

  // URL 파라미터에서 UPN 받아오기
  useEffect(() => {
    const upnParam = searchParams.get("upn");
    if (upnParam) {
      setFormData((prev) => ({
        ...prev,
        upn: upnParam,
      }));
    }
  }, [searchParams]);

  const loadClients = async () => {
    try {
      setClientsLoading(true);
      const { data, error } = await clientsAPI.getAll();

      if (error) throw error;

      setClients(data || []);
    } catch (err) {
      console.error("거래처 로딩 실패:", err);
      setError("거래처 목록을 불러오는데 실패했습니다.");
    } finally {
      setClientsLoading(false);
    }
  };

  // 입력값 변경 핸들러
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 필수 필드 검증
    if (!formData.client_id) {
      setError("거래처를 선택해주세요.");
      return;
    }
    if (!formData.cfn.trim()) {
      setError("CFN은 필수 입력 항목입니다.");
      return;
    }
    if (!formData.upn.trim()) {
      setError("UPN은 필수 입력 항목입니다.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("products")
        .insert([formData])
        .select();

      if (error) throw error;

      console.log("제품 생성 성공:", data);

      // 성공 시 제품 목록으로 이동
      router.push("/settings/product/list");
    } catch (err: any) {
      console.error("제품 생성 실패:", err);

      // 중복 키 에러 처리
      if (err.code === "23505") {
        setError("이미 등록된 CFN/UPN 조합입니다.");
      } else {
        setError("제품 저장에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">제품 추가</h1>
      </div>

      {/* 폼 */}
      <div className="bg-accent-light p-6 rounded-lg shadow">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 거래처 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              거래처 <span className="text-red-500">*</span>
            </label>
            {clientsLoading ? (
              <div className="text-sm text-text-secondary">
                거래처 목록 로딩 중...
              </div>
            ) : (
              <select
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary bg-white appearance-none text-gray-900"
                required
              >
                <option value="">거래처를 선택하세요</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* CFN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CFN <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="cfn"
              value={formData.cfn}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
              placeholder="제품명을 입력하세요"
              required
            />
          </div>

          {/* UPN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              UPN <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="upn"
              value={formData.upn}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
              placeholder="UDI를 입력하세요"
              required
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              카테고리
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
              placeholder="제품 카테고리를 입력하세요"
            />
          </div>

          {/* 단위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              단위
            </label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary bg-white appearance-none text-gray-900"
            >
              <option value="EA">EA</option>
              <option value="BOX">BOX</option>
              <option value="SET">SET</option>
            </select>
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제품 설명
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
              placeholder="제품에 대한 상세 설명을 입력하세요"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading || clientsLoading}
              className="px-6 py-2 bg-primary text-text-primary rounded-lg hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "저장 중..." : "저장"}
            </button>
            <Link
              href="/settings"
              className="px-6 py-2 bg-accent-soft text-text-secondary rounded-lg hover:bg-accent-light transition-colors"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddProductPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <AddProductForm />
    </Suspense>
  );
}
