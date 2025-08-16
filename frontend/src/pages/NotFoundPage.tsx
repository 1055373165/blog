export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-go-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-go-900/20">
      <div className="text-center px-4 max-w-md mx-auto">
        {/* 404 Number with Go-style design */}
        <div className="mb-8">
          <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-go-600 via-go-500 to-go-600 bg-clip-text text-transparent mb-4 animate-pulse-slow">
            404
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-go-600 to-go-400 mx-auto rounded-full"></div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
            页面未找到
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            抱歉，您访问的页面不存在。可能是链接错误或页面已被移动。
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a 
            href="/" 
            className="btn btn-primary group"
          >
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            返回首页
          </a>
          <a 
            href="/search" 
            className="btn btn-outline"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            搜索文章
          </a>
        </div>

        {/* Decorative Elements */}
        <div className="mt-12 flex justify-center space-x-1 opacity-30">
          <div className="w-2 h-2 bg-go-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
          <div className="w-2 h-2 bg-go-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          <div className="w-2 h-2 bg-go-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
        </div>
      </div>
    </div>
  );
}