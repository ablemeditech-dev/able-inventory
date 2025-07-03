"use client";

import React, { useState, useEffect } from "react";
import ExchangeMethodModal from "../components/modals/ExchangeMethodModal";

interface ExchangeItem {
  id: string;
  product_code: string;
  product_name: string;
  serial_number: string;
  lot_number: string;
  ubd_date: string;
  quantity: number;
  exchange_reason: string;
}

interface ExchangeRecord {
  id: string;
  created_at: string;
  exchange_date: string;
  from_location: string;
  to_location: string;
  status: "진행중" | "완료" | "취소";
  total_quantity: number;
  items: ExchangeItem[];
}

interface GroupedExchange {
  date: string;
  from_to: string;
  status: "진행중" | "완료" | "취소";
  total_quantity: number;
  records: ExchangeRecord[];
}

export default function ExchangePage() {
  const [exchangeRecords, setExchangeRecords] = useState<GroupedExchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "진행중":
        return "bg-yellow-100 text-yellow-800";
      case "완료":
        return "bg-green-100 text-green-800";
      case "취소":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const getGroupKey = (group: GroupedExchange) =>
    `${group.date}-${group.from_to}`;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">교환관리</h1>
          <button
            onClick={() => setIsMethodModalOpen(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-accent-soft transition-colors flex items-center space-x-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>신규교환</span>
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-8 text-center">
            <div className="text-text-secondary">
              교환 기록을 불러오는 중...
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-8 text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-accent-soft"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-primary mb-2">
              교환 내용이 없습니다
            </h2>
            <p className="text-text-secondary mb-4">
              첫 번째 교환을 등록해보세요.
            </p>
          </div>
        )}
      </div>

      {/* 교환 방식 선택 모달 */}
      <ExchangeMethodModal
        isOpen={isMethodModalOpen}
        onClose={() => setIsMethodModalOpen(false)}
      />
    </div>
  );
} 