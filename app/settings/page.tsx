'use client'

import { useState } from 'react'
import SettingsTabs from '../components/settings/SettingsTabs'
import BasicSettings from '../components/settings/BasicSettings'
import UserSettings from '../components/settings/UserSettings'
import SystemSettings from '../components/settings/SystemSettings'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('basic')

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return <BasicSettings />
      case 'users':
        return <UserSettings />
      case 'system':
        return <SystemSettings />
      default:
        return <BasicSettings />
    }
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
      </div>

      {/* 탭 네비게이션 */}
      <SettingsTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* 탭 콘텐츠 */}
      <div className="min-h-0">
        {renderTabContent()}
      </div>
    </div>
  )
}