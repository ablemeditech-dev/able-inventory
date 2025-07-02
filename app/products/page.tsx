"use client";

import { useState } from "react";

// SVG 아이콘 컴포넌트들
const ArrowDownTrayIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const DocumentTextIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const PhotoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const downloadPDF = (filename: string) => {
    const link = document.createElement("a");
    link.href = `/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  GUSTA 제품 소개
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                  혁신적인 의료기기 솔루션
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              제품 개요
            </button>
            <button
              onClick={() => setActiveTab("features")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "features"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              주요 특징
            </button>
            <button
              onClick={() => setActiveTab("specifications")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "specifications"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              제품 사양
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "documents"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              관련 문서
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <div className="max-w-4xl">
                <h2 className="text-4xl font-bold mb-4">GUSTA Balloon</h2>
                <p className="text-xl mb-6 opacity-90">
                  혁신적인 의료기기 기술로 환자의 안전과 편의를 최우선으로 하는
                  차세대 의료 솔루션입니다.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
                    <span className="font-semibold">안전성</span>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
                    <span className="font-semibold">효율성</span>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
                    <span className="font-semibold">편의성</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="bg-white p-8 rounded-xl shadow-sm border">
              <h3 className="text-2xl font-bold mb-6">
                GUSTA® PTCA Balloon Catheter
              </h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-blue-600">
                    제품 개요
                  </h4>
                  <p className="text-gray-600 mb-4">
                    GUSTA® 시리즈는 PTCA(경피적 관상동맥 성형술)용 풍선 확장
                    카테터로, 우수한 전달성(Deliverability)과 강력한 확장력을
                    제공하는 혁신적인 의료기기입니다. CE 마크 인증을 받아 유럽
                    시장에서 안전성과 효과를 인정받았으며, Beijing Demax Medical
                    Technology에서 개발·제조하고 있습니다.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg mt-4">
                    <h5 className="font-semibold text-blue-900 mb-2">
                      핵심 기술
                    </h5>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Tapered Tip 설계로 향상된 가이드와이어 추적성</li>
                      <li>
                        • 특허받은 친수성 코팅으로 우수한 통과성(Crossability)
                      </li>
                      <li>• 낮은 통과 프로파일로 복잡한 병변 접근 가능</li>
                      <li>• 방사선 불투과성 마커로 정확한 위치 확인</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-3 text-green-600">
                    임상 적용 분야
                  </h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-green-900 mb-3">
                        관상동맥 중재술
                      </h5>
                      <ul className="text-green-700 text-sm space-y-1">
                        <li>• 관상동맥 또는 우회로 협착의 풍선 확장술</li>
                        <li>• 심근허혈 개선을 위한 심근관류 향상</li>
                        <li>• 만성 완전 폐색(CTO) 치료</li>
                        <li>• 복잡한 병변 치료</li>
                      </ul>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-purple-900 mb-3">
                        응급 시술
                      </h5>
                      <ul className="text-purple-700 text-sm space-y-1">
                        <li>• ST분절 상승 심근경색 시 관상동맥 재개통</li>
                        <li>
                          • 스텐트 후확장(Post-deployment stent expansion)
                        </li>
                        <li>• Jailed balloon 기법</li>
                        <li>• Balloon-stent kissing 기법</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg mt-4">
                    <h5 className="font-semibold text-red-900 mb-2">
                      금기사항
                    </h5>
                    <ul className="text-red-700 text-sm space-y-1">
                      <li>• 보호되지 않은 좌주간부 관상동맥</li>
                      <li>• 유의한 협착이 없는 관상동맥 경련</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "features" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                주요 특징
              </h2>
              <p className="text-lg text-gray-600">
                GUSTA 제품의 핵심 기능과 장점을 확인하세요
              </p>
            </div>

            <div className="space-y-8">
              {/* 제조사 정보 */}
              <div className="bg-white p-8 rounded-xl shadow-sm border">
                <h3 className="text-xl font-bold mb-4 text-blue-600">
                  제조사 정보
                </h3>
                <p className="text-gray-600 mb-4">
                  제조사 Demax는 베이징 분사 및 호주 지사를 두고 있는 기업이며,
                  &apos;Gusta&apos; Balloon Catheter 제품을 유럽(CE) MDR Approval을 받은
                  제품입니다. 현재 베이징에서 제품 제조공정이 이루어지고
                  있습니다.
                </p>
              </div>

              {/* Feature and Benefit */}
              <div className="bg-white p-8 rounded-xl shadow-sm border">
                <h3 className="text-xl font-bold mb-6 text-green-600">
                  Feature and Benefit
                </h3>

                <div className="space-y-6">
                  {/* 1. 매우 작은 entry profile */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold text-lg mb-2">
                      1. 매우 작은 entry profile (0.016&quot;=0.4mm)
                    </h4>
                    <p className="text-gray-600 mb-3">
                      small entry profile은 balloon의 crossability를 높이기
                      때문에, 타 경쟁 제품과 비교했을 때 관장히 우수한
                      crossability 를 가지고 있습니다.
                    </p>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium">
                        ✓ GUSTA(Φ1.25): 0.016&quot; - 경쟁사 대비 가장 작은 entry
                        profile로 우수한 통과성 확보
                      </p>
                    </div>
                  </div>

                  {/* 2. Embedded platinum-iridium alloy marker */}
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-semibold text-lg mb-2">
                      2. Embedded platinum-iridium alloy marker (타 제품 유사)
                    </h4>
                    <p className="text-gray-600">
                      balloon 끝 부분에 마커를 통해 precise positioning이
                      가능합니다.
                    </p>
                  </div>

                  {/* 3. 부분적인 Hydrophilic coating */}
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold text-lg mb-2">
                      3. 부분적인 Hydrophilic coating (타 제품 유사)
                    </h4>
                    <p className="text-gray-600">
                      코팅이 있는 부분을 통해 마찰을 줄일 수 있고, 코팅이 있지
                      않은 부분을 통해 balloon dilatation 후 balloon sliding을
                      줄일 수 있습니다.
                    </p>
                  </div>

                  {/* 4. Guidewire의 유연성 + 5. Shaft 부분의 유연성 */}
                  <div className="border-l-4 border-orange-500 pl-4">
                    <h4 className="font-semibold text-lg mb-2">
                      4. Guidewire의 유연성 + 5. Shaft 부분의 유연성 (타 제품
                      유사)
                    </h4>
                    <p className="text-gray-600">
                      Delivery를 용이하게 해줍니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "specifications" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                제품 사양
              </h2>
              <p className="text-lg text-gray-600">
                GUSTA 제품의 상세 사양을 확인하세요
              </p>
            </div>

            {/* 제품 크기 및 사양 */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-primary">
                  제품 크기 및 상세 사양
                </h3>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <h4 className="font-semibold mb-4 text-green-600">
                    Gusta II NC PTCA Balloon Dilatation Catheter
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Non-compliant Balloon Dilatation Catheter
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm [&_td:not(:first-child)]:text-black [&_td:not(:first-child)]:font-medium [&_td:first-child]:text-black [&_td:first-child]:font-medium [&_td:first-child]:bg-green-50">
                      <thead>
                        <tr className="bg-green-50">
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-black"></th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            6 mm
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            8 mm
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            10 mm
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            12 mm
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            15 mm
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            20 mm
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            25 mm
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            30 mm
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            2.25
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs text-black font-medium">
                            DHC2206
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs text-black font-medium">
                            DHC2208
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs text-black font-medium">
                            DHC2210
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs text-black font-medium">
                            DHC2212
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DHC2215
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DHC2220
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DHC2225
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DHC2230
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            2.5
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2506</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2508</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2510</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2512</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2515</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2520</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2525</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2530</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            2.75
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2706</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2708</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2710</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2712</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2715</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2720</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2725</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC2730</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            3.0
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3006</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3008</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3010</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3012</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3015</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3020</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3025</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3030</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            3.25
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3206</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3208</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3210</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3212</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3215</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3220</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3225</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3230</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            3.5
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3506</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3508</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3510</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3512</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3515</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3520</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3525</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3530</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            3.75
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3706</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3708</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3710</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3712</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3715</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3720</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3725</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC3730</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            4.0
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4006</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4008</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4010</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4012</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4015</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4020</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4025</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4030</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            4.25
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4206</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4208</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4210</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4212</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4215</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4220</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4225</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4230</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            4.5
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4506</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4508</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4510</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4512</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4515</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4520</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4525</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">DHC4530</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>



                <div className="mb-6">
                  <h4 className="font-semibold mb-4 text-blue-600">
                    Gusta II PTCA Balloon Dilatation Catheter
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Semi-compliant Balloon Dilatation Catheter
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm [&_td:not(:first-child)]:text-black [&_td:not(:first-child)]:font-medium [&_td:first-child]:text-black [&_td:first-child]:font-medium [&_td:first-child]:bg-blue-100">
                      <thead>
                        <tr className="bg-blue-100">
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-black"></th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            6mm
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            8mm
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            10mm
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            12mm
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            15mm
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            20mm
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            25mm
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-black">
                            30mm
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            1.25
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1206
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1208
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1210
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1212
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1215
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1220
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            1.5
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1506
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1508
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1510
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1512
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1515
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1520
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1525
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1530
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            1.75
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1706
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1708
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1710
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1712
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1715
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1720
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1725
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC1730
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            2.0
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2006
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2008
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2010
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2012
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2015
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2020
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2025
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2030
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            2.25
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2206
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2208
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2210
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2212
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2215
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2220
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2225
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2230
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            2.5
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2506
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2508
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2510
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2512
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2515
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2520
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2525
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2530
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            2.75
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2706
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2708
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2710
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2712
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2715
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2720
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2725
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC2730
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            3.0
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3006
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3008
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3010
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3012
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3015
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3020
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3025
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3030
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            3.25
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3206
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3210
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3212
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3215
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3220
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3225
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3230
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            3.5
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3506
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3510
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3512
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3515
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3520
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3525
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3530
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            3.75
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3706
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3710
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3712
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3715
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3720
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3725
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC3730
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            4.0
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC4006
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC4010
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC4012
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC4015
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC4020
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC4025
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC4030
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            4.5
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC4515
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC4520
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            5.0
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC5015
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            DPC5020
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                            -
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-8 grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold mb-4">제품 특징</h4>
                    <div className="space-y-3">
                      <div className="flex items-center py-2">
                        <CheckCircleIcon className="w-5 h-5 text-blue-500 mr-3" />
                        <span className="text-gray-700">
                          우수한 전달성(Good delivery performance)
                        </span>
                      </div>
                      <div className="flex items-center py-2">
                        <CheckCircleIcon className="w-5 h-5 text-blue-500 mr-3" />
                        <span className="text-gray-700">
                          낮은 컴플라이언스로 완전한 스텐트 확장
                        </span>
                      </div>
                      <div className="flex items-center py-2">
                        <CheckCircleIcon className="w-5 h-5 text-blue-500 mr-3" />
                        <span className="text-gray-700">
                          정확한 명목 크기로 부작용 최소화
                        </span>
                      </div>
                      <div className="flex items-center py-2">
                        <CheckCircleIcon className="w-5 h-5 text-blue-500 mr-3" />
                        <span className="text-gray-700">건강한 조직 보호</span>
                      </div>
                      <div className="flex items-center py-2">
                        <CheckCircleIcon className="w-5 h-5 text-blue-500 mr-3" />
                        <span className="text-gray-700">
                          Rapid Exchange 시스템
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-4">안전성 및 품질</h4>
                    <div className="space-y-3">
                      <div className="flex items-center py-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                        <span className="text-gray-700">
                          일회용(Single use only)
                        </span>
                      </div>
                      <div className="flex items-center py-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                        <span className="text-gray-700">
                          에틸렌 옥사이드(EO) 멸균
                        </span>
                      </div>
                      <div className="flex items-center py-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                        <span className="text-gray-700">
                          CE 마크 인증 (MDR 준수)
                        </span>
                      </div>
                      <div className="flex items-center py-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                        <span className="text-gray-700">
                          ISO 13485 품질경영시스템
                        </span>
                      </div>
                      <div className="flex items-center py-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                        <span className="text-gray-700">
                          생체적합성 검증 완료
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold">품질 인증</h3>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircleIcon className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="font-semibold mb-2">ISO 13485</h4>
                    <p className="text-sm text-gray-600">
                      의료기기 품질경영시스템
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircleIcon className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="font-semibold mb-2">CE 마킹</h4>
                    <p className="text-sm text-gray-600">유럽 안전 기준 준수</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircleIcon className="w-8 h-8 text-purple-600" />
                    </div>
                    <h4 className="font-semibold mb-2">FDA 승인</h4>
                    <p className="text-sm text-gray-600">
                      미국 식품의약청 승인
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                관련 문서
              </h2>
              <p className="text-lg text-gray-600">
                제품 관련 문서를 다운로드하실 수 있습니다
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center mb-4">
                  <DocumentTextIcon className="w-8 h-8 text-red-500 mr-3" />
                  <div>
                    <h3 className="font-semibold text-lg text-black">GUSTA 특장점</h3>
                    <p className="text-sm text-gray-600">
                      제품의 주요 특장점 및 장점
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">PDF 문서</span>
                  <button
                    onClick={() => downloadPDF("[GUSTA] 특장점_kor.pdf")}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                    다운로드
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center mb-4">
                  <PhotoIcon className="w-8 h-8 text-blue-500 mr-3" />
                  <div>
                    <h3 className="font-semibold text-lg text-black">제품 브로셔</h3>
                    <p className="text-sm text-gray-600">
                      상세한 제품 정보 및 이미지
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">PDF 문서</span>
                  <button
                    onClick={() =>
                      downloadPDF(
                        "GUSTA Balloon Brochure V2_Low Resolution.pdf"
                      )
                    }
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                    다운로드
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                추가 정보 요청
              </h3>
              <p className="text-blue-800 mb-4">
                더 자세한 제품 정보나 기술 문서가 필요하시면 언제든지
                연락주세요.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center text-blue-700">
                  <span className="font-medium mr-2">전화:</span>
                  <span>1588-0000</span>
                </div>
                <div className="flex items-center text-blue-700">
                  <span className="font-medium mr-2">이메일:</span>
                  <span>info@ablemeditech.com</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
