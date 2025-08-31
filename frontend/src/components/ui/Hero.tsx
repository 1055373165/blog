import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Button from './Button';
import { clsx } from 'clsx';

interface HeroProps {
  className?: string;
}

// 增强的3D视差粒子背景组件
const ParticleBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      setMousePosition({
        x: (clientX / innerWidth - 0.5) * 2,
        y: (clientY / innerHeight - 0.5) * 2
      });
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ perspective: '1000px' }}>
      {/* 3D视差背景层 */}
      <div 
        className="absolute inset-0 opacity-60"
        style={{
          transform: `translateZ(-100px) scale(1.1) translate3d(${mousePosition.x * 10}px, ${mousePosition.y * 10}px, 0) translateY(${scrollY * 0.3}px)`,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* 大型装饰圆形 - 增强3D效果 */}
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary-500/20 to-accent-purple-500/20 rounded-full blur-3xl animate-float"
          style={{
            transform: `translate3d(${mousePosition.x * 15}px, ${mousePosition.y * 15}px, 0) rotateX(${mousePosition.y * 5}deg) rotateY(${mousePosition.x * 5}deg)`
          }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-go-500/20 to-accent-pink-500/20 rounded-full blur-3xl animate-float-delayed"
          style={{
            transform: `translate3d(${mousePosition.x * -12}px, ${mousePosition.y * -12}px, 0) rotateX(${mousePosition.y * -5}deg) rotateY(${mousePosition.x * -5}deg)`
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-br from-accent-orange-500/10 to-primary-500/10 rounded-full blur-3xl animate-pulse-slow"
          style={{
            transform: `translate(-50%, -50%) translate3d(${mousePosition.x * 8}px, ${mousePosition.y * 8}px, 0) rotateZ(${mousePosition.x * 2}deg)`
          }}
        />
      </div>
      
      {/* 中层粒子 - 不同的视差速度 */}
      <div 
        className="absolute inset-0"
        style={{
          transform: `translateZ(-50px) translate3d(${mousePosition.x * 20}px, ${mousePosition.y * 20}px, 0) translateY(${scrollY * 0.5}px)`
        }}
      >
        {/* 流动的渐变线条 - 增强交互 */}
        <div 
          className="absolute top-20 left-0 w-full h-1 bg-gradient-to-r from-transparent via-go-500/30 to-transparent animate-channel-flow"
          style={{
            transform: `scaleX(${1 + Math.abs(mousePosition.x) * 0.2})`,
            opacity: 0.7 + Math.abs(mousePosition.x) * 0.3
          }}
        />
        <div 
          className="absolute top-32 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500/30 to-transparent animate-channel-flow"
          style={{ 
            animationDelay: '1s',
            transform: `scaleX(${1 + Math.abs(mousePosition.y) * 0.2})`,
            opacity: 0.7 + Math.abs(mousePosition.y) * 0.3
          }}
        />
        <div 
          className="absolute top-44 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-purple-500/30 to-transparent animate-channel-flow"
          style={{ 
            animationDelay: '2s',
            transform: `scaleX(${1 + Math.abs(mousePosition.x + mousePosition.y) * 0.1})`,
            opacity: 0.7 + Math.abs(mousePosition.x + mousePosition.y) * 0.15
          }}
        />
      </div>
      

      {/* 鼠标跟随光效 */}
      <div 
        className="absolute pointer-events-none"
        style={{
          left: `${(mousePosition.x + 1) * 50}%`,
          top: `${(mousePosition.y + 1) * 50}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="w-40 h-40 bg-gradient-radial from-white/10 via-primary-500/5 to-transparent rounded-full animate-pulse" />
      </div>
    </div>
  );
};

// 打字机效果组件
const TypewriterText = ({ texts, speed = 100 }: { texts: string[]; speed?: number }) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const targetText = texts[currentTextIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (currentText.length < targetText.length) {
          setCurrentText(targetText.slice(0, currentText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentTextIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, isDeleting ? speed / 2 : speed);

    return () => clearTimeout(timeout);
  }, [currentText, currentTextIndex, isDeleting, texts, speed]);

  return (
    <span className="text-gradient-go">
      {currentText}
      <span className="animate-pulse">|</span>
    </span>
  );
};

// 简化的静态卡片组件（移除3D陀螺仪效果）
const FloatingCard = ({ 
  children, 
  className, 
  delay = 0,
  depth = 0
}: { 
  children: React.ReactNode; 
  className?: string; 
  delay?: number;
  depth?: number;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={clsx(
        'bg-white/10 dark:bg-gray-900/10 backdrop-blur-xl border border-white/20 dark:border-gray-800/20 rounded-2xl p-6 shadow-2xl transition-all duration-500',
        isHovered && 'shadow-4xl',
        className
      )}
      style={{ 
        animationDelay: `${delay}ms`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative z-10">
        {children}
      </div>
      
      {/* 静态阴影效果 */}
      {isHovered && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-go-500/10 rounded-2xl blur-xl opacity-50 transition-opacity duration-500" />
      )}
    </div>
  );
};

// 互动状态指示器
const StatusIndicator = ({ isActive, label }: { isActive: boolean; label: string }) => (
  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
      isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
    }`} />
    <span>{label}</span>
  </div>
);

export default function Hero({ className }: HeroProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isInView, setIsInView] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoaded(true);
    
    // 鼠标位置追踪
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      setMousePosition({
        x: (clientX / innerWidth - 0.5) * 2,
        y: (clientY / innerHeight - 0.5) * 2
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    // Intersection Observer
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.3 }
    );
    
    if (heroRef.current) {
      observer.observe(heroRef.current);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, []);

  const typewriterTexts = [
    '并发编程',
    '微服务架构', 
    '性能优化',
    '系统设计',
    '云原生技术'
  ];

  return (
    <section 
      ref={heroRef}
      className={clsx(
        'relative min-h-screen flex items-center justify-center overflow-hidden',
        'bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20',
        'dark:from-gray-900 dark:via-gray-800 dark:to-gray-900',
        'transition-all duration-1000',
        isInView && 'animate-fade-in',
        className
      )}
    >
      {/* 动态背景 */}
      <ParticleBackground />
      
      {/* 主要内容 */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8">
          {/* 主标题区域 */}
          <div className={clsx('space-y-6', isLoaded && 'animate-fade-in-up')}>
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-go-500/10 to-primary-500/10 rounded-full border border-go-300/30 dark:border-go-700/30 text-sm font-medium text-go-700 dark:text-go-300 mb-6">
              <span className="w-2 h-2 bg-go-500 rounded-full mr-2 animate-pulse"></span>
              欢迎来到 Go 深度探索之旅
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 dark:text-white leading-tight">
              <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-light text-gray-600 dark:text-gray-300 mt-4 leading-tight">
                <span className="block sm:inline">Deep Dive into</span>{' '}
                <span className="block sm:inline text-gradient-go whitespace-nowrap overflow-hidden">
                  <TypewriterText texts={typewriterTexts} />
                </span>
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              探索 Go 语言的深层奥秘，从 <span className="text-go-600 dark:text-go-400 font-semibold">goroutines</span> 到 
              <span className="text-primary-600 dark:text-primary-400 font-semibold"> channels</span>，
              从微服务架构到性能优化，打造你的技术护城河
            </p>
          </div>

          {/* CTA 按钮组 */}
          <div className={clsx('flex flex-col sm:flex-row gap-4 justify-center items-center mb-16', isLoaded && 'animate-fade-in-up')} style={{ animationDelay: '200ms' }}>
            <Link to="/articles">
              <Button 
                variant="gradient" 
                size="xl"
                rightIcon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                }
                className="group"
              >
                开始探索
              </Button>
            </Link>
            
            <Link to="/quotes">
              <Button 
                variant="glass" 
                size="xl"
                leftIcon={
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.5 10c-.223 0-.437.034-.65.065.069-.232.14-.468.254-.68.114-.308.292-.575.469-.844.148-.291.409-.488.601-.737.201-.242.475-.403.692-.604.213-.21.492-.315.714-.463.232-.133.434-.28.65-.35l.539-.222.474-.197-.485-1.938-.597.144c-.191.048-.424.104-.689.171-.271.05-.56.187-.882.312-.318.142-.686.238-1.028.466-.344.218-.741.4-1.091.692-.339.301-.748.562-1.05.945-.33.358-.656.734-.909 1.162-.293.408-.492.856-.702 1.299-.19.443-.343.896-.468 1.336-.237.882-.343 1.72-.384 2.437-.034.718-.014 1.315.028 1.747.015.204.043.402.063.539l.025.168.026-.006A4.5 4.5 0 1 0 6.5 10zm11 0c-.223 0-.437.034-.65.065.069-.232.14-.468.254-.68.114-.308.292-.575.469-.844.148-.291.409-.488.601-.737.201-.242.475-.403.692-.604.213-.21.492-.315.714-.463.232-.133.434-.28.65-.35l.539-.222.474-.197-.485-1.938-.597.144c-.191.048-.424.104-.689.171-.271.05-.56.187-.882.312-.318.142-.686.238-1.028.466-.344.218-.741.4-1.091.692-.339.301-.748.562-1.05.945-.33.358-.656.734-.909 1.162-.293.408-.492.856-.702 1.299-.19.443-.343.896-.468 1.336-.237.882-.343 1.72-.384 2.437-.034.718-.014 1.315.028 1.747.015.204.043.402.063.539l.025.168.026-.006A4.5 4.5 0 1 0 17.5 10z"/>
                  </svg>
                }
              >
                技术箴言
              </Button>
            </Link>
          </div>

          
          {/* 增强的滚动提示 */}
          <div className={clsx('pt-8', isLoaded && 'animate-fade-in')} style={{ animationDelay: '400ms' }}>
            <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
              <span className="text-sm mb-2 relative">
                向下滚动探索更多
                <div className="absolute -inset-2 bg-gradient-to-r from-primary-500/20 to-go-500/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </span>
              <div className="relative group cursor-pointer">
                <svg 
                  className="w-6 h-6 animate-bounce transition-transform duration-300 group-hover:scale-110" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{
                    transform: `translateY(${Math.sin(Date.now() / 1000) * 3}px)`,
                    filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.3))'
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-go-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              {/* 增强的Code Snippet */}
              <FloatingCard className="mt-16 max-w-6xl mx-auto" depth={20}>
                <div className="bg-gray-900 dark:bg-gray-950 rounded-xl p-6 shadow-2xl border border-gray-700 relative overflow-hidden">
                  {/* 代码背景效果 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-green-900/20 opacity-50" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-go-500/10 to-transparent rounded-bl-full" />
                  <div className="flex items-center mb-4">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="ml-4 text-gray-400 font-mono text-sm">about_me.go</div>
                  </div>
                  <div className="font-mono text-xs sm:text-sm text-left overflow-x-auto scrollbar-thin">
                    <div className="text-purple-400">package <span className="text-white">main</span></div>
                    <div className="text-purple-400"><br></br>import <span className="text-green-400">"fmt"</span></div>
                    <div className="mt-4 text-purple-400">func <span className="text-blue-400">main</span><span className="text-white">() {"{"}</span></div>
                    <div className="space-y-1 sm:space-y-2">
                      <div className="ml-4 text-white break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"Hi! I'm Sun Mengyu, a passionate Go developer with 3 years of experience."</span>
                        <span>)</span>
                      </div>
                      <div className="ml-4 text-white break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"Core Focus: Go microservices, system architecture design, and design patterns."</span>
                        <span>)</span>
                      </div>
                      <div className="ml-4 text-white break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"System Knowledge: Operating systems, computer networks, high concurrency & availability."</span>
                        <span>)</span>
                      </div>
                      <div className="ml-4 text-white break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"Architecture Skills: UML modeling, OOP design, code standards, and observability."</span>
                        <span>)</span>
                      </div>
                      <div className="ml-4 text-white break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"DevOps & Performance: Container tech, high-performance optimization, distributed systems."</span>
                        <span>)</span>
                      </div>
                      <div className="ml-4 text-white break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"Tools & Learning: ClaudeCode, Windsurf, Go source code exploration, modern workflows."</span>
                        <span>)</span>
                      </div>
                      <div className="ml-4 text-white break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"Goal: Building robust, scalable, maintainable systems with clean code principles."</span>
                        <span>)</span>
                      </div>
                      <div className="ml-4 text-white mt-2 sm:mt-4 break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"--- Professional Summary ---"</span>
                        <span>)</span>
                      </div>
                      <div className="ml-4 text-white break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"Experienced Golang Backend Engineer with 3+ years building scalable microservices."</span>
                        <span>)</span>
                      </div>
                      <div className="ml-4 text-white break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"Expertise: Go concurrency (goroutines/channels), Gin/Gorm/gRPC frameworks."</span>
                        <span>)</span>
                      </div>
                      <div className="ml-4 text-white break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"Backend Skills: RESTful APIs, Mysql/Redis optimization."</span>
                        <span>)</span>
                      </div>
                      <div className="ml-4 text-white break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"Event-driven: EDA, Apache Kafka message queue architectures."</span>
                        <span>)</span>
                      </div>
                      <div className="ml-4 text-white break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"Cloud & DevOps: Docker, Kubernetes, CI/CD pipelines."</span>
                        <span>)</span>
                      </div>
                      <div className="ml-4 text-white break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"Monitoring: Prometheus, Grafana, pprof performance profiling."</span>
                        <span>)</span>
                      </div>
                      <div className="ml-4 text-white break-words">
                        <span>fmt.<span className="text-blue-400">Println</span>(</span>
                        <span className="text-green-400 break-all">"Practices: TDD, clean architecture, SOLID principles, production optimization."</span>
                        <span>)</span>
                      </div>
                    </div>
                    <div className="text-white">{"}"}</div>
                  </div>
                </div>
              </FloatingCard>
            </div>
          </div>
        </div>
      </div>

      {/* 底部渐变 - 增加透明度确保不影响后续内容 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50/80 dark:from-gray-900/80 to-transparent pointer-events-none" />
    </section>
  );
}