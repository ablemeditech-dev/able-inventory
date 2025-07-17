import { useState, useCallback } from 'react';
import { SYSTEM_CONSTANTS } from '../lib/constants';

// 페이지네이션 옵션
interface PaginationOptions {
  recordsPerPage?: number;
  monthsLimit?: number; // 최근 몇 개월까지 조회할지
}

// 페이지네이션 훅
export const usePagination = (options: PaginationOptions = {}) => {
  const {
    recordsPerPage = SYSTEM_CONSTANTS.PAGINATION.DEFAULT_RECORDS_PER_PAGE,
    monthsLimit = SYSTEM_CONSTANTS.PAGINATION.DEFAULT_MONTHS_LIMIT,
  } = options;

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // 날짜 필터 생성
  const getDateFilter = useCallback(() => {
    const limitDate = new Date();
    limitDate.setMonth(limitDate.getMonth() - monthsLimit);
    return limitDate.toISOString();
  }, [monthsLimit]);

  // 페이지네이션 범위 계산
  const getRange = useCallback((isInitial: boolean) => {
    const from = isInitial ? 0 : currentPage * recordsPerPage;
    const to = from + recordsPerPage - 1;
    return { from, to };
  }, [currentPage, recordsPerPage]);

  // 더 많은 데이터가 있는지 확인
  const updateHasMore = useCallback((from: number, count: number | null) => {
    if (count !== null) {
      setHasMore(from + recordsPerPage < count);
    }
  }, [recordsPerPage]);

  // 페이지 상태 초기화
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setHasMore(true);
    setLoading(true);
    setLoadingMore(false);
  }, []);

  // 다음 페이지로 이동
  const nextPage = useCallback(() => {
    setCurrentPage(prev => prev + 1);
  }, []);

  // 로딩 상태 관리
  const setLoadingState = useCallback((isInitial: boolean, isLoading: boolean) => {
    if (isInitial) {
      setLoading(isLoading);
    } else {
      setLoadingMore(isLoading);
    }
  }, []);

  return {
    // 상태
    loading,
    loadingMore,
    hasMore,
    currentPage,
    
    // 헬퍼 함수
    getDateFilter,
    getRange,
    updateHasMore,
    resetPagination,
    nextPage,
    setLoadingState,
    
    // 상수
    recordsPerPage,
    monthsLimit,
  };
}; 