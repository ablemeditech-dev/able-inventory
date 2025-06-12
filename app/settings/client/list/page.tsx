'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { clientsAPI, Client } from '../../../../lib/supabase'

export default function ClientsListPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setLoading(true)
      const { data, error } = await clientsAPI.getAll()
      
      if (error) {
        throw error
      }
      
      setClients(data || [])
    } catch (err) {
      console.error('거래처 로딩 실패:', err)
      setError('거래처 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    
    try {
      const { error } = await clientsAPI.delete(id)
      if (error) throw error
      
      // 목록에서 제거
      setClients(clients.filter(client => client.id !== id))
    } catch (err) {
      console.error('삭제 실패:', err)
      alert('삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">거래처 목록</h1>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-text-secondary">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">거래처 목록</h1>
        <Link 
          href="/settings"
          className="px-4 py-2 bg-primary text-text-primary rounded-lg hover:bg-accent-soft transition-colors"
        >
          ← 돌아가기
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 클라이언트 카드 목록 */}
      {clients.length === 0 ? (
        <div className="bg-accent-light rounded-lg shadow p-8 text-center">
          <p className="text-text-secondary">등록된 거래처가 없습니다.</p>
          <Link 
            href="/settings"
            className="inline-block mt-4 px-4 py-2 bg-primary text-text-primary rounded hover:bg-accent-soft transition-colors"
          >
            ← 돌아가기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <div key={client.id} className="overflow-hidden rounded-lg shadow hover:shadow-md transition-shadow">
              {/* 첫 줄: 거래처명 + 아이콘들 (테마컬러 배경) */}
              <div className="bg-accent-light py-3 px-4 flex items-center justify-between">
                <div className="font-medium text-gray-900">
                  {client.company_name}
                </div>
                <div className="flex items-center space-x-2">
                  <Link 
                    href={`/settings/client/edit/${client.id}`}
                    className="p-1 text-primary hover:text-accent-soft transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                  <button 
                    className="p-1 text-primary hover:text-accent-soft transition-colors"
                    onClick={() => handleDelete(client.id!)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* 나머지 정보들 (흰색 배경) */}
              <div className="bg-white p-4 space-y-2 border-t border-gray-200">
                {/* 담당자명 */}
                <div className="text-text-secondary text-sm">
                  {client.contact_person || '-'}
                </div>
                
                {/* 연락처 */}
                <div className="text-text-secondary text-sm">
                  {client.phone || '-'}
                </div>
                
                {/* 이메일 */}
                <div className="text-text-secondary text-sm">
                  {client.email || '-'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}