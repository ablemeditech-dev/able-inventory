import React, { useState } from 'react';
import { ChevronDownIcon } from './Icons';

// 아코디언 아이템 인터페이스
export interface AccordionItem {
  id: string;
  header: React.ReactNode;
  content: React.ReactNode;
  defaultExpanded?: boolean;
}

// 아코디언 컴포넌트 props
interface AccordionProps {
  items: AccordionItem[];
  className?: string;
  allowMultiple?: boolean; // 여러 아이템 동시 확장 허용
}

// 개별 아코디언 아이템 props
interface AccordionItemProps {
  item: AccordionItem;
  isExpanded: boolean;
  onToggle: () => void;
}

// 개별 아코디언 아이템 컴포넌트
const AccordionItemComponent: React.FC<AccordionItemProps> = ({
  item,
  isExpanded,
  onToggle,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-accent-soft overflow-hidden">
      {/* 아코디언 헤더 */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-accent-light transition-colors"
      >
        <div className="flex-1">
          {item.header}
        </div>
        <ChevronDownIcon
          className={`text-accent-soft transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* 아코디언 내용 */}
      {isExpanded && (
        <div className="border-t border-accent-light">
          {item.content}
        </div>
      )}
    </div>
  );
};

// 메인 아코디언 컴포넌트
const Accordion: React.FC<AccordionProps> = ({
  items,
  className = '',
  allowMultiple = false,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    const defaultExpanded = new Set<string>();
    items.forEach(item => {
      if (item.defaultExpanded) {
        defaultExpanded.add(item.id);
      }
    });
    return defaultExpanded;
  });

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        if (!allowMultiple) {
          // 단일 확장 모드일 때는 다른 아이템들을 모두 닫음
          newExpanded.clear();
        }
        newExpanded.add(itemId);
      }
      
      return newExpanded;
    });
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {items.map((item) => (
        <AccordionItemComponent
          key={item.id}
          item={item}
          isExpanded={expandedItems.has(item.id)}
          onToggle={() => toggleItem(item.id)}
        />
      ))}
    </div>
  );
};

export default Accordion;

// 아코디언 헤더 유틸리티 컴포넌트들
export const AccordionHeader: React.FC<{
  date: string;
  title: string;
  subtitle?: string;
}> = ({ date, title, subtitle }) => (
  <div className="flex items-center space-x-4">
    <div className="text-sm text-text-secondary w-24 flex-shrink-0">
      {date}
    </div>
    <div className="font-semibold text-primary flex-1">
      {title}
    </div>
    {subtitle && (
      <div className="text-sm text-accent-soft flex-shrink-0">
        {subtitle}
      </div>
    )}
  </div>
);

// 아코디언 훅 - 상태 관리를 위한 커스텀 훅
export const useAccordion = (allowMultiple = false) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        if (!allowMultiple) {
          newExpanded.clear();
        }
        newExpanded.add(itemId);
      }
      
      return newExpanded;
    });
  };

  const isExpanded = (itemId: string) => expandedItems.has(itemId);

  const expandAll = () => {
    if (allowMultiple) {
      // 모든 아이템을 확장 (allowMultiple이 true일 때만)
      setExpandedItems(new Set());
    }
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  return {
    expandedItems,
    toggleItem,
    isExpanded,
    expandAll,
    collapseAll,
  };
}; 