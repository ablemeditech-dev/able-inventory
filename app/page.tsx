import Link from "next/link";

export default function HomePage() {
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-2">대시보드</h1>
        <p className="text-text-secondary mb-6">
          ABLE MEDITECH 의료기기 관리 시스템
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/statistics" className="block">
            <div className="bg-white rounded-xl shadow-lg border border-accent-soft p-8 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group relative">
              <h3 className="font-bold text-text-secondary mb-3 text-lg">
                통계
              </h3>
              <p className="text-2xl font-bold text-primary mb-1">상세 분석</p>
              <p className="text-accent-soft">실시간 데이터 확인</p>
            </div>
          </Link>

          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-6">
            <h3 className="font-semibold text-text-secondary mb-2">
              재고 현황
            </h3>
            <p className="text-3xl font-bold text-primary">5,678</p>
            <p className="text-sm text-accent-soft mt-1">정상 재고</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-6">
            <h3 className="font-semibold text-text-secondary mb-2">
              이번 달 입고
            </h3>
            <p className="text-3xl font-bold text-primary">892</p>
            <p className="text-sm text-accent-soft mt-1">+8% 전월 대비</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-6">
            <h3 className="font-semibold text-text-secondary mb-2">
              이번 달 출고
            </h3>
            <p className="text-3xl font-bold text-primary">743</p>
            <p className="text-sm text-accent-soft mt-1">+5% 전월 대비</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-6">
            <h3 className="font-semibold text-primary mb-4">최근 활동</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-accent-light">
                <span className="text-text-secondary">새 제품 등록</span>
                <span className="text-sm text-accent-soft">2시간 전</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-accent-light">
                <span className="text-text-secondary">재고 업데이트</span>
                <span className="text-sm text-accent-soft">4시간 전</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-text-secondary">출고 처리 완료</span>
                <span className="text-sm text-accent-soft">6시간 전</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-accent-soft p-6">
            <h3 className="font-semibold text-primary mb-4">알림</h3>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">재고 부족 제품 3개</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">신규 주문 5건 대기 중</p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">월간 목표 달성률 95%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
