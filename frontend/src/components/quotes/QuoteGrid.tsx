import React from 'react';
import { Quote } from '../../types';
import QuoteCard from './QuoteCard';

interface QuoteGridProps {
  quotes: Quote[];
  onQuoteClick: (quote: Quote) => void;
  focusedQuoteId?: string | null;
}

const QuoteGrid = React.memo(function QuoteGrid({ quotes, onQuoteClick, focusedQuoteId }: QuoteGridProps) {
  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      role="grid"
      aria-label="箴言网格列表"
    >
      {quotes.map((quote, index) => (
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
});

export default QuoteGrid;