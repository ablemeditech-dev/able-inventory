# 📝 작업 기록 (REMEMBER.md)

## 📅 2024년 12월 22일 (일)

### 🎯 오늘의 목표

- [x] `/outbound/manual` 페이지 거래처 선택 기능 추가
- [x] `/statistics/graphs` 페이지 CFN 분석 로직 수정
- [x] 그래프 UI/UX 텍스트 개선

### ✅ 완료된 작업

- **출고관리 거래처 필터링 기능 구현**

  - **문제점**: `/outbound/manual`에서 모든 거래처 제품이 CFN 드롭다운에 섞여서 너무 길어짐
  - **해결방안**: 거래처 선택 필드 추가하여 CFN을 거래처별로 필터링
  - **입력 순서**: 출고일자 → 출고 병원 → **거래처** → CFN → LOT → 수량
  - **기술 구현**: `clientsAPI.getAll()`, `productsAPI.getByClient()` 활용
  - **스마트 초기화**: 거래처 변경 시 제품/LOT/수량 자동 초기화

- **통계 그래프 CFN 분석 로직 수정**

  - **문제점**: '가장 널리 사용되는 CFN' 계산에서 `hospitalCount` 필드 누락
  - **해결방안**: CFN별 병원 추적 시스템 구현
  - **핵심 로직**: `cfnHospitals = new Map<string, Set<string>>()`으로 CFN별 병원 집합 관리
  - **인사이트 개선**:
    - "가장 많이 사용되는 CFN": 총 사용량 기준
    - "가장 널리 사용되는 CFN": 병원 수 기준으로 명확히 구분

- **그래프 UI/UX 텍스트 개선**

  - **그래프 내 텍스트**: `1250개 (15개 병원)` → `1250EA in 15 hospitals`
  - **인사이트 제목**: `📊 인사이트` → `인사이트` (이모지 제거)
  - 더 간결하고 국제적인 스타일로 개선

### 🔧 기술적 세부사항

- **거래처별 제품 필터링**:

  ```typescript
  // 거래처 선택 시 해당 거래처 제품만 로드
  useEffect(() => {
    if (formData.client_id) {
      loadProductsByClient(formData.client_id);
    }
  }, [formData.client_id]);
  ```

- **CFN별 병원 추적**:

  ```typescript
  const cfnHospitals = new Map<string, Set<string>>();
  cfnHospitals.get(cfn)!.add(hospitalName);
  hospitalCount: cfnHospitals.get(cfn)?.size || 0;
  ```

- **수정된 파일들**:
  - `app/outbound/manual/page.tsx` (거래처 선택 기능)
  - `app/statistics/graphs/page.tsx` (CFN 분석 로직 + UI 텍스트)

### 🐛 해결된 이슈

- 출고 시 CFN 선택의 복잡성 문제 해결
- 통계 그래프의 잘못된 "널리 사용되는 CFN" 계산 수정
- `hospitalCount` 필드 누락으로 인한 런타임 에러 해결
- 중복된 복잡한 계산 로직 정리

### 💡 배운 점

- **사용자 피드백의 중요성**: "CFN 드롭다운이 너무 길다"는 실제 사용성 문제
- **데이터 구조 설계**: Set을 활용한 중복 제거와 효율적인 카운팅
- **UI 텍스트의 임팩트**: 간단한 텍스트 변경으로도 전체적인 느낌 개선
- **점진적 개선**: 기존 로직을 완전히 바꾸지 않고 필요한 부분만 보완

### 📋 내일 할 일

- [ ] 다른 manual 페이지들도 거래처 필터링 적용 검토
- [ ] 통계 그래프 사용자 피드백 수집
- [ ] 추가 UI/UX 개선사항 검토

---

## 📅 2024년 12월 21일 (토)

### 🎯 오늘의 목표

- [x] 전역 제품 정보 모달 컴포넌트 구현
- [x] 제품 클릭시 상세 정보 표시 기능 추가
- [x] 사용자 경험 개선

### ✅ 완료된 작업

