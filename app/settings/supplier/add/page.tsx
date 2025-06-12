"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { suppliersAPI } from "../../../../lib/supabase";

export default function AddSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 폼 데이터 상태
  const [formData, setFormData] = useState({
    hospital_name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    business_number: "",
    notes: "",
  });

  // 입력값 변경 핸들러
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
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
    if (!formData.hospital_name.trim()) {
      setError("병원명은 필수 입력 항목입니다.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data, error } = await suppliersAPI.create(formData);

      if (error) {
        throw error;
      }

      console.log("공급업체 생성 성공:", data);

      // 성공 시 공급업체 목록으로 이동
      router.push("/settings/supplier/list");
    } catch (err) {
      console.error("공급업체 생성 실패:", err);
      setError("공급업체 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">공급업체 추가</h1>
      </div>

      {/* 폼 */}
      <div className="bg-accent-light p-6 rounded-lg shadow">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 기본 정보 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              병원명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="hospital_name"
              value={formData.hospital_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary"
              placeholder="병원명을 입력하세요"
              autoComplete="off"
              required
            />
          </div>

          {/* 담당자 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                담당자명
              </label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary"
                placeholder="담당자명을 입력하세요"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                연락처
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary"
                placeholder="연락처를 입력하세요"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary"
              placeholder="이메일을 입력하세요"
              autoComplete="off"
            />
          </div>

          {/* 주소 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                도시
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary"
                placeholder="도시를 입력하세요"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사업자번호
              </label>
              <input
                type="text"
                name="business_number"
                value={formData.business_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary"
                placeholder="사업자번호를 입력하세요"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              주소
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary"
              placeholder="상세 주소를 입력하세요"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메모
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary"
              placeholder="추가 메모를 입력하세요"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-text-primary rounded-lg hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "저장 중..." : "저장"}
            </button>
            <Link
              href="/settings/supplier/list"
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
