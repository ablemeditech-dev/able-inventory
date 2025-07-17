"use client";

import { Inter } from "next/font/google";
import { useState } from "react";
import Link from "next/link";
import Sidebar from "./components/modals/Sidebar";
import "./globals.css";
import { MenuIcon } from "./components/ui/Icons";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen">
          {/* 헤더 - 고정 */}
          <header
            className="fixed top-0 left-0 right-0 z-50 bg-primary text-white min-h-16 flex items-center justify-between px-4 shadow-lg"
            style={{
              paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
              paddingBottom: "0.5rem",
              marginTop: "calc(-1 * env(safe-area-inset-top))",
            }}
          >
            {/* 왼쪽 - 햄버거 메뉴 */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <MenuIcon className="text-white" />
            </button>

            {/* 중앙 - 타이틀 */}
            <Link
              href="/"
              className="text-lg font-semibold hover:text-gray-200 transition-colors"
            >
              ABLE MEDITECH
            </Link>

            {/* 오른쪽 - 설정/로그아웃 */}
            <div className="flex items-center space-x-2">
              {/* 설정 아이콘 */}
              <Link
                href="/settings"
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="설정"
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </Link>

              {/* 로그아웃 아이콘 */}
              <button
                onClick={() => {
                  // 로그아웃 로직 추가 예정
                  console.log("로그아웃");
                }}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="로그아웃"
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </header>

          {/* 사이드바 */}
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* 메인 콘텐츠 영역 - 스크롤 가능 */}
          <main
            className="flex-1 overflow-y-auto bg-background"
            style={{
              paddingTop: "calc(4rem + env(safe-area-inset-top))",
              paddingBottom: "2rem",
            }}
          >
            {children}
          </main>

          {/* 푸터 - 고정 */}
          <footer className="fixed bottom-0 left-0 right-0 z-50 bg-background text-text-secondary h-8 flex items-center justify-center">
            <p className="text-sm">© 2018 ABLE MEDITECH</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