- **제품 정보 모달 컴포넌트 구현**

  - `ProductInfoModal.tsx` 전역 모달 컴포넌트 생성
  - 제품 리스트에서 CFN 클릭시 상세 정보 표시 기능
  - **조회 방식**: CFN 또는 제품 ID로 유연한 조회 지원
  - **표시 정보**: CFN, UPN, 거래처명, 카테고리, 단위, 등록일, 제품 설명
  - 로딩 상태 및 에러 처리 구현
  - 기존 테마와 일관된 깔끔한 UI 디자인

- **기술적 문제 해결**

  - **LoadingSpinner import 오류 수정**

    - 문제: Named import `{ LoadingSpinner }`로 잘못된 import
    - 해결: Default import `LoadingSpinner`로 수정
    - `message` prop 활용으로 더 깔끔한 로딩 표시

  - **사용자 경험 개선**
    - 제품 ID 필드 제거 (내부적으로만 사용, 사용자에게는 불필요)
    - 더 집중된 제품 정보 표시

### 🔧 기술적 세부사항

- **모달 구조**:

  ```tsx
  - 기본 정보 카드: CFN, UPN, 거래처, 카테고리, 단위, 등록일
  - 제품 설명 카드: 상세 설명 텍스트
  ```

- **데이터 조회**:

  ```sql
  products 테이블 join clients 테이블
  - CFN 또는 ID로 조회 가능
  - 거래처명 포함 조회
  ```

- **병원별 랭킹 시스템**:

  ```typescript
  // hospitalRankings: Map<string, Array<{hospitalName: string, rank: number}>>
  // CFN별로 어느 병원에서 몇 순위인지 저장
  ```

- **색상 해시 알고리즘**:

  ```typescript
  // 병원명 문자열 → 해시값 → 0-7 범위 → hospital-{1-8} variant
  const getHospitalBadgeVariant = (hospitalName: string): BadgeVariant
  ```

- **새로 생성된 파일**:

  - `app/components/modals/ProductInfoModal.tsx`

- **수정된 파일들**:

  - `hooks/useOrderData.ts` (병원별 랭킹 로직 추가)
  - `app/components/ui/Badge.tsx` (병원별 색상 시스템)
  - `app/components/order/OrderTableRow.tsx` (랭킹 데이터 전달)
  - `app/components/order/StatusBadges.tsx` (배지 렌더링)
  - `app/components/inventory/AbleInventory.tsx` (아코디언 타이틀)
  - `app/components/inventory/HospitalSpecificInventory.tsx` (아코디언 타이틀)

- **주요 기능**:
  - `BaseModal` 컴포넌트 활용한 일관된 모달 UI
  - `LoadingSpinner` 컴포넌트로 로딩 상태 표시
  - Supabase 연동으로 실시간 제품 정보 조회
  - 반응형 디자인 (모바일/데스크톱 최적화)
  - **병원별 개별 랭킹 시스템**: 각 병원에서 독립적인 Top 3 계산
  - **일관된 색상 할당**: 병원명 해시 기반 자동 색상 매칭

### 🐛 해결된 이슈

- LoadingSpinner 컴포넌트 export 방식 불일치 해결
- 제품 정보 모달에서 불필요한 ID 표시 제거
- import 오류로 인한 빌드 실패 해결
- **ProductInfo 타입 에러 최종 해결**
  - 문제: `clients` 필드가 `undefined`만 허용했지만 `null` 할당으로 타입 불일치
  - 해결: `ProductInfo` 인터페이스에서 `clients?: { company_name: string; } | null`로 수정
  - 결과: 모든 케이스(객체, null, undefined) 안전하게 처리
- **병원별 랭킹 시스템 데이터 구조 설계**
  - 문제: 기존 `hospitalTopUsage: Map<string, string>` (CFN → 병원명)으로는 Top 3 표현 불가
  - 해결: `hospitalRankings: Map<string, Array<{hospitalName: string, rank: number}>>`로 변경
  - 결과: 하나의 CFN이 여러 병원에서 상위권일 때 모든 배지 표시 가능
