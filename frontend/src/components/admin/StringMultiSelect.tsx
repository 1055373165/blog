import { useEffect, useRef, useState } from 'react';

interface StringMultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  placeholder: string;
}

export default function StringMultiSelect({
  label,
  options,
  selected,
  onToggle,
  onClear,
  placeholder,
}: StringMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-w-0" ref={containerRef}>
      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="w-full min-h-[44px] px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-left transition-all duration-200 hover:border-go-300 dark:hover:border-go-600 focus:outline-none focus:ring-2 focus:ring-go-500"
        >
          <div className="flex items-center gap-2 flex-wrap">
            {selected.length > 0 ? (
              selected.map((value) => (
                <span
                  key={value}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 rounded-full"
                >
                  {value}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</span>
            )}
            <span className="ml-auto text-gray-400">
              <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg z-20 overflow-hidden">
            <div className="max-h-56 overflow-y-auto py-2">
              {options.length > 0 ? (
                options.map((option) => {
                  const checked = selected.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onToggle(option)}
                      className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                        checked
                          ? 'bg-go-50 dark:bg-go-900/20 text-go-700 dark:text-go-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            checked
                              ? 'border-go-500 bg-go-500 text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {checked && (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        {option}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                  暂无可选项
                </div>
              )}
            </div>
            {selected.length > 0 && (
              <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClear}
                  className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  清空已选
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
