import React from 'react';
import { AnimationSpeed, AnimationSpeedConfig } from '../../types';

interface SpeedControlsProps {
  speed: AnimationSpeed;
  onSpeedChange: (speed: AnimationSpeed) => void;
  className?: string;
}

export default function SpeedControls({ speed, onSpeedChange, className = '' }: SpeedControlsProps) {
  const speedConfigs: AnimationSpeedConfig[] = [
    {
      speed: 'slow',
      multiplier: 0.3,
      label: '慢速',
      description: '悠闲漂浮，适合阅读',
      icon: '🐌'
    },
    {
      speed: 'normal',
      multiplier: 1.0,
      label: '正常',
      description: '标准速度，平衡体验',
      icon: '🚶'
    },
    {
      speed: 'fast',
      multiplier: 2.0,
      label: '快速',
      description: '活泼动感，充满活力',
      icon: '🏃'
    },
    {
      speed: 'ultra',
      multiplier: 4.0,
      label: '极速',
      description: '疯狂模式，刺激体验',
      icon: '🚀'
    }
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="mb-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
          漂浮速度
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          调整箴言卡片的移动速度
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {speedConfigs.map((config) => (
          <button
            key={config.speed}
            onClick={() => onSpeedChange(config.speed)}
            className={`
              relative p-3 rounded-lg border-2 text-left transition-all duration-200 hover:scale-105
              ${speed === config.speed
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }
            `}
            title={config.description}
          >
            <div className="flex items-center mb-2">
              <span className="text-lg mr-2">{config.icon}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {config.label}
              </span>
              {speed === config.speed && (
                <svg className="w-4 h-4 ml-auto text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {config.multiplier}x
              </span>
              {speed === config.speed && (
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
        💡 实时调整，无需重启动画
      </div>
    </div>
  );
}