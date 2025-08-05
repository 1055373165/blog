export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          页面未找到
        </p>
        <a 
          href="/" 
          className="btn btn-primary"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}