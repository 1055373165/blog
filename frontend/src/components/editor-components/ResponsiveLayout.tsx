import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  PencilIcon,
  EyeIcon,
  Bars3Icon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon
} from '@heroicons/react/24/outline'

export type LayoutMode = 'split' | 'edit-only' | 'preview-only' | 'tabbed'
export type DeviceType = 'mobile' | 'tablet' | 'desktop'
export type Orientation = 'portrait' | 'landscape'

interface ResponsiveLayoutProps {
  children: {
    editor: React.ReactNode
    preview: React.ReactNode
    toolbar?: React.ReactNode
    toc?: React.ReactNode
  }
  mode?: LayoutMode
  onModeChange?: (mode: LayoutMode) => void
  className?: string
  enableGestures?: boolean
  autoLayout?: boolean
}

interface ViewportInfo {
  width: number
  height: number
  deviceType: DeviceType
  orientation: Orientation
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export default function ResponsiveLayout({
  children,
  mode = 'split',
  onModeChange,
  className = '',
  enableGestures = true,
  autoLayout = true
}: ResponsiveLayoutProps) {
  const [currentMode, setCurrentMode] = useState<LayoutMode>(mode)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [viewport, setViewport] = useState<ViewportInfo>({
    width: 0,
    height: 0,
    deviceType: 'desktop',
    orientation: 'landscape',
    isMobile: false,
    isTablet: false,
    isDesktop: true
  })

  // Update viewport information
  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      const deviceType: DeviceType =
        width < 768 ? 'mobile' :
        width < 1024 ? 'tablet' : 'desktop'

      const orientation: Orientation = width > height ? 'landscape' : 'portrait'

      setViewport({
        width,
        height,
        deviceType,
        orientation,
        isMobile: deviceType === 'mobile',
        isTablet: deviceType === 'tablet',
        isDesktop: deviceType === 'desktop'
      })
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.addEventListener('orientationchange', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('orientationchange', updateViewport)
    }
  }, [])

  // Auto-layout based on device type
  useEffect(() => {
    if (!autoLayout) return

    let recommendedMode: LayoutMode

    if (viewport.isMobile) {
      recommendedMode = 'tabbed'
    } else if (viewport.isTablet) {
      recommendedMode = viewport.orientation === 'portrait' ? 'tabbed' : 'split'
    } else {
      recommendedMode = 'split'
    }

    if (recommendedMode !== currentMode) {
      setCurrentMode(recommendedMode)
      onModeChange?.(recommendedMode)
    }
  }, [viewport, autoLayout, currentMode, onModeChange])

  // Handle gesture controls for mobile
  useEffect(() => {
    if (!enableGestures || !viewport.isMobile) return

    let startX = 0
    let startY = 0

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!e.changedTouches.length) return

      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const deltaX = endX - startX
      const deltaY = endY - startY

      // Horizontal swipe with minimum distance
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (currentMode === 'tabbed') {
          if (deltaX > 0) {
            // Swipe right - switch to edit
            setActiveTab('edit')
          } else {
            // Swipe left - switch to preview
            setActiveTab('preview')
          }
        }
      }
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enableGestures, viewport.isMobile, currentMode])

  const handleModeChange = useCallback((newMode: LayoutMode) => {
    setCurrentMode(newMode)
    onModeChange?.(newMode)
  }, [onModeChange])

  const layoutClasses = useMemo(() => {
    const base = "relative w-full h-full flex flex-col"

    switch (currentMode) {
      case 'split':
        return `${base} ${viewport.isMobile ? 'flex-col' : 'lg:flex-row'}`
      case 'edit-only':
      case 'preview-only':
        return `${base}`
      case 'tabbed':
        return `${base}`
      default:
        return base
    }
  }, [currentMode, viewport.isMobile])

  const renderModeSelector = () => (
    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => handleModeChange('edit-only')}
        className={`
          flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors
          ${currentMode === 'edit-only'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
          }
        `}
      >
        <PencilIcon className="w-4 h-4" />
        <span className="hidden sm:inline">编辑</span>
      </button>

      {!viewport.isMobile && (
        <button
          onClick={() => handleModeChange('split')}
          className={`
            flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors
            ${currentMode === 'split'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <Bars3Icon className="w-4 h-4" />
          <span className="hidden sm:inline">分屏</span>
        </button>
      )}

      <button
        onClick={() => handleModeChange('preview-only')}
        className={`
          flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors
          ${currentMode === 'preview-only'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
          }
        `}
      >
        <EyeIcon className="w-4 h-4" />
        <span className="hidden sm:inline">预览</span>
      </button>

      {viewport.isMobile && (
        <button
          onClick={() => handleModeChange('tabbed')}
          className={`
            flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors
            ${currentMode === 'tabbed'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <DevicePhoneMobileIcon className="w-4 h-4" />
          <span>标签</span>
        </button>
      )}
    </div>
  )

  const renderDeviceIndicator = () => (
    <div className="flex items-center space-x-1 text-xs text-gray-500">
      {viewport.isMobile && <DevicePhoneMobileIcon className="w-4 h-4" />}
      {viewport.isTablet && <DeviceTabletIcon className="w-4 h-4" />}
      {viewport.isDesktop && <ComputerDesktopIcon className="w-4 h-4" />}
      <span className="hidden sm:inline">
        {viewport.width} × {viewport.height}
      </span>
    </div>
  )

  const renderTabbedInterface = () => (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('edit')}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${activeTab === 'edit'
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            <PencilIcon className="w-4 h-4" />
            <span>编辑</span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${activeTab === 'preview'
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            <EyeIcon className="w-4 h-4" />
            <span>预览</span>
          </button>
        </div>

        {renderDeviceIndicator()}
      </div>

      {/* Tab Content */}
      <div className="flex-1 relative">
        <div
          className={`absolute inset-0 transition-opacity duration-200 ${
            activeTab === 'edit' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {children.editor}
        </div>
        <div
          className={`absolute inset-0 transition-opacity duration-200 ${
            activeTab === 'preview' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {children.preview}
        </div>
      </div>

      {/* Swipe indicator for mobile */}
      {viewport.isMobile && (
        <div className="flex justify-center py-1 bg-gray-50 border-t border-gray-200">
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>
      )}
    </div>
  )

  const renderSplitInterface = () => (
    <div className={`flex ${viewport.isMobile ? 'flex-col' : 'flex-row'} h-full`}>
      {/* Editor Panel */}
      <div className={`
        ${viewport.isMobile ? 'h-1/2' : 'w-1/2'}
        flex flex-col border-r border-gray-200
      `}>
        <div className="flex-1">
          {children.editor}
        </div>
      </div>

      {/* Preview Panel */}
      <div className={`
        ${viewport.isMobile ? 'h-1/2' : 'w-1/2'}
        flex flex-col
      `}>
        <div className="flex-1">
          {children.preview}
        </div>
      </div>
    </div>
  )

  const renderSinglePaneInterface = () => (
    <div className="h-full">
      {currentMode === 'edit-only' ? children.editor : children.preview}
    </div>
  )

  return (
    <div className={`${layoutClasses} ${className}`}>
      {/* Top toolbar */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          {children.toolbar}
        </div>

        <div className="flex items-center space-x-4">
          {renderModeSelector()}
          {!viewport.isMobile && renderDeviceIndicator()}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {currentMode === 'tabbed' && renderTabbedInterface()}
        {currentMode === 'split' && renderSplitInterface()}
        {(currentMode === 'edit-only' || currentMode === 'preview-only') && renderSinglePaneInterface()}
      </div>

      {/* TOC overlay for mobile */}
      {viewport.isMobile && children.toc && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="pointer-events-auto">
            {children.toc}
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for responsive layout management
export function useResponsiveLayout() {
  const [mode, setMode] = useState<LayoutMode>('split')
  const [viewport, setViewport] = useState<ViewportInfo>({
    width: 0,
    height: 0,
    deviceType: 'desktop',
    orientation: 'landscape',
    isMobile: false,
    isTablet: false,
    isDesktop: true
  })

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const deviceType: DeviceType =
        width < 768 ? 'mobile' :
        width < 1024 ? 'tablet' : 'desktop'

      setViewport({
        width,
        height,
        deviceType,
        orientation: width > height ? 'landscape' : 'portrait',
        isMobile: deviceType === 'mobile',
        isTablet: deviceType === 'tablet',
        isDesktop: deviceType === 'desktop'
      })
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  const getRecommendedMode = useCallback((): LayoutMode => {
    if (viewport.isMobile) return 'tabbed'
    if (viewport.isTablet && viewport.orientation === 'portrait') return 'tabbed'
    return 'split'
  }, [viewport])

  return {
    mode,
    setMode,
    viewport,
    getRecommendedMode
  }
}