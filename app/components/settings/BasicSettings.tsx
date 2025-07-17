"use client";

import Link from "next/link";
import { LinkButton } from "../ui/Button";

export default function BasicSettings() {
  const sections = [
    {
      id: "product",
      name: "제품 관리",
      description: "제품 정보를 등록하고 관리합니다.",
      href: "/settings/product/add",
      listHref: "/settings/product/list",
      buttonText: "제품 추가",
    },
    {
      id: "client",
      name: "거래처 관리",
      description: "거래처 정보를 등록하고 관리합니다.",
      href: "/settings/client/add",
      listHref: "/settings/client/list",
      buttonText: "거래처 추가",
    },
    {
      id: "supplier",
      name: "공급업체 관리",
      description: "공급업체 정보를 등록하고 관리합니다.",
      href: "/settings/supplier/add",
      listHref: "/settings/supplier/list",
      buttonText: "공급업체 추가",
    },
  ];

  return (
    <div className="p-4">
      {/* 카드 목록 */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.id}
            className="overflow-hidden rounded-lg shadow hover:shadow-md transition-shadow"
          >
            {/* 첫 번째 영역: 제목 + 리스트 아이콘 (테마컬러 배경) */}
            <div className="bg-accent-light py-3 px-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{section.name}</h3>
              <Link
                href={section.listHref}
                className="p-1 hover:bg-accent-soft rounded transition-colors"
              >
                <svg
                  className="w-5 h-5 text-text-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </Link>
            </div>

            {/* 두 번째 영역: 설명 + 추가 버튼 (흰색 배경) */}
            <div className="bg-white p-4 border-t border-gray-200">
              <p className="text-text-secondary text-sm mb-4">
                {section.description}
              </p>
              <LinkButton
                href={section.href}
                variant="primary"
              >
                {section.buttonText}
              </LinkButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