- **아코디언 타이틀 하드코딩 문제**
  - 문제: '재고 현황'으로 하드코딩되어 어떤 거래처 재고인지 구분 불가
  - 해결: `{group.clientName}`으로 동적 표시
  - 결과: 각 아코디언이 명확히 구분되는 사용자 경험 개선

### 💡 배운 점

- Default export vs Named export 구분의 중요성
- 사용자 중심의 UI 설계 (불필요한 기술적 정보 제거)
- 재사용 가능한 모달 컴포넌트의 활용
- 일관된 테마 적용을 통한 사용자 경험 통일
- **데이터 그룹핑과 랭킹 시스템**: 복잡한 비즈니스 로직의 효율적 구현
- **해시 기반 색상 할당**: 일관성과 자동화를 통한 확장 가능한 UI 시스템
- **사용자 피드백의 중요성**: 기술적 완성도보다 실제 사용성 우선
- **컴포넌트 재설계**: 기존 시스템을 깨뜨리지 않고 점진적 개선하는 방법

- **병원별 Top1,2,3 배지 시스템 구현**

  - 기존 전체 기준 Top1,2,3 배지를 **각 병원별 개별 랭킹**으로 변경
  - `useOrderData.ts`에서 `hospitalTopUsage` → `hospitalRankings`로 대폭 수정
  - 각 병원에서 6개월 사용량 기준 **상위 3개 제품**에만 배지 표시
  - **배지 형태**: "서울아산병원 Top 1", "삼성서울병원 Top 2" 등
  - CFN별로 여러 병원에서 상위권이면 **모든 배지 동시 표시**

- **병원별 색상 배지 시스템 구현**

  - `Badge.tsx`에 **8가지 병원별 색상 팔레트** 추가 (`hospital-1` ~ `hospital-8`)
  - **해시 기반 색상 할당**: 병원명을 해시하여 일관된 고유 색상 자동 할당
  - `HospitalRankBadge` 컴포넌트 새로 생성
  - **색상 팔레트**: 파란색, 초록색, 보라색, 핑크색, 남색, 청록색, 주황색, 시안색
  - 같은 병원은 항상 같은 색상, 다른 병원은 서로 다른 색상

- **인벤토리 아코디언 타이틀 수정**

  - `/inventory` 페이지의 ABLE 중앙창고와 병원별 재고에서 아코디언 타이틀 개선
  - **변경**: "재고 현황" → **실제 거래처명** ("DIO medical", "삼성서울병원" 등)
  - `AbleInventory.tsx`, `HospitalSpecificInventory.tsx` 수정
  - 각 아코디언이 어떤 거래처의 재고인지 **명확하게 구분** 가능

### 📋 내일 할 일

- [ ] 다른 페이지들에 ProductInfoModal 적용 (inventory, order 등)
- [ ] 제품 정보 모달 사용성 테스트
- [ ] 추가 제품 정보 필드 검토
- [ ] 병원별 색상 배지 시스템 사용자 피드백 수집

---

## �� 2024년 12월 20일 (금)

### 🎯 오늘의 목표

- [x] 새로운 GS1-128 바코드 규칙 추가 지원
- [x] 재고 관리에서 거래처별 아코디언 표시 기능
- [x] UDI에서 거래처 기반 바코드 형식 자동 결정
- [x] /order 페이지 거래처별 아코디언 구현
- [x] 더보기 기능을 수량 기준에서 월 단위로 개선

### ✅ 완료된 작업

- **새로운 GS1-128 바코드 형식 지원**

  - `lib/barcodeParser.ts`에 새로운 형식 파싱 로직 추가
  - 기존: `01 + 17 + 10` / 새로운: `01 + 17 + 30 + | + 10`
  - 파이프(|) 구분자로 자동 형식 판별
  - AI 30 (수량) 필드 건너뛰기 처리
  - 테스트 데이터에 두 형식 모두 포함

