export default function UserSettings() {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-accent-light p-4 rounded-lg">
        <h3 className="font-semibold mb-2">👤 프로필 설정</h3>
        <p className="text-text-secondary text-sm">개인 정보 및 프로필을 관리합니다.</p>
      </div>
      
      <div className="bg-accent-light p-4 rounded-lg">
        <h3 className="font-semibold mb-2">🔔 알림 설정</h3>
        <p className="text-text-secondary text-sm">알림 환경을 설정합니다.</p>
      </div>
      
      <div className="bg-accent-light p-4 rounded-lg">
        <h3 className="font-semibold mb-2">🔐 보안 설정</h3>
        <p className="text-text-secondary text-sm">비밀번호 및 보안 옵션을 관리합니다.</p>
      </div>
    </div>
  )
}