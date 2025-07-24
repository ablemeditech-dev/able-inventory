# 📝 작업 기록 (REMEMBER.md)

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

- **새로 생성된 파일**:

  - `app/components/modals/ProductInfoModal.tsx`

- **주요 기능**:
  - `BaseModal` 컴포넌트 활용한 일관된 모달 UI
  - `LoadingSpinner` 컴포넌트로 로딩 상태 표시
  - Supabase 연동으로 실시간 제품 정보 조회
  - 반응형 디자인 (모바일/데스크톱 최적화)

### 🐛 해결된 이슈

- LoadingSpinner 컴포넌트 export 방식 불일치 해결
- 제품 정보 모달에서 불필요한 ID 표시 제거
- import 오류로 인한 빌드 실패 해결
- **ProductInfo 타입 에러 최종 해결**
  - 문제: `clients` 필드가 `undefined`만 허용했지만 `null` 할당으로 타입 불일치
  - 해결: `ProductInfo` 인터페이스에서 `clients?: { company_name: string; } | null`로 수정
  - 결과: 모든 케이스(객체, null, undefined) 안전하게 처리

### 💡 배운 점

- Default export vs Named export 구분의 중요성
- 사용자 중심의 UI 설계 (불필요한 기술적 정보 제거)
- 재사용 가능한 모달 컴포넌트의 활용
- 일관된 테마 적용을 통한 사용자 경험 통일

### 📋 내일 할 일

- [ ] 다른 페이지들에 ProductInfoModal 적용 (inventory, order 등)
- [ ] 제품 정보 모달 사용성 테스트
- [ ] 추가 제품 정보 필드 검토

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

- **총 작업일**: 2일
- **완료된 기능**: 8개
- **리팩토링된 파일**: 14개
- **해결된 이슈**: 8개
