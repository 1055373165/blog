import React, { memo } from 'react';
import { Quote } from '../../types';
import QuoteCard from './QuoteCard';

interface QuoteGridProps {
  quotes: Quote[];
  onQuoteClick: (quote: Quote) => void;
  focusedQuoteId?: string | null;
}

function QuoteGrid({ quotes, onQuoteClick, focusedQuoteId }: QuoteGridProps) {
  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      role="grid"
      aria-label="箴言网格列表"
    >
      {quotes.map((quote) => (
        <div key={quote.id} role="gridcell">
          <QuoteCard
            quote={quote}
            onClick={onQuoteClick}
            isFocused={focusedQuoteId === quote.id}
            tabIndex={focusedQuoteId === quote.id ? 0 : -1}
            data-quote-id={quote.id}
          />
        </div>
      ))}
    </div>
  );
}

// 使用memo优化组件，并自定义比较函数
export default memo(QuoteGrid, (prevProps, nextProps) => {
  // 比较quotes数组的长度和ID，而不是深度比较
  if (prevProps.quotes.length !== nextProps.quotes.length) {
    return false;
  }
  
  // 比较每个quote的ID（假设已按正确顺序排列）
  for (let i = 0; i < prevProps.quotes.length; i++) {
    if (prevProps.quotes[i].id !== nextProps.quotes[i].id) {
      return false;
    }
  }
  
  // 比较其他props
  return (
    prevProps.focusedQuoteId === nextProps.focusedQuoteId &&
    prevProps.onQuoteClick === nextProps.onQuoteClick
  );
});