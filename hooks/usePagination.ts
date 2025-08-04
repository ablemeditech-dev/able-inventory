import { useState, useCallback } from 'react';
import { SYSTEM_CONSTANTS } from '../lib/constants';

// 페이지네이션 옵션
interface PaginationOptions {
  initialMonths?: number; // 초기 로드할 개월 수 (기본: 1개월)
  monthsPerPage?: number; // 더보기 시 추가로 로드할 개월 수 (기본: 1개월)
  maxMonthsLimit?: number; // 최대 조회 가능한 개월 수 (기본: 12개월)
}

// 날짜 범위 인터페이스
export interface DateRange {
  startDate: string;
  endDate: string;
}

// 페이지네이션 훅 (월 단위)
export const usePagination = (options: PaginationOptions = {}) => {
  const {
    initialMonths = 1, // 초기 1개월
    monthsPerPage = 1, // 더보기 시 1개월씩 추가
    maxMonthsLimit = 12, // 최대 12개월
  } = options;

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentMonths, setCurrentMonths] = useState(initialMonths);

  // 월 단위 날짜 범위 계산
  const getDateRange = useCallback((isInitial: boolean): DateRange => {
    const today = new Date();

    if (isInitial) {
      // 초기 로드: initialMonths만큼 과거 월부터 현재까지
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // 현재 월 마지막 날
      endDate.setHours(23, 59, 59, 999);
      
      // initialMonths개월 전부터 시작
      const targetMonth = today.getMonth() - (initialMonths - 1);
      const targetYear = today.getFullYear();
      
      // 음수 월 처리 (작년으로 넘어가는 경우)
      let finalYear = targetYear;
      let finalMonth = targetMonth;
      if (targetMonth < 0) {
        finalYear = targetYear - 1;
        finalMonth = 12 + targetMonth; // targetMonth가 음수이므로 더하기
      }
      
      const startDate = new Date(finalYear, finalMonth, 1); // 해당 월 첫 날
      startDate.setHours(0, 0, 0, 0);
      
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    } else {
      // 더보기: 이전 월 구간만 조회 (currentMonths번째 이전 월)
      const targetMonth = today.getMonth() - currentMonths; // currentMonths만큼 이전 월
      const targetYear = today.getFullYear();
      
      // 음수 월 처리 (작년으로 넘어가는 경우)
      let finalYear = targetYear;
      let finalMonth = targetMonth;
      if (targetMonth < 0) {
        finalYear = targetYear - 1;
        finalMonth = 12 + targetMonth; // targetMonth가 음수이므로 더하기
      }
      
      const endDate = new Date(finalYear, finalMonth + 1, 0); // 해당 월 마지막 날
      endDate.setHours(23, 59, 59, 999);
      
      const startDate = new Date(finalYear, finalMonth, 1); // 해당 월 첫 날  
      startDate.setHours(0, 0, 0, 0);
      
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    }
  }, [currentMonths, initialMonths]);

  // 더 많은 데이터가 있는지 확인 - 최대 월 수 제한을 우선으로 고려
  const updateHasMore = useCallback((hasData: boolean = true) => {
    const canLoadMore = currentMonths < maxMonthsLimit;
    // 데이터가 없더라도 최대 월 수 제한까지는 더보기 허용
    // (연속으로 빈 월이 있을 수 있으므로)
    setHasMore(canLoadMore);
  }, [currentMonths, maxMonthsLimit]);

  // 페이지 상태 초기화
  const resetPagination = useCallback(() => {
    setCurrentMonths(initialMonths);
    setHasMore(true);
    setLoading(true);
    setLoadingMore(false);
  }, [initialMonths]);

  // 다음 페이지(월)로 이동
  const nextPage = useCallback(() => {
    setCurrentMonths(prev => prev + monthsPerPage);
  }, [monthsPerPage]);

  // 로딩 상태 관리
  const setLoadingState = useCallback((isInitial: boolean, isLoading: boolean) => {
    if (isInitial) {
      setLoading(isLoading);
    } else {
      setLoadingMore(isLoading);
    }
  }, []);

  // 현재 로드된 기간 정보 (디버그/표시용)
  const getCurrentPeriodInfo = useCallback(() => {
    const { startDate, endDate } = getDateRange(false);
    return {
      monthsLoaded: currentMonths,
      startDate: new Date(startDate).toLocaleDateString('ko-KR'),
      endDate: new Date(endDate).toLocaleDateString('ko-KR'),
    };
  }, [currentMonths, getDateRange]);

  return {
    // 상태
    loading,
    loadingMore,
    hasMore,
    currentMonths,
    
    // 헬퍼 함수
    getDateRange,
    updateHasMore,
    resetPagination,
    nextPage,
    setLoadingState,
    getCurrentPeriodInfo,
    
    // 상수
    initialMonths,
    monthsPerPage,
    maxMonthsLimit,
  };
}; 