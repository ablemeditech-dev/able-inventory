"use client";

import { useEffect } from "react";
import { XIcon } from "../ui/Icons";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  customHeaderActions?: React.ReactNode;
}

export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  customHeaderActions,
}: BaseModalProps) {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* 모달 컨테이너 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative w-full ${sizeClasses[size]} bg-white rounded-lg shadow-xl transform transition-all`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 모달 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-accent-soft bg-accent-light">
            <h2 className="text-lg font-semibold text-primary">{title}</h2>
            <div className="flex items-center space-x-2">
              {customHeaderActions}
              <button
                onClick={onClose}
                className="text-primary hover:text-accent-soft transition-colors"
              >
                <XIcon />
              </button>
            </div>
          </div>

          {/* 모달 바디 */}
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
