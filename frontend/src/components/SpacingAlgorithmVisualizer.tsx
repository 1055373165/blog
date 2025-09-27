import React, { useState, useMemo } from 'react';
import { CalendarIcon, ClockIcon, ChartBarIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

interface SpacingAlgorithmVisualizerProps {
  algorithm: 'ebbinghaus' | 'sm2' | 'anki';
  itemCount?: number;
  startDate?: Date;
  className?: string;
}

interface ReviewSchedule {
  day: number;
  date: Date;
  interval: number;
  description: string;
  confidence?: number; // For SM2 and Anki
}

const SpacingAlgorithmVisualizer: React.FC<SpacingAlgorithmVisualizerProps> = ({
  algorithm,
  itemCount = 1,
  startDate = new Date(),
  className = ''
}) => {
  const [selectedItem, setSelectedItem] = useState<number>(0);

  // 艾宾浩斯遗忘曲线间隔（天）
  const ebbinghausIntervals = [1, 3, 7, 15, 30, 60, 120];

  // SuperMemo 2 算法
  const calculateSM2Schedule = (easeFactor = 2.5): ReviewSchedule[] => {
    const schedule: ReviewSchedule[] = [];
    let interval = 1;
    let ef = easeFactor;
    
    for (let i = 0; i < 10; i++) {
      const reviewDate = new Date(startDate);
      reviewDate.setDate(startDate.getDate() + (i === 0 ? 0 : schedule.reduce((sum, s) => sum + s.interval, 0)));
      
      schedule.push({
        day: i + 1,
        date: reviewDate,
        interval: interval,
        description: i === 0 ? '首次学习' : `第${i + 1}次复习`,
        confidence: Math.max(1.3, ef)
      });

      if (i === 0) {
        interval = 1;
      } else if (i === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * ef);
        // 模拟用户反馈调整EF
        ef = Math.max(1.3, ef + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02)));
      }
    }
    
    return schedule;
  };

  // Anki算法
  const calculateAnkiSchedule = (): ReviewSchedule[] => {
    const schedule: ReviewSchedule[] = [];
    const intervals = [1, 10]; // Learning steps: 1 min, 10 min
    let graduatingInterval = 1; // 1 day
    let easyInterval = 4; // 4 days
    let currentInterval = graduatingInterval;
    
    // Learning phase
    intervals.forEach((interval, index) => {
      const reviewDate = new Date(startDate);
      if (index === 0) {
        reviewDate.setMinutes(startDate.getMinutes() + interval);
      } else {
        reviewDate.setMinutes(startDate.getMinutes() + intervals[0] + interval);
      }
      
      schedule.push({
        day: index + 1,
        date: reviewDate,
        interval: interval,
        description: `学习阶段 ${index + 1}`,
        confidence: 2.5
      });
    });

    // Review phase
    for (let i = 0; i < 8; i++) {
      const reviewDate = new Date(startDate);
      const totalDays = i === 0 ? graduatingInterval : 
                       schedule.slice(2).reduce((sum, s) => sum + s.interval, graduatingInterval);
      reviewDate.setDate(startDate.getDate() + totalDays);
      
      schedule.push({
        day: i + 3,
        date: reviewDate,
        interval: currentInterval,
        description: i === 0 ? '毕业复习' : `第${i + 1}次复习`,
        confidence: 2.5
      });

      // Update interval based on Anki algorithm
      currentInterval = Math.round(currentInterval * 2.5);
    }
    
    return schedule;
  };

  // 生成复习计划
  const reviewSchedule = useMemo((): ReviewSchedule[] => {
    switch (algorithm) {
      case 'ebbinghaus':
        return ebbinghausIntervals.map((interval, index) => {
          const reviewDate = new Date(startDate);
          const totalDays = ebbinghausIntervals.slice(0, index + 1).reduce((sum, days) => sum + days, 0) - interval;
          reviewDate.setDate(startDate.getDate() + totalDays);
          
          return {
            day: index + 1,
            date: reviewDate,
            interval: interval,
            description: index === 0 ? '首次学习' : `第${index + 1}次复习`
          };
        });
      
      case 'sm2':
        return calculateSM2Schedule();
      
      case 'anki':
        return calculateAnkiSchedule();
      
      default:
        return [];
    }
  }, [algorithm, startDate]);

  const getAlgorithmInfo = () => {
    switch (algorithm) {
      case 'ebbinghaus':
        return {
          name: '艾宾浩斯遗忘曲线',
          description: '基于遗忘曲线的固定间隔复习，间隔为：1天、3天、7天、15天、30天、60天、120天',
          color: 'blue',
          features: ['固定间隔', '科学验证', '简单易懂']
        };
      case 'sm2':
        return {
          name: 'SuperMemo 2算法',
          description: '根据记忆难度动态调整复习间隔，考虑个人学习能力差异',
          color: 'green',
          features: ['自适应间隔', '难度系数', '个性化调整']
        };
      case 'anki':
        return {
          name: 'Anki算法',
          description: '结合学习阶段和复习阶段，先短间隔强化，后长间隔维持',
          color: 'purple',
          features: ['两阶段学习', '渐进间隔', '灵活调整']
        };
      default:
        return { name: '', description: '', color: 'gray', features: [] };
    }
  };

  const algorithmInfo = getAlgorithmInfo();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: algorithm === 'anki' && date.getTime() - startDate.getTime() < 24 * 60 * 60 * 1000 ? 'numeric' : undefined,
      minute: algorithm === 'anki' && date.getTime() - startDate.getTime() < 24 * 60 * 60 * 1000 ? 'numeric' : undefined
    });
  };

  const getIntervalText = (interval: number, isAnkiLearning: boolean = false) => {
    if (isAnkiLearning) {
      return `${interval}分钟`;
    }
    if (interval < 1) {
      return `${Math.round(interval * 24)}小时`;
    }
    return `${interval}天`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* 算法信息头部 */}
      <div className={`p-4 bg-${algorithmInfo.color}-50 border-b border-${algorithmInfo.color}-100 rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 bg-${algorithmInfo.color}-100 rounded-lg`}>
              <ChartBarIcon className={`w-6 h-6 text-${algorithmInfo.color}-600`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold text-${algorithmInfo.color}-900`}>
                {algorithmInfo.name}
              </h3>
              <p className={`text-sm text-${algorithmInfo.color}-700 mt-1`}>
                {algorithmInfo.description}
              </p>
            </div>
          </div>
        </div>
        
        {/* 算法特性标签 */}
        <div className="flex flex-wrap gap-2 mt-3">
          {algorithmInfo.features.map((feature, index) => (
            <span
              key={index}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${algorithmInfo.color}-100 text-${algorithmInfo.color}-800`}
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* 复习时间表 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900 flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2 text-gray-500" />
            复习时间表
          </h4>
          <span className="text-sm text-gray-500">
            共 {reviewSchedule.length} 次复习
          </span>
        </div>

        {/* 时间轴 */}
        <div className="space-y-3">
          {reviewSchedule.slice(0, 8).map((review, index) => {
            const isToday = review.date.toDateString() === new Date().toDateString();
            const isPast = review.date < new Date() && !isToday;
            const isAnkiLearning = algorithm === 'anki' && index < 2;
            
            return (
              <div
                key={index}
                className={`flex items-center space-x-4 p-3 rounded-lg border transition-all ${
                  isToday
                    ? `bg-${algorithmInfo.color}-50 border-${algorithmInfo.color}-200`
                    : isPast
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                {/* 序号 */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isToday
                    ? `bg-${algorithmInfo.color}-500 text-white`
                    : isPast
                    ? 'bg-gray-400 text-white'
                    : `bg-${algorithmInfo.color}-100 text-${algorithmInfo.color}-700`
                }`}>
                  {index + 1}
                </div>

                {/* 复习信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${
                      isToday ? `text-${algorithmInfo.color}-900` : 'text-gray-900'
                    }`}>
                      {review.description}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span className="flex items-center">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        {getIntervalText(review.interval, isAnkiLearning)}
                      </span>
                      {review.confidence && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          review.confidence >= 2.5
                            ? 'bg-green-100 text-green-800'
                            : review.confidence >= 2.0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          难度系数: {review.confidence.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(review.date)}
                    {isToday && <span className={`ml-2 text-${algorithmInfo.color}-600 font-medium`}>今天</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 统计信息 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {reviewSchedule.length}
              </p>
              <p className="text-xs text-gray-500">总复习次数</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(reviewSchedule[reviewSchedule.length - 1]?.interval || 0)}
              </p>
              <p className="text-xs text-gray-500">最终间隔(天)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(
                  (reviewSchedule[reviewSchedule.length - 1]?.date.getTime() - startDate.getTime()) / 
                  (1000 * 60 * 60 * 24)
                )}
              </p>
              <p className="text-xs text-gray-500">学习周期(天)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {algorithm === 'ebbinghaus' ? '固定' : '自适应'}
              </p>
              <p className="text-xs text-gray-500">间隔类型</p>
            </div>
          </div>
        </div>

        {/* 算法说明 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-2">
            <AcademicCapIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">算法原理：</p>
              {algorithm === 'ebbinghaus' && (
                <p>基于艾宾浩斯遗忘曲线，使用固定的时间间隔进行复习。间隔时间逐渐增长，符合人类记忆遗忘规律。</p>
              )}
              {algorithm === 'sm2' && (
                <p>根据每次复习的难易程度调整下次复习间隔。难度系数(EF)会根据回答质量动态调整，实现个性化学习。</p>
              )}
              {algorithm === 'anki' && (
                <p>分为学习阶段(短间隔)和复习阶段(长间隔)。新内容先通过短间隔强化记忆，掌握后转入长间隔维持。</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpacingAlgorithmVisualizer;
