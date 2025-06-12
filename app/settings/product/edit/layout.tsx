import { Suspense } from "react";

export default function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-text-secondary">로딩 중...</p>
        </div>
      </div>
    }>
      {children}
    </Suspense>
  );
}