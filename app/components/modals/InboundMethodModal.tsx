"use client";

import React from "react";
import { useRouter } from "next/navigation";
import BaseModal from "./BaseModal";

interface InboundMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InboundMethodModal({
  isOpen,
  onClose,
}: InboundMethodModalProps) {
  const router = useRouter();

  const handleScanInbound = () => {
    onClose();
    router.push("/inbound/scan");
  };

  const handleManualInbound = () => {
    onClose();
    router.push("/inbound/manual");
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="입고 방식 선택"
      size="md"
    >
      <div className="space-y-6">
        {/* 스캔 입고 옵션 */}
        <div
          onClick={handleScanInbound}
          className="p-6 border-2 border-accent-soft rounded-lg hover:border-primary hover:bg-accent-light transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center group-hover:bg-accent-soft transition-colors">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 12h.01"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">스캔 입고</h3>
            </div>
            <svg
              className="w-5 h-5 text-accent-soft group-hover:text-primary transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>

        {/* 직접 입고 옵션 */}
        <div
          onClick={handleManualInbound}
          className="p-6 border-2 border-accent-soft rounded-lg hover:border-primary hover:bg-accent-light transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center group-hover:bg-accent-soft transition-colors">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">직접 입고</h3>
            </div>
            <svg
              className="w-5 h-5 text-accent-soft group-hover:text-primary transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
