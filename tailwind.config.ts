import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#955632', // 헤더 및 주요 버튼 배경색 (브라운)
          dark: '#7A452A', // 호버 및 액티브 상태 (어두운 브라운)
          light: '#B8713F', // 가벼운 강조 (밝은 브라운)
        },
        background: '#F9F5F3', // 페이지 및 카드 배경 (밝은 베이지톤)
        accent: {
          light: '#F6E9DF', // 아이콘 배경 및 하이라이트
          soft: '#EDD9C4', // 보조 강조용 (부드러운 베이지)
        },
        text: {
          primary: '#2D3748', // 메인 텍스트 (어두운 회색)
          secondary: '#4A5568', // 설명 텍스트 (중간 회색)
        },
        // 상태 메시지 컬러 체계
        status: {
          error: {
            bg: '#FEF2F2', // bg-red-50 equivalent
            border: '#FECACA', // border-red-200 equivalent
            text: '#DC2626', // text-red-600 equivalent
          },
          success: {
            bg: '#F0FDF4', // bg-green-50 equivalent
            border: '#BBF7D0', // border-green-200 equivalent
            text: '#16A34A', // text-green-600 equivalent
          },
          warning: {
            bg: '#FFFBEB', // bg-amber-50 equivalent
            border: '#FED7AA', // border-amber-200 equivalent
            text: '#D97706', // text-amber-600 equivalent
          },
          info: {
            bg: '#EFF6FF', // bg-blue-50 equivalent
            border: '#BFDBFE', // border-blue-200 equivalent
            text: '#2563EB', // text-blue-600 equivalent
          }
        },
        // 차트 컬러 체계
        chart: {
          primary: '#3B82F6',   // 파란색
          secondary: '#EF4444', // 빨간색
          tertiary: '#10B981',  // 초록색
          quaternary: '#F59E0B', // 주황색
          quinary: '#8B5CF6',   // 보라색
          senary: '#EC4899',    // 핑크색
          septenary: '#14B8A6', // 청록색
          octonary: '#F97316',  // 주황색 (진한)
          nonary: '#6366F1',    // 인디고색
          denary: '#84CC16',    // 라임색
        }
      },
    },
  },
  plugins: [],
} satisfies Config;
