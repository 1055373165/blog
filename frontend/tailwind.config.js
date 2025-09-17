/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Enhanced primary palette
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        
        // Go brand colors - enhanced
        go: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        
        // Blog-specific low saturation colors
        blog: {
          50: '#fafaf9',   // 极浅暖灰
          100: '#f5f5f4',  // 浅暖灰
          200: '#e7e5e4',  // 中浅暖灰
          300: '#d6d3d1',  // 中暖灰
          400: '#a8a29e',  // 暖灰
          500: '#78716c',  // 深暖灰
          600: '#57534e',  // 较深暖灰
          700: '#44403c',  // 深暖灰
          800: '#292524',  // 很深暖灰
          900: '#1c1917',  // 极深暖灰
          950: '#0c0a09',  // 黑暖灰
        },
        
        // Media-specific muted colors
        media: {
          audio: {
            50: '#fdf8f3',   // 极浅橙米色
            100: '#fdefd6',  // 浅橙米色
            200: '#fbdcad',  // 中浅橙米色
            300: '#f7c179',  // 中橙米色
            400: '#f2a444',  // 橙米色
            500: '#ed8936',  // 深橙米色
            600: '#de7318',  // 较深橙米色
            700: '#b85c14',  // 深橙米色
            800: '#924816',  // 很深橙米色
            900: '#783e15',  // 极深橙米色
            950: '#3f1e08',  // 黑橙米色
          },
          video: {
            50: '#f8fafc',   // 极浅蓝灰
            100: '#f1f5f9',  // 浅蓝灰
            200: '#e2e8f0',  // 中浅蓝灰
            300: '#cbd5e1',  // 中蓝灰
            400: '#94a3b8',  // 蓝灰
            500: '#64748b',  // 深蓝灰
            600: '#475569',  // 较深蓝灰
            700: '#334155',  // 深蓝灰
            800: '#1e293b',  // 很深蓝灰
            900: '#0f172a',  // 极深蓝灰
            950: '#020617',  // 黑蓝灰
          },
        },
        
        // Modern accent colors
        accent: {
          purple: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7',
            600: '#9333ea',
            700: '#7c3aed',
            800: '#6b21a8',
            900: '#581c87',
            950: '#3b0764',
          },
          orange: {
            50: '#fff7ed',
            100: '#ffedd5',
            200: '#fed7aa',
            300: '#fdba74',
            400: '#fb923c',
            500: '#f97316',
            600: '#ea580c',
            700: '#c2410c',
            800: '#9a3412',
            900: '#7c2d12',
            950: '#431407',
          },
          pink: {
            50: '#fdf2f8',
            100: '#fce7f3',
            200: '#fbcfe8',
            300: '#f9a8d4',
            400: '#f472b6',
            500: '#ec4899',
            600: '#db2777',
            700: '#be185d',
            800: '#9d174d',
            900: '#831843',
            950: '#500724',
          },
        },
        
        // Extended neutrals with warm and cool variants
        neutral: {
          warm: {
            50: '#fafaf9',
            100: '#f5f5f4',
            200: '#e7e5e4',
            300: '#d6d3d1',
            400: '#a8a29e',
            500: '#78716c',
            600: '#57534e',
            700: '#44403c',
            800: '#292524',
            900: '#1c1917',
            950: '#0c0a09',
          },
          cool: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
            950: '#020617',
          },
        },
        
        // Semantic colors with enhanced variants
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        
        // Glass effect colors
        glass: {
          white: 'rgba(255, 255, 255, 0.1)',
          'white-md': 'rgba(255, 255, 255, 0.2)',
          'white-lg': 'rgba(255, 255, 255, 0.3)',
          black: 'rgba(0, 0, 0, 0.1)',
          'black-md': 'rgba(0, 0, 0, 0.2)',
          'black-lg': 'rgba(0, 0, 0, 0.3)',
        },
      },
      animation: {
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'channel-flow': 'channel-flow 8s linear infinite',
        'gopher-breathe': 'gopher-breathe 4s ease-in-out infinite',
        // New modern animations
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'fade-in-down': 'fadeInDown 0.6s ease-out',
        'slide-in-left': 'slideInLeft 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'rotate-in': 'rotateIn 0.5s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'gradient-x': 'gradientX 15s ease infinite',
        'gradient-y': 'gradientY 15s ease infinite',
        'gradient-xy': 'gradientXY 15s ease infinite',
        'morphing': 'morphing 8s ease-in-out infinite',
        'float-delayed': 'float 3s ease-in-out infinite 1s',
        'text-reveal': 'textReveal 0.8s ease-out',
        'glass-shimmer': 'glassShimmer 3s ease-in-out infinite',
        'particle-float': 'particleFloat 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
        'depth-float': 'depthFloat 4s ease-in-out infinite',
        'matrix-rain': 'matrixRain 20s linear infinite',
        'code-glow': 'codeGlow 3s ease-in-out infinite alternate',
        'wave-motion': 'waveMotion 15s ease-in-out infinite',
        'grid-shift': 'gridShift 20s linear infinite',
        'particle-drift': 'particleDrift 30s linear infinite',
        'background-pulse': 'backgroundPulse 4s ease-in-out infinite',
        'scroll-glow': 'scrollGlow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        shimmer: {
          '0%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
          '100%': { 'background-position': '0% 50%' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        },
        'channel-flow': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100vw)' }
        },
        'gopher-breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' }
        },
        // New modern keyframes
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-50px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(50px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        rotateIn: {
          '0%': { opacity: '0', transform: 'rotate(-10deg) scale(0.9)' },
          '100%': { opacity: '1', transform: 'rotate(0deg) scale(1)' }
        },
        glow: {
          '0%': { 'box-shadow': '0 0 5px currentColor' },
          '100%': { 'box-shadow': '0 0 20px currentColor, 0 0 30px currentColor' }
        },
        gradientX: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' }
        },
        gradientY: {
          '0%, 100%': { 'background-position': '50% 0%' },
          '50%': { 'background-position': '50% 100%' }
        },
        gradientXY: {
          '0%, 100%': { 'background-position': '0% 0%' },
          '25%': { 'background-position': '100% 0%' },
          '50%': { 'background-position': '100% 100%' },
          '75%': { 'background-position': '0% 100%' }
        },
        morphing: {
          '0%, 100%': { 'border-radius': '60% 40% 30% 70%/60% 30% 70% 40%' },
          '50%': { 'border-radius': '30% 60% 70% 40%/50% 60% 30% 60%' }
        },
        textReveal: {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(20px)',
            filter: 'blur(10px)'
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0)',
            filter: 'blur(0px)'
          }
        },
        glassShimmer: {
          '0%': { 
            background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
            transform: 'translateX(-100%)'
          },
          '100%': {
            background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
            transform: 'translateX(100%)'
          }
        },
        particleFloat: {
          '0%, 100%': { 
            transform: 'translateY(0px) rotateZ(0deg)',
            opacity: '0.4'
          },
          '50%': { 
            transform: 'translateY(-20px) rotateZ(180deg)',
            opacity: '0.8'
          }
        },
        glowPulse: {
          '0%': { 
            boxShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
            filter: 'brightness(1)'
          },
          '100%': { 
            boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
            filter: 'brightness(1.2)'
          }
        },
        depthFloat: {
          '0%, 100%': { 
            transform: 'translateZ(0px) rotateX(0deg) rotateY(0deg)'
          },
          '25%': { 
            transform: 'translateZ(20px) rotateX(5deg) rotateY(5deg)'
          },
          '50%': { 
            transform: 'translateZ(10px) rotateX(-5deg) rotateY(-5deg)'
          },
          '75%': { 
            transform: 'translateZ(30px) rotateX(2deg) rotateY(-2deg)'
          }
        },
        matrixRain: {
          '0%': { 
            transform: 'translateY(-100vh)',
            opacity: '0'
          },
          '10%': { 
            opacity: '1'
          },
          '90%': { 
            opacity: '1'
          },
          '100%': { 
            transform: 'translateY(100vh)',
            opacity: '0'
          }
        },
        codeGlow: {
          '0%': { 
            textShadow: '0 0 5px rgba(59, 130, 246, 0.5)',
            filter: 'brightness(1)'
          },
          '100%': { 
            textShadow: '0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.6)',
            filter: 'brightness(1.1)'
          }
        },
        waveMotion: {
          '0%, 100%': { 
            transform: 'translateY(0px) scale(1) rotate(0deg)'
          },
          '25%': { 
            transform: 'translateY(-10px) scale(1.05) rotate(1deg)'
          },
          '50%': { 
            transform: 'translateY(0px) scale(1.1) rotate(0deg)'
          },
          '75%': { 
            transform: 'translateY(10px) scale(1.05) rotate(-1deg)'
          }
        },
        gridShift: {
          '0%': { 
            transform: 'translate(0, 0)'
          },
          '25%': { 
            transform: 'translate(-5px, -5px)'
          },
          '50%': { 
            transform: 'translate(5px, -5px)'
          },
          '75%': { 
            transform: 'translate(-5px, 5px)'
          },
          '100%': { 
            transform: 'translate(0, 0)'
          }
        },
        particleDrift: {
          '0%': { 
            transform: 'translateY(0px) translateX(0px) rotate(0deg)',
            opacity: '0.2'
          },
          '25%': { 
            opacity: '0.6'
          },
          '50%': { 
            transform: 'translateY(-20px) translateX(10px) rotate(180deg)',
            opacity: '0.8'
          },
          '75%': { 
            opacity: '0.4'
          },
          '100%': { 
            transform: 'translateY(0px) translateX(0px) rotate(360deg)',
            opacity: '0.2'
          }
        },
        backgroundPulse: {
          '0%, 100%': { 
            opacity: '0.3',
            transform: 'scale(1)'
          },
          '50%': { 
            opacity: '0.6',
            transform: 'scale(1.02)'
          }
        },
        scrollGlow: {
          '0%': { 
            boxShadow: '0 0 5px rgba(59, 130, 246, 0.3)'
          },
          '100%': { 
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(14, 165, 233, 0.4)'
          }
        }
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['var(--font-code)', '"SF Mono"', 'Monaco', '"Cascadia Code"', 'Consolas', 'monospace'],
        heading: ['var(--font-heading)', 'var(--font-body)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        code: ['var(--font-code)', '"SF Mono"', 'Monaco', '"Cascadia Code"', 'Consolas', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: {
              color: 'inherit',
              textDecoration: 'underline',
              fontWeight: '500',
            },
            '[class~="lead"]': {
              color: 'inherit',
            },
            strong: {
              color: 'inherit',
            },
            'ol > li::before': {
              color: 'inherit',
            },
            'ul > li::before': {
              backgroundColor: 'currentColor',
            },
            hr: {
              borderColor: 'currentColor',
              opacity: 0.3,
            },
            blockquote: {
              color: 'inherit',
              borderLeftColor: 'currentColor',
            },
            h1: {
              color: 'inherit',
            },
            h2: {
              color: 'inherit',
            },
            h3: {
              color: 'inherit',
            },
            h4: {
              color: 'inherit',
            },
            'figure figcaption': {
              color: 'inherit',
            },
            code: {
              color: 'inherit',
            },
            'a code': {
              color: 'inherit',
            },
            pre: {
              color: 'inherit',
              backgroundColor: 'transparent',
              marginTop: '1rem',
              marginBottom: '1rem',
            },
            thead: {
              color: 'inherit',
              borderBottomColor: 'currentColor',
            },
            'tbody tr': {
              borderBottomColor: 'currentColor',
            },
          },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 25px -5px rgba(0, 0, 0, 0.04)',
        'strong': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    function({ addUtilities, addComponents, theme }) {
      const newUtilities = {
        '.text-shadow-sm': {
          'text-shadow': '0 1px 2px rgba(0, 0, 0, 0.05)',
        },
        '.text-shadow': {
          'text-shadow': '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
        '.text-shadow-lg': {
          'text-shadow': '0 8px 16px rgba(0, 0, 0, 0.15)',
        },
      }
      
      const newComponents = {
        '.btn': {
          '@apply inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed': {},
        },
        '.btn-sm': {
          '@apply px-3 py-1.5 text-sm': {},
        },
        '.btn-lg': {
          '@apply px-6 py-3 text-lg': {},
        },
        '.btn-primary': {
          '@apply bg-go-600 hover:bg-go-700 text-white focus:ring-go-500': {},
        },
        '.btn-secondary': {
          '@apply bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100': {},
        },
        '.btn-outline': {
          '@apply border-2 border-go-300 text-go-700 hover:bg-go-50 dark:border-go-700 dark:text-go-300 dark:hover:bg-go-900/20': {},
        },
        '.bg-size-200': {
          'background-size': '200% 200%',
        },
        '.aspect-square': {
          'aspect-ratio': '1 / 1',
        },
        '.card': {
          '@apply bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 transition-all duration-200': {},
        },
        '.card-hover': {
          '@apply hover:shadow-medium hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-1': {},
        },
        '.card-glass': {
          '@apply backdrop-blur-xl border border-white/20 dark:border-gray-800/20 shadow-2xl transition-all duration-300': {},
          background: 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(16px)',
          '-webkit-backdrop-filter': 'blur(16px)',
        },
        '.card-glass-dark': {
          '@apply backdrop-blur-xl border border-gray-700/30 shadow-2xl transition-all duration-300': {},
          background: 'rgba(0, 0, 0, 0.1)',
          'backdrop-filter': 'blur(16px)',
          '-webkit-backdrop-filter': 'blur(16px)',
        },
        '.card-gradient': {
          '@apply rounded-xl shadow-strong border border-transparent transition-all duration-300 hover:-translate-y-2': {},
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
        },
        '.card-neo': {
          '@apply bg-gray-100 dark:bg-gray-800 rounded-2xl transition-all duration-300': {},
          'box-shadow': '8px 8px 16px rgba(0,0,0,0.1), -8px -8px 16px rgba(255,255,255,0.5)',
        },
        '.card-neo-dark': {
          '@apply bg-gray-800 rounded-2xl transition-all duration-300': {},
          'box-shadow': '8px 8px 16px rgba(0,0,0,0.3), -8px -8px 16px rgba(255,255,255,0.05)',
        },
        '.input': {
          '@apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-go-500 focus:border-transparent transition-all duration-200': {},
        },
        '.input-glass': {
          '@apply w-full px-4 py-3 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200': {},
          background: 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
        },
        '.text-gradient': {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
        '.text-gradient-primary': {
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
        '.text-gradient-go': {
          background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
        '.bg-gradient-mesh': {
          background: 'radial-gradient(at 40% 20%, hsla(28,100%,74%,1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,93%,1) 0px, transparent 50%), radial-gradient(at 80% 50%, hsla(340,100%,76%,1) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(22,100%,77%,1) 0px, transparent 50%), radial-gradient(at 80% 100%, hsla(242,100%,70%,1) 0px, transparent 50%), radial-gradient(at 0% 0%, hsla(343,100%,76%,1) 0px, transparent 50%)',
        },
        '.glass-effect': {
          '@apply backdrop-blur-lg border border-white/20 dark:border-gray-800/20': {},
          background: 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(16px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(16px) saturate(180%)',
        },
        '.loading-skeleton': {
          '@apply animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700': {},
          'background-size': '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
        },
        '.hover-lift': {
          '@apply transition-all duration-300 hover:-translate-y-2 hover:shadow-xl': {},
        },
        '.hover-glow': {
          '@apply transition-all duration-300 hover:shadow-lg': {},
          '&:hover': {
            'box-shadow': '0 0 30px rgba(59, 130, 246, 0.5)',
          },
        },
        '.bg-gradient-radial': {
          background: 'radial-gradient(circle, var(--tw-gradient-stops))',
        },
        '.bg-gradient-conic': {
          background: 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        },
        '.perspective-1000': {
          perspective: '1000px',
        },
        '.preserve-3d': {
          'transform-style': 'preserve-3d',
        },
        '.backface-hidden': {
          'backface-visibility': 'hidden',
        },
        '.animate-matrix': {
          '@apply animate-matrix-rain': {},
        },
        '.shadow-4xl': {
          'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 25px 50px -12px rgba(59, 130, 246, 0.15)',
        },
        '.shadow-neon': {
          'box-shadow': '0 0 5px currentColor, 0 0 20px currentColor, 0 0 35px currentColor',
        },
        '.bg-animated-grid': {
          backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          animation: 'gridShift 20s linear infinite',
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': 'rgb(59 130 246) rgb(243 244 246)',
        },
        '.scrollbar-thin::-webkit-scrollbar': {
          width: '4px',
        },
        '.scrollbar-thin::-webkit-scrollbar-track': {
          backgroundColor: 'rgb(243 244 246)',
          borderRadius: '2px',
        },
        '.scrollbar-thin::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgb(59 130 246)',
          borderRadius: '2px',
        },
        '.scrollbar-thin::-webkit-scrollbar-thumb:hover': {
          backgroundColor: 'rgb(37 99 235)',
        },
        
        // Blog-specific card styles
        '.blog-card': {
          '@apply bg-blog-50 dark:bg-blog-800 rounded-xl border border-blog-200 dark:border-blog-700 transition-all duration-300': {},
          'box-shadow': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
        },
        '.blog-card:hover': {
          '@apply border-blog-300 dark:border-blog-600 -translate-y-1': {},
          'box-shadow': '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        },
        
        // Audio-specific card styles
        '.audio-card': {
          '@apply bg-media-audio-50 dark:bg-media-audio-900/20 rounded-xl border border-media-audio-200 dark:border-media-audio-800/50 transition-all duration-300': {},
          'box-shadow': '0 1px 3px rgba(237, 137, 54, 0.1), 0 1px 2px rgba(237, 137, 54, 0.06)',
        },
        '.audio-card:hover': {
          '@apply border-media-audio-300 dark:border-media-audio-700 -translate-y-1': {},
          'box-shadow': '0 4px 6px rgba(237, 137, 54, 0.15), 0 2px 4px rgba(237, 137, 54, 0.1)',
        },
        
        // Video-specific card styles
        '.video-card': {
          '@apply bg-media-video-50 dark:bg-media-video-900/20 rounded-xl border border-media-video-200 dark:border-media-video-800/50 transition-all duration-300': {},
          'box-shadow': '0 1px 3px rgba(100, 116, 139, 0.1), 0 1px 2px rgba(100, 116, 139, 0.06)',
        },
        '.video-card:hover': {
          '@apply border-media-video-300 dark:border-media-video-700 -translate-y-1': {},
          'box-shadow': '0 4px 6px rgba(100, 116, 139, 0.15), 0 2px 4px rgba(100, 116, 139, 0.1)',
        },
        
        // Media player controls
        '.media-controls': {
          '@apply bg-blog-100/80 dark:bg-blog-800/80 backdrop-blur-sm rounded-lg border border-blog-200/50 dark:border-blog-700/50': {},
          'backdrop-filter': 'blur(8px)',
          '-webkit-backdrop-filter': 'blur(8px)',
        },
        
        // Progress bars
        '.progress-audio': {
          '@apply bg-media-audio-200 dark:bg-media-audio-800': {},
        },
        '.progress-audio-fill': {
          '@apply bg-media-audio-500 dark:bg-media-audio-400': {},
        },
        '.progress-video': {
          '@apply bg-media-video-200 dark:bg-media-video-800': {},
        },
        '.progress-video-fill': {
          '@apply bg-media-video-500 dark:bg-media-video-400': {},
        },
        // 无障碍性样式
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0',
        },
        '.not-sr-only': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          padding: '0',
          margin: '0',
          overflow: 'visible',
          clip: 'auto',
          whiteSpace: 'normal',
        },
        '.focus-within\\:not-sr-only:focus-within': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          padding: '0',
          margin: '0',
          overflow: 'visible',
          clip: 'auto',
          whiteSpace: 'normal',
        },
        // 键盘导航样式
        '.keyboard-user *:focus': {
          outline: '2px solid rgb(59 130 246)',
          outlineOffset: '2px',
        },
        // 高对比度样式
        '.high-contrast': {
          filter: 'contrast(150%)',
        },
        '.high-contrast .text-gray-500': {
          color: 'rgb(0 0 0)',
        },
        '.high-contrast .dark .text-gray-500': {
          color: 'rgb(255 255 255)',
        },
        // 减少动画样式
        '.reduced-motion *': {
          animationDuration: '0.01ms !important',
          animationIterationCount: '1 !important',
          transitionDuration: '0.01ms !important',
        },
        // 跳过链接样式
        '.skip-link': {
          position: 'absolute',
          top: '-40px',
          left: '6px',
          backgroundColor: 'rgb(59 130 246)',
          color: 'white',
          padding: '8px',
          textDecoration: 'none',
          borderRadius: '4px',
          zIndex: '1000',
        },
        '.skip-link:focus': {
          top: '6px',
        },
      }
      
      addUtilities(newUtilities)
      addComponents(newComponents)
    }
  ],
  darkMode: 'class',
}