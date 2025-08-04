# 📊 DATABASE 문서

> **ABLE INVENTORY 시스템 데이터베이스 스키마 및 참조 가이드**  
> 매번 헷갈리는 필드값들과 테이블 관계를 한 곳에 정리한 문서입니다.

---

## 📋 목차

- [주요 테이블](#주요-테이블)
- [stock_movements 테이블 상세](#stock_movements-테이블-상세)
- [페이지별 쿼리 조건](#페이지별-쿼리-조건)
- [중요한 상수값](#중요한-상수값)
- [테이블 관계도](#테이블-관계도)
- [자주 사용하는 쿼리](#자주-사용하는-쿼리)

---

## 📚 주요 테이블

### `stock_movements` (재고 이동)

> **핵심 테이블**: 모든 입고/출고/교환 기록을 관리

| 필드명             | 타입      | 설명                           | 예시값                 |
| ------------------ | --------- | ------------------------------ | ---------------------- |
| `id`               | UUID      | 기본키                         | `abc123...`            |
| `created_at`       | timestamp | 생성일시                       | `2024-12-22T10:30:00Z` |
| `inbound_date`     | date      | 실제 입고/출고일               | `2024-12-22`           |
| `product_id`       | UUID      | 제품 ID (products 테이블 참조) | `def456...`            |
| `from_location_id` | UUID      | 출발지 ID                      | `c24e8564...`          |
| `to_location_id`   | UUID      | 도착지 ID                      | `ghi789...`            |
| `quantity`         | integer   | 수량                           | `10`                   |
| `lot_number`       | string    | LOT 번호                       | `LD240864`             |
| `ubd_date`         | date      | 사용기한                       | `2027-03-15`           |
| `movement_type`    | enum      | **이동 유형 (`in` / `out`)**   | `out`                  |
| `movement_reason`  | enum      | **이동 사유**                  | `sale`                 |
| `notes`            | text      | 메모                           | `수동 출고`            |

### `products` (제품)

| 필드명        | 타입   | 설명            |
| ------------- | ------ | --------------- |
| `id`          | UUID   | 기본키          |
| `cfn`         | string | 제품 코드 (CFN) |
| `upn`         | string | UPN 코드        |
| `description` | string | 제품 설명       |
| `client_id`   | UUID   | 거래처 ID       |

### `clients` (거래처)

| 필드명         | 타입   | 설명     |
| -------------- | ------ | -------- |
| `id`           | UUID   | 기본키   |
| `company_name` | string | 거래처명 |

### `hospitals` (병원)

| 필드명          | 타입   | 설명   |
| --------------- | ------ | ------ |
| `id`            | UUID   | 기본키 |
| `hospital_name` | string | 병원명 |

### `locations` (창고/위치)

| 필드명          | 타입   | 설명                 |
| --------------- | ------ | -------------------- |
| `id`            | UUID   | 기본키               |
| `location_name` | string | 위치명               |
| `reference_id`  | UUID   | 참조 ID (병원 ID 등) |

---

## 🔄 stock_movements 테이블 상세

### `movement_type` (이동 유형)

| 값    | 의미     | 사용 페이지                      |
| ----- | -------- | -------------------------------- |
| `in`  | **입고** | `/inbound`, `/exchange`          |
| `out` | **출고** | `/outbound`, `/udi`, `/exchange` |

### `movement_reason` (이동 사유)

| 값            | 의미          | 사용 상황                           | 사용 페이지         |
| ------------- | ------------- | ----------------------------------- | ------------------- |
| `sale`        | **판매 출고** | 병원으로 정상 출고                  | `/outbound`, `/udi` |
| `usage`       | **사용 완료** | 제품 사용 완료 기록                 | `/closing/manual`   |
| `exchange`    | **교환**      | 불량품 교환                         | `/exchange`         |
| `manual_used` | **수동 사용** | 이전 버전에서 사용 (현재는 `usage`) | ⚠️ 사용 안함        |

### ⚠️ 헷갈리기 쉬운 포인트

- **출고**: `movement_type: "out"` + `movement_reason: "sale"`
- **사용완료**: `movement_type: "out"` + `movement_reason: "usage"`
- **교환(회수)**: `movement_type: "out"` + `movement_reason: "exchange"`
- **교환(신품)**: `movement_type: "in"` + `movement_reason: "exchange"`

---

## 📄 페이지별 쿼리 조건

### `/outbound` (출고 관리)

```sql
SELECT * FROM stock_movements
WHERE movement_type = 'out'
  AND movement_reason = 'sale'
  AND created_at >= '2024-10-01'
  AND created_at < '2025-01-01'
ORDER BY inbound_date DESC;
```

### `/inbound` (입고 관리)

```sql
SELECT * FROM stock_movements
WHERE movement_type = 'in'
  AND created_at >= '2024-10-01'
  AND created_at < '2025-01-01'
ORDER BY inbound_date DESC;
```

### `/exchange` (교환 관리)

```sql
SELECT * FROM stock_movements
WHERE movement_reason = 'exchange'
  AND created_at >= '2024-10-01'
  AND created_at < '2025-01-01'
ORDER BY inbound_date DESC;
```

### `/udi` (UDI 관리)

```sql
-- /outbound와 동일한 조건
SELECT * FROM stock_movements
WHERE movement_type = 'out'
  AND movement_reason = 'sale'
  AND created_at >= '2024-10-01'
  AND created_at < '2025-01-01'
ORDER BY inbound_date DESC;
```

### `/closing/manual` (사용 완료)

```sql
INSERT INTO stock_movements (
  movement_type, movement_reason, ...
) VALUES (
  'out', 'usage', ...
);
```

### `/outbound/manual` (수동 출고)

```sql
INSERT INTO stock_movements (
  movement_type, movement_reason, ...
) VALUES (
  'out', 'sale', ...
);
```

---

## 🔑 중요한 상수값

### ABLE 중앙창고 ID

```typescript
const ABLE_WAREHOUSE_ID = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";
```

- **용도**: 중앙창고와 병원 간 재고 이동 식별
- **위치**: `lib/constants.ts` → `SYSTEM_CONSTANTS.ABLE_WAREHOUSE_ID`

### 페이지네이션 기본값

```typescript
// hooks/usePagination.ts
const defaultOptions = {
  initialMonths: 1, // 초기 로드할 개월 수
  monthsPerPage: 1, // 더보기 시 추가 개월 수
  maxMonthsLimit: 12, // 최대 조회 가능 개월 수
};
```

---

## 🔗 테이블 관계도

```
products ────┐
            ├── stock_movements
clients ─────┤
            │
            ├── from_location_id ──── locations
            └── to_location_id   ──── hospitals
```

### 조인 예시

```sql
SELECT
  sm.*,
  p.cfn,
  p.description,
  c.company_name,
  l1.location_name as from_location,
  l2.location_name as to_location
FROM stock_movements sm
LEFT JOIN products p ON sm.product_id = p.id
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN locations l1 ON sm.from_location_id = l1.id
LEFT JOIN locations l2 ON sm.to_location_id = l2.id;
```

---

## 🚀 자주 사용하는 쿼리

### 1. 거래처별 제품 조회

```sql
SELECT p.* FROM products p
WHERE p.client_id = 'client-uuid-here'
ORDER BY p.cfn;
```

### 2. ABLE 중앙창고 재고 계산

```sql
-- 특정 제품의 LOT별 재고량
SELECT
  product_id,
  lot_number,
  ubd_date,
  SUM(CASE
    WHEN to_location_id = 'able-warehouse-id' THEN quantity
    WHEN from_location_id = 'able-warehouse-id' THEN -quantity
    ELSE 0
  END) as current_stock
FROM stock_movements
WHERE product_id = 'product-uuid-here'
  AND (from_location_id = 'able-warehouse-id' OR to_location_id = 'able-warehouse-id')
GROUP BY product_id, lot_number, ubd_date
HAVING current_stock > 0
ORDER BY ubd_date;
```

### 3. 월별 출고 통계

```sql
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_movements,
  SUM(quantity) as total_quantity
FROM stock_movements
WHERE movement_type = 'out'
  AND movement_reason = 'sale'
  AND created_at >= '2024-01-01'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

### 4. 병원별 사용량

```sql
SELECT
  h.hospital_name,
  p.cfn,
  SUM(sm.quantity) as total_used
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
JOIN hospitals h ON sm.to_location_id = h.id
WHERE sm.movement_type = 'out'
  AND sm.movement_reason = 'sale'
  AND sm.created_at >= '2024-06-01'
GROUP BY h.hospital_name, p.cfn
ORDER BY h.hospital_name, total_used DESC;
```

---

## 🛠️ 개발 팁

### 날짜 필터링 주의사항

- **조회**: `created_at` 기준으로 필터링
- **정렬**: `inbound_date` 기준으로 정렬 (실제 처리일)
- **월 단위 페이지네이션**: `usePagination` 훅 사용

### 바코드 형식 판별

```typescript
// CFN 또는 UPN 패턴으로 바코드 형식 결정
const useNewFormat =
  cfn.startsWith("225-") || // CFN 패턴
  upn.startsWith("0693495594"); // UPN 패턴

if (useNewFormat) {
  // 새로운 GS1 형식: (01) + (17) + (30) + | + (10)
  gs1Format = `(01)${upn}(17)${ubdFormatted}(30)1|(10)${lotNumber}`;
} else {
  // 기존 GS1 형식: (01) + (17) + (10)
  gs1Format = `(01)${upn}(17)${ubdFormatted}(10)${lotNumber}`;
}
```

---

## 📝 변경 이력

| 날짜       | 변경 내용                                     | 작성자    |
| ---------- | --------------------------------------------- | --------- |
| 2024-12-22 | 초기 문서 생성, 주요 테이블 및 쿼리 조건 정리 | Assistant |

---

> **💡 Tip**: 이 문서는 지속적으로 업데이트됩니다. 새로운 테이블이나 필드가 추가되면 여기에 기록해주세요!
