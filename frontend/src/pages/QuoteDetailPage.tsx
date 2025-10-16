import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Quote } from '../types';
import { quotesData } from '../data/quotes';
import QuoteDetailModal from '../components/quotes/QuoteDetailModal';
import { QuoteErrorBoundary } from '../components/ErrorBoundary';

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotesWithLikes, setQuotesWithLikes] = useState<Quote[]>([]);

  useEffect(() => {
    // 初始化所有quotes的点赞状态
    const quotesWithInitialLikes = quotesData.map(q => ({
      ...q,
      isLiked: q.isLiked ?? false,
      likesCount: q.likesCount ?? 0
    }));
    setQuotesWithLikes(quotesWithInitialLikes);

    if (!id) {
      setError('箴言ID不能为空');
      setLoading(false);
      return;
    }

    try {
      // 从初始化后的数据中查找对应的箴言
      const foundQuote = quotesWithInitialLikes.find(q => q.id === id);

      if (!foundQuote) {
        setError('找不到对应的箴言');
        setLoading(false);
        return;
      }

      setQuote(foundQuote);
      setError(null);
    } catch (err) {
      setError('加载箴言失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleClose = () => {
    navigate('/quotes');
  };

  const handleNavigateToQuote = (newQuote: Quote) => {
    navigate(`/quotes/${newQuote.id}`);
  };

  const handleLike = (quoteId: string, isLiked: boolean) => {
    setQuotesWithLikes(prevQuotes => 
      prevQuotes.map(q => {
        if (q.id === quoteId) {
          const newLikesCount = isLiked 
            ? (q.likesCount ?? 0) + 1 
            : Math.max((q.likesCount ?? 0) - 1, 0);
          return {
            ...q,
            isLiked,
            likesCount: newLikesCount
          };
        }
        return q;
      })
    );
    
    // 更新当前quote以便Modal显示最新状态
    setQuote(prevQuote => {
      if (prevQuote && prevQuote.id === quoteId) {
        const newLikesCount = isLiked 
          ? (prevQuote.likesCount ?? 0) + 1 
          : Math.max((prevQuote.likesCount ?? 0) - 1, 0);
        return {
          ...prevQuote,
          isLiked,
          likesCount: newLikesCount
        };
      }
      return prevQuote;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载箴言中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">加载失败</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/quotes')}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors"
          >
            返回箴言列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <QuoteErrorBoundary>
        <QuoteDetailModal
          quote={quote}
          isOpen={true}
          onClose={handleClose}
          onLike={handleLike}
          quotes={quotesWithLikes}
          onNavigateToQuote={handleNavigateToQuote}
        />
      </QuoteErrorBoundary>
    </div>
  );
}