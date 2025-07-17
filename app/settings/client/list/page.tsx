'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { clientsAPI, Client } from '../../../../lib/supabase'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import { EditIcon, TrashIcon } from "../../../components/ui/Icons";
import { PageLoading } from "../../../components/ui/LoadingSpinner";

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
        <PageLoading />
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">거래처 목록</h1>
        <Link href="/settings">
          <Button variant="secondary">← 돌아가기</Button>
        </Link>
      </div>

      {error && (
        <Alert type="error" message={error} />
      )}

      {/* 클라이언트 카드 목록 */}
      {clients.length === 0 ? (
        <div className="bg-accent-light rounded-lg shadow p-8 text-center">
          <p className="text-text-secondary mb-4">등록된 거래처가 없습니다.</p>
          <Link href="/settings">
            <Button variant="secondary">← 돌아가기</Button>
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
                    <EditIcon size="sm" />
                  </Link>
                  <button 
                    className="p-1 text-primary hover:text-accent-soft transition-colors"
                    onClick={() => handleDelete(client.id!)}
                  >
                    <TrashIcon size="sm" />
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