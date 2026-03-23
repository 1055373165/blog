import type { AlgorithmReviewStatus } from '../../types';

interface AlgorithmLearningPanelProps {
  summaryNote: string;
  weakPoints: string;
  reviewStatus: AlgorithmReviewStatus;
  nextReviewAt: string;
  disabled?: boolean;
  saving?: boolean;
  onChange: (
    field: 'summaryNote' | 'weakPoints' | 'reviewStatus' | 'nextReviewAt',
    value: string,
  ) => void;
  onSave: () => void;
}

const reviewOptions: Array<{ value: AlgorithmReviewStatus; label: string; hint: string }> = [
  { value: 'new', label: '未开始', hint: '还没形成自己的复述' },
  { value: 'read', label: '已阅读', hint: '看过解析，但不代表能闭卷写出' },
  { value: 'failed_recall', label: '闭卷失败', hint: '提示需要回到主动回忆而不是继续看答案' },
  { value: 'passed_recall', label: '闭卷通过', hint: '说明当前题目已形成较稳定的内部模型' },
  { value: 'needs_review', label: '待复习', hint: '为下一次错题回刷或延迟复现排队' },
];

export default function AlgorithmLearningPanel({
  summaryNote,
  weakPoints,
  reviewStatus,
  nextReviewAt,
  disabled = false,
  saving = false,
  onChange,
  onSave,
}: AlgorithmLearningPanelProps) {
  return (
    <section className="rounded-[1.75rem] border border-violet-200 bg-white p-6 shadow-soft dark:border-violet-900/40 dark:bg-gray-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">
            Learning Correction
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">学习纠偏</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300">
            不再只记录“这题讲了什么”，而是记录你真正会不会、卡在哪里、何时该回刷。
          </p>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={disabled || saving}
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? '保存中...' : '保存学习状态'}
        </button>
      </div>

      {disabled ? (
        <div className="mt-6 rounded-2xl border border-dashed border-violet-200 bg-violet-50/70 px-5 py-4 text-sm text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-300">
          先创建算法资产，再补充学习纠偏信息。这样可以避免把尚未落盘的输入丢在未保存状态里。
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              一句话复述
            </label>
            <textarea
              value={summaryNote}
              onChange={(event) => onChange('summaryNote', event.target.value)}
              disabled={disabled}
              rows={4}
              placeholder="用一句话写出这题真正的核心不变量、状态定义或决策策略。"
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm leading-7 text-gray-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              当前弱点
            </label>
            <textarea
              value={weakPoints}
              onChange={(event) => onChange('weakPoints', event.target.value)}
              disabled={disabled}
              rows={6}
              placeholder="写你真实卡住的点，例如：状态转移想不清、边界条件总漏、能看懂但 15 分钟写不出。"
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm leading-7 text-gray-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-800"
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/60">
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              复习状态
            </label>
            <div className="space-y-2">
              {reviewOptions.map((option) => {
                const active = reviewStatus === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange('reviewStatus', option.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-violet-300 bg-white shadow-soft dark:border-violet-700 dark:bg-gray-900'
                        : 'border-transparent bg-white/70 hover:border-violet-200 dark:bg-gray-900/70 dark:hover:border-violet-800'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{option.label}</p>
                        <p className="mt-1 text-xs leading-6 text-gray-500 dark:text-gray-400">{option.hint}</p>
                      </div>
                      {active ? (
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-violet-500" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              下次复习时间
            </label>
            <input
              type="datetime-local"
              value={nextReviewAt}
              onChange={(event) => onChange('nextReviewAt', event.target.value)}
              disabled={disabled}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-800"
            />
            <p className="mt-2 text-xs leading-6 text-gray-500 dark:text-gray-400">
              先手动设定也可以。后面如果你决定让算法资产进入间隔重复系统，再统一抽象成通用学习目标。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
