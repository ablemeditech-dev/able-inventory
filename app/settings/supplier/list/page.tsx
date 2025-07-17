'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { suppliersAPI, Supplier } from '../../../../lib/supabase'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import { EditIcon, TrashIcon } from "../../../components/ui/Icons";
import { PageLoading } from "../../../components/ui/LoadingSpinner";

export default function SuppliersListPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const { data, error } = await suppliersAPI.getAll()
      
      if (error) {
        throw error
      }
      
      setSuppliers(data || [])
    } catch (err) {
      console.error('공급업체 로딩 실패:', err)
      setError('공급업체 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    
    try {
      const { error } = await suppliersAPI.delete(id)
      if (error) throw error
      
      // 목록에서 제거
      setSuppliers(suppliers.filter(supplier => supplier.id !== id))
    } catch (err) {
      console.error('삭제 실패:', err)
      alert('삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">공급업체 목록</h1>
        <PageLoading />
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">공급업체 목록</h1>
        <Link href="/settings">
          <Button variant="secondary">← 돌아가기</Button>
        </Link>
      </div>

      {error && (
        <Alert type="error" message={error} />
      )}

      {/* 공급업체 카드 목록 */}
      {suppliers.length === 0 ? (
        <div className="bg-accent-light rounded-lg shadow p-8 text-center">
          <p className="text-text-secondary mb-4">등록된 공급업체가 없습니다.</p>
          <Link href="/settings/supplier/add">
            <Button variant="primary">공급업체 추가</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="overflow-hidden rounded-lg shadow hover:shadow-md transition-shadow">
              {/* 첫 줄: 병원명 + 아이콘들 (테마컬러 배경) */}
              <div className="bg-accent-light py-3 px-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="font-medium text-gray-900">
                    {supplier.hospital_name}
                  </div>
                  {supplier.hospital_code && (
                    <Badge variant="default">
                      {supplier.hospital_code}
                    </Badge>
                  )}
                  {!supplier.is_active && (
                    <Badge variant="error">
                      비활성
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Link 
                    href={`/settings/supplier/edit/${supplier.id}`}
                    className="p-1 text-primary hover:text-accent-soft transition-colors"
                  >
                    <EditIcon size="sm" />
                  </Link>
                  <button 
                    className="p-1 text-primary hover:text-accent-soft transition-colors"
                    onClick={() => handleDelete(supplier.id!)}
                  >
                    <TrashIcon size="sm" />
                  </button>
                </div>
              </div>
              
              {/* 나머지 정보들 (흰색 배경) */}
              <div className="bg-white p-4 space-y-2 border-t border-gray-200">
                {/* 담당자명 */}
                <div className="text-text-secondary text-sm">
                  <span className="font-medium">담당자:</span> {supplier.contact_person || '-'}
                </div>
                
                {/* 연락처 */}
                <div className="text-text-secondary text-sm">
                  <span className="font-medium">연락처:</span> {supplier.phone || '-'}
                </div>
                
                {/* 이메일 */}
                <div className="text-text-secondary text-sm">
                  <span className="font-medium">이메일:</span> {supplier.email || '-'}
                </div>
                
                {/* 주소 */}
                {(supplier.address || supplier.city) && (
                  <div className="text-text-secondary text-sm">
                    <span className="font-medium">주소:</span> {supplier.city && `${supplier.city} `}{supplier.address || '-'}
                  </div>
                )}
                
                {/* 사업자번호 */}
                {supplier.business_number && (
                  <div className="text-text-secondary text-sm">
                    <span className="font-medium">사업자번호:</span> {supplier.business_number}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}