- **재고 관리 거래처별 아코디언 구현**

  - `AbleInventory.tsx`, `HospitalSpecificInventory.tsx` 대규모 수정
  - 거래처별 재고 자동 그룹핑 및 정렬
  - **스마트 표시 방식**: 거래처 1개면 아코디언 없이, 여러 개면 아코디언으로
  - 각 아코디언에 거래처명, 품목 수, 총 재고량 표시
  - 거래처명 컬럼 중복 제거 (아코디언 내부에서는 숨김)
  - 헤더에 `N개 거래처 • 총 재고: XXXea` 요약 정보 표시

- **UDI 거래처 기반 바코드 형식 자동 결정**

  - UDI 페이지에서 거래처 정보 조회 로직 추가
  - `types/udi.ts`에 `client_id` 필드 추가
  - **판별 조건**: CFN이 `225-`로 시작하거나 UPN이 `0693495594`로 시작
  - GS1 표준 소괄호 추가: `(01)`, `(17)`, `(30)`, `(10)`
  - 디버깅 로그로 거래처명, CFN, UPN, 적용 형식 확인 가능

- **오더 관리 거래처별 아코디언 구현**

  - `/order` 페이지를 거래처별 아코디언 방식으로 수정
  - **스마트 표시 방식**: 거래처 1개면 일반 테이블, 여러 개면 아코디언
  - 각 아코디언 헤더에 거래처명, 품목 수, 총 재고량, 6개월 사용량 표시
  - `OrderTableRow` 컴포넌트에 `showClientName` prop 추가
  - 거래처 컬럼 선택적 표시 기능 구현

- **페이지네이션 시스템 월 단위로 개선**
  - **문제점**: 기존 수량 기준(20개씩)으로 데이터가 명확하지 않음
  - **해결책**: 날짜 기준 월 단위 페이지네이션으로 변경
  - `usePagination` 훅 대폭 수정: 수량 → 월 단위
  - **로딩 방식**: 초기 1개월 → 더보기 시 1개월씩 추가 (최대 12개월)
  - **적용 페이지**: UDI, 교환관리, 사용기록, 입고관리, 출고관리 (총 5개)

### 🔧 기술적 세부사항

- **새로운 바코드 예시**:

  ```
  기존: 01069437182283941728011210LD240864
  새로운: 0106934955949364172703173001|104925512503
  ```

- **UDI GS1 형식**:

  ```
  기존: (01){UPN}(17){UBD}(10){LOT}
  새로운: (01){UPN}(17){UBD}(30)1|(10){LOT}
  ```

- **거래처별 아코디언 구조**:

  - `useMemo`로 실시간 그룹핑 최적화
  - `AccordionItem` 인터페이스 활용
  - `allowMultiple={true}`로 여러 아코디언 동시 확장

- **월 단위 페이지네이션**:

  - `getDateRange(isInitial)`: 날짜 범위 계산
  - `.gte("created_at", startDate).lt("created_at", endDate)`: 날짜 필터링
  - `updateHasMore()`: 최대 월 수 제한 기반 체크
  - 직관적인 "이번 달 → 지난 달" 순서

- **수정된 파일들**:
  - `lib/barcodeParser.ts` (새로운 형식 파싱)
  - `app/components/inventory/AbleInventory.tsx` (거래처별 아코디언)
  - `app/components/inventory/HospitalSpecificInventory.tsx` (거래처별 아코디언)
  - `app/order/page.tsx` (거래처별 아코디언)
  - `app/components/order/OrderTableRow.tsx` (조건부 거래처 컬럼)
  - `app/udi/page.tsx` (거래처 기반 형식 결정 + 월 단위)
  - `hooks/usePagination.ts` (월 단위 페이지네이션)
  - `app/exchange/page.tsx` (월 단위 페이지네이션)
  - `app/closing/page.tsx` (월 단위 페이지네이션)
  - `app/inbound/page.tsx` (월 단위 페이지네이션)
  - `app/outbound/page.tsx` (월 단위 페이지네이션)
  - `types/udi.ts` (client_id 필드 추가)

### 🐛 해결된 이슈

- 새로운 제품군의 바코드 파싱 불가 문제 해결
- 여러 거래처 제품이 섞여서 보이는 가독성 문제 해결
- UDI 엑셀에서 모든 제품이 기존 형식으로 고정되던 문제 해결
- GS1 표준 소괄호 누락 문제 해결
- **더보기 기능의 예측 불가능성 문제 해결** - 수량 → 월 단위로 직관적 개선
- 오더 관리에서 거래처별 데이터 분석의 어려움 해결

### 💡 배운 점

- 실제 바코드 데이터 패턴 분석의 중요성
- 제품군 확장을 고려한 확장 가능한 로직 설계
- 사용자 경험을 위한 조건부 UI 렌더링 (1개 vs 여러 개)
- 거래처 정보를 활용한 비즈니스 로직의 유연성
- **페이지네이션 UX의 중요성** - 예측 가능하고 직관적인 데이터 로딩
- 시간 기반 데이터 탐색의 자연스러운 흐름

### 📋 내일 할 일

- [ ] 새로운 바코드 형식 실제 테스트 및 검증
- [ ] 월 단위 페이지네이션 사용자 피드백 수집
- [ ] 거래처별 아코디언 UX 개선사항 검토
- [ ] 성능 최적화 검토

---

## 📅 2024년 12월 19일 (목)

### 🎯 오늘의 목표

- [x] Manual 페이지들 데이터베이스 연동 수정
- [x] 모바일 반응형 최적화
- [x] 테이블 UI/UX 개선

### ✅ 완료된 작업

- **Manual 페이지 데이터베이스 연동 수정**

  - `/closing/manual` 페이지에 날짜 선택 필드 추가
  - `movement_reason` 수정 ("manual_used" → "usage")
  - `inbound_date` 필드 추가로 실제 테이블 스키마에 맞춤
  - `/inbound/manual`, `/outbound/manual` 페이지 400 에러 해결
  - `locations` 테이블 구조에 맞춘 수정 (`reference_id` 사용)

- **모바일 반응형 최적화**

  - `/inventory` 페이지 모바일 최적화
  - 텍스트 1줄 처리 (truncate, 8자 이상 줄임표)
  - 버튼 아이콘화 (재고 감사: ⚠️, 새로고침: 🔄)
  - 탭 네비게이션 밑줄바 위치 수정 (스크롤 컨테이너 내부로 이동)
  - `/order` 페이지 테이블 구조 수정 (헤더와 행 컬럼 일치)

- **테이블 UI/UX 개선**

  - 레이아웃 정리: 제목+총재고 한 줄, 검색창+아이콘 한 줄
  - 테이블 컴팩트화: 패딩 조정 (`px-6 py-4` → `px-2 md:px-4 py-2`)
  - CFN 솔팅 버튼 약자화 ("length" → "L", "diameter" → "D")
  - 테이블 컬럼 정렬: CFN(왼쪽), LOT/UBD(가운데), 수량(오른쪽)
  - 검색창 배경색 추가 (`bg-primary/5`)
  - 플레이스홀더 간소화 ("CFN, LOT, 거래처명으로 검색..." → "검색")

- **아이콘 컴포넌트 확장**
  - `RefreshIcon`, `SearchIcon` 추가
  - 일관된 아이콘 사용으로 UI 통일성 확보

### 🔧 기술적 세부사항

- **데이터베이스 필드 수정**:

  - `movement_reason`: "manual_used" → "usage"
  - `inbound_date` 필드 추가
  - `locations.reference_id` 사용으로 올바른 조회

- **반응형 브레이크포인트**:

  - `sm:`: 640px 이상
  - `md:`: 768px 이상
  - `lg:`: 1024px 이상

- **수정된 파일들**:
  - `app/closing/manual/page.tsx`
  - `app/inbound/manual/page.tsx`
  - `app/outbound/manual/page.tsx`
  - `app/order/page.tsx`
  - `app/components/inventory/AbleInventory.tsx`
  - `app/components/inventory/HospitalSpecificInventory.tsx`
  - `app/components/inventory/InventoryTabs.tsx`
  - `app/components/ui/Table.tsx`
  - `app/components/ui/Icons.tsx`

### 🐛 해결된 이슈

