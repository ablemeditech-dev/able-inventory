# ABLE Inventory Management System

의료기기 재고 관리 시스템 - Next.js, TypeScript, Tailwind CSS, Supabase

## 🚀 빠른 시작

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 📦 재사용 컴포넌트 가이드

### 🔴 중요: 절대 하드코딩하지 마세요!

아래 컴포넌트들을 **반드시** 사용하세요. 직접 스타일을 작성하면 안됩니다.

---

## 🎯 Button 컴포넌트

**파일:** `app/components/ui/Button.tsx`

```typescript
import Button, { LinkButton, IconButton } from '@/app/components/ui/Button';

// ✅ 올바른 사용법
<Button variant="primary" onClick={handleClick}>저장</Button>
<Button variant="secondary" loading={isLoading}>처리중</Button>
<LinkButton href="/settings" variant="outline">설정</LinkButton>

// ❌ 절대 이렇게 하지 마세요
<button className="bg-blue-500 text-white px-4 py-2">저장</button>
```

**사용 가능한 variant:**

- `primary` - 기본 버튼 (파란색)
- `secondary` - 보조 버튼 (회색)
- `success` - 성공 버튼 (초록색)
- `warning` - 경고 버튼 (노란색)
- `danger` - 위험 버튼 (빨간색)
- `outline` - 테두리 버튼
- `ghost` - 투명 버튼

**크기:** `sm`, `md`, `lg`

---

## 🏷️ Alert 컴포넌트

**파일:** `app/components/ui/Alert.tsx`

```typescript
import Alert from '@/app/components/ui/Alert';

// ✅ 올바른 사용법
<Alert type="error" message="오류가 발생했습니다" />
<Alert type="success" message="저장되었습니다" />
<Alert type="warning" message="주의하세요" />

// ❌ 절대 이렇게 하지 마세요
<div className="bg-red-100 border border-red-300">오류 메시지</div>
```

**타입:** `error`, `success`, `warning`, `info`

---

## 🏷️ Badge 컴포넌트

**파일:** `app/components/ui/Badge.tsx`

```typescript
import Badge from '@/app/components/ui/Badge';

// ✅ 올바른 사용법
<Badge variant="success">활성</Badge>
<Badge variant="error">비활성</Badge>
<Badge variant="warning">보류</Badge>

// ❌ 절대 이렇게 하지 마세요
<span className="bg-green-100 text-green-800 px-2 py-1">활성</span>
```

---

## 📊 Table 컴포넌트

**파일:** `app/components/ui/Table.tsx`

```typescript
import Table, { TableColumn, formatDate, formatNumber } from '@/app/components/ui/Table';

// ✅ 올바른 사용법
const columns: TableColumn<InventoryItem>[] = [
  { key: 'cfn', header: 'CFN' },
  { key: 'quantity', header: '수량', align: 'right' },
];

<Table
  columns={columns}
  data={inventory}
  loading={loading}
  error={error}
  onRetry={refetch}
/>

// ❌ 절대 이렇게 하지 마세요
<table>
  <thead><tr><th>CFN</th></tr></thead>
  <tbody>...</tbody>
</table>
```

**헬퍼 함수들:**

- `formatDate(dateString)` - 날짜 포맷팅
- `formatNumber(number)` - 숫자 천단위 구분
- `formatQuantity(number)` - "1,234개" 형식

---

## 🎛️ TableActions 컴포넌트

**파일:** `app/components/ui/TableActions.tsx`

```typescript
import TableActions, { ActionButton } from '@/app/components/ui/TableActions';

// ✅ 올바른 사용법
const actions: ActionButton[] = [
  { label: '새로고침', onClick: refetch, variant: 'primary' },
  { label: '내보내기', onClick: exportData, variant: 'secondary' }
];

<TableActions
  title="재고 현황"
  searchPlaceholder="CFN, LOT로 검색..."
  searchValue={searchTerm}
  onSearchChange={setSearchTerm}
  actions={actions}
/>

// ❌ 절대 이렇게 하지 마세요
<div className="flex justify-between">
  <h1>제목</h1>
  <button>새로고침</button>
</div>
```

---

## 📝 Form 컴포넌트들

**파일:** `app/components/forms/FormActions.tsx`

```typescript
import { FormActions } from '@/app/components/forms/FormActions';

// ✅ 올바른 사용법
<FormActions
  loading={isSubmitting}
  submitText="저장"
  cancelHref="/back"
/>

// ❌ 절대 이렇게 하지 마세요
<div className="flex gap-4">
  <button className="bg-blue-500">저장</button>
  <a className="bg-gray-500">취소</a>
</div>
```

---

## 🎨 색상 사용법

**파일:** `tailwind.config.ts`에서 정의된 색상만 사용

```typescript
// ✅ 올바른 사용법
className = "text-text-primary bg-background border-border";
className = "text-primary bg-accent-light";
className = "text-error bg-status-error-bg";

// ❌ 절대 이렇게 하지 마세요
className = "text-gray-900 bg-red-100 border-blue-500";
```

**주요 색상:**

- `text-primary` - 메인 텍스트
- `text-secondary` - 보조 텍스트
- `bg-background` - 배경색
- `border-border` - 테두리
- `text-error`, `text-success`, `text-warning` - 상태 색상

---

## 🔧 훅(Hooks) 사용법

### 재고 관리

```typescript
// ABLE 중앙창고
import { useAbleInventory } from "@/hooks/inventory";
const { inventory, loading, error, refetch } = useAbleInventory();

// 병원별 재고
import { useHospitalInventory } from "@/hooks/inventory";
const { inventory, loading, error } = useHospitalInventory(hospitalId);
```

### 폼 관리

```typescript
import { useForm } from "@/hooks/useForm";

const { formData, errors, handleChange, handleSubmit } = useForm({
  initialData: { name: "", email: "" },
  onSubmit: async (data) => {
    /* 제출 로직 */
  },
});
```

---

## ✅ DO / ❌ DON'T

### 버튼

```typescript
// ✅ DO
<Button variant="primary">클릭</Button>

// ❌ DON'T
<button className="bg-blue-500 text-white px-4 py-2">클릭</button>
```

### 메시지

```typescript
// ✅ DO
<Alert type="error" message="오류 발생" />

// ❌ DON'T
<div className="bg-red-100 text-red-700">오류 발생</div>
```

### 테이블

```typescript
// ✅ DO
<Table columns={columns} data={data} />

// ❌ DON'T
<table><tr><td>직접 구현</td></tr></table>
```

### 색상

```typescript
// ✅ DO
className = "text-text-primary bg-background";

// ❌ DON'T
className = "text-gray-900 bg-white";
```

---

## 📈 리팩토링 성과

- **29개 파일** 리팩토링 완료
- **코드 49.7% 감소** (1,962 → 987 라인)
- **하드코딩 제거** 완료
- **일관된 UI/UX** 확보

---

## 🎯 새 페이지 만들 때

1. **Button 컴포넌트** 사용
2. **Alert 컴포넌트** 사용
3. **Table + TableActions** 사용
4. **테마 색상**만 사용
5. **적절한 훅** 활용

**절대 하드코딩하지 마세요!** 🚫

---

## 📚 주요 폴더

```
app/
├── components/ui/        # 🎯 여기서 컴포넌트 가져오기
├── components/forms/     # 폼 관련 컴포넌트
└── components/inventory/ # 재고 관련 컴포넌트

hooks/                    # 🎯 여기서 훅 가져오기
└── inventory/           # 재고 관리 훅
```

---

## 🚀 배포

```bash
npm run build
```

환경 변수:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
