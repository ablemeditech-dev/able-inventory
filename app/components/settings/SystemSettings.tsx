export default function SystemSettings() {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-accent-light p-4 rounded-lg">
        <h3 className="font-semibold mb-2">🌍 언어 설정</h3>
        <p className="text-text-secondary text-sm">시스템 언어를 변경합니다.</p>
      </div>
      
      <div className="bg-accent-light p-4 rounded-lg">
        <h3 className="font-semibold mb-2">🎨 테마 설정</h3>
        <p className="text-text-secondary text-sm">앱 테마 및 색상을 설정합니다.</p>
      </div>
      
      <div className="bg-accent-light p-4 rounded-lg">
        <h3 className="font-semibold mb-2">💾 백업 설정</h3>
        <p className="text-text-secondary text-sm">데이터 백업 및 복원을 관리합니다.</p>
      </div>
      
      <div className="bg-accent-light p-4 rounded-lg">
        <h3 className="font-semibold mb-2">📊 시스템 정보</h3>
        <p className="text-text-secondary text-sm">버전 정보 및 시스템 상태를 확인합니다.</p>
      </div>
    </div>
  )
}