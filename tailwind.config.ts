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
        primary: '#955632', // 헤더 및 주요 버튼 배경색 (브라운)
        background: '#F9F5F3', // 페이지 및 카드 배경 (밝은 베이지톤)
        accent: {
          light: '#F6E9DF', // 아이콘 배경 및 하이라이트
          soft: '#EDD9C4', // 보조 강조용 (부드러운 베이지)
        },
        text: {
          primary: '#2D3748', // 메인 텍스트 (어두운 회색)
          secondary: '#4A5568', // 설명 텍스트 (중간 회색)
        }
      },
    },
  },
  plugins: [],
} satisfies Config;