- Manual 페이지들의 400 에러 해결
- 테이블 헤더와 행의 컬럼 불일치 문제 해결
- 탭 네비게이션 밑줄바 위치 오류 수정
- 모바일에서 텍스트 줄바꿈 문제 해결
- 검색창과 아이콘 버튼 레이아웃 정렬 문제 해결

### 💡 배운 점

- 실제 데이터베이스 스키마 파악의 중요성
- 모바일 우선 반응형 디자인의 효과
- 컴포넌트 재사용을 통한 일관성 확보
- 사용자 경험 개선을 위한 세밀한 조정의 가치

### 📋 내일 할 일

- [ ] 추가 모바일 최적화 검토
- [ ] 사용자 피드백 반영
- [ ] 성능 최적화 검토

---

## 📅 2024년 12월 18일 (수)

### 🎯 오늘의 목표

- [x] 목표 1
- [x] 목표2
- [x] 목표3

### ✅ 완료된 작업

- **교환 관리 기능 구현**

  - `/exchange` 페이지 생성 및 햄버거 메뉴에 추가
  - `ExchangeMethodModal.tsx` 모달 구현 (2단계 프로세스)
  - 실제 데이터베이스 연동 (hospitals, locations, stock_movements, products, clients)
  - 재고가 있는 창고만 표시하는 필터링 기능
  - 제품별 교환 수량 개별 설정 기능
  - 중복 창고/병원 제거 및 UI 개선

- **테이블 구조 통일**

  - ABLE 중앙창고 기준으로 모든 창고 페이지 테이블 컬럼 통일
  - CFN, LOT, UBD, 수량 컬럼으로 표준화 -거래처컬럼 제거

- **UI/UX 개선**

  - ABLE 중앙창고에 총 재고 수량 표시 추가
  - CFN 헤더에 정렬 토글 버튼 통합 (diameter/length)
  - 하드코딩된 버튼 스타일을 재사용 가능한 컴포넌트로 교체
    -5 페이지 리팩토링 완료

- **문서화**
  - README.md 완전 재작성
  - 재사용 가능한 컴포넌트 가이드라인 추가
  - DOs and DON'Ts 섹션 추가

### 🔧 기술적 세부사항

- **교환 흐름**: 병원 → ABLE → 거래처
- **ABLE 중앙창고 ID**: `c24e8564-4987-4cfd-bd0e9f05a4ab541`
- **리팩토링된 파일들**:
  - `AbleInventory.tsx`, `HospitalInventory.tsx`, `HospitalSpecificInventory.tsx`
  - `outbound/manual/page.tsx`, `order/page.tsx`, `closing/manual/page.tsx`
  - `BasicSettings.tsx`, `FormActions.tsx`

### 🐛 해결된 이슈

- 테이블 컬럼 불일치 문제 해결
- 하드코딩된 스타일 제거
- 정렬 버튼 레이블 오타 수정 (diameter)

### 💡 배운 점

- 재사용 가능한 컴포넌트의 중요성
- 일관된 UI/UX의 가치
- 체계적인 리팩토링 방법

### 📋 내일 할 일

- 다음 작업 계획
- [ ] 추가 개선사항 검토

---

## 📅 [날짜] (요일)

### 🎯 오늘의 목표

- [ ] 목표 1
- [ ] 목표2
- [ ] 목표3

### ✅ 완료된 작업

- **작업 카테고리**
  - 구체적인 작업 내용
  - 변경된 파일들
  - 주요 기능 설명

### 🔧 기술적 세부사항

- 사용된 기술이나 라이브러리
- 중요한 설정값이나 ID
- 변경된 파일 목록

### 🐛 해결된 이슈

- 버그나 문제점
- 해결 방법

### 💡 배운 점

- 새로 알게 된 것들
- 개선된 점들

### 📋 내일 할 일

- 다음 작업 계획
- [ ] 추가 개선사항

---

## 📊 프로젝트 통계

- **총 작업일**: 4일
- **완료된 기능**: 15개
- **리팩토링된 파일**: 22개
- **해결된 이슈**: 15개
