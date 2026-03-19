import { KeyboardEvent, useMemo, useState } from 'react';

interface TokenInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  helperText?: string;
}

export default function TokenInput({
  label,
  values,
  onChange,
  placeholder,
  suggestions = [],
  helperText,
}: TokenInputProps) {
  const [inputValue, setInputValue] = useState('');

  const normalizedValues = useMemo(
    () => values.map((value) => value.trim()).filter(Boolean),
    [values]
  );

  const filteredSuggestions = useMemo(() => {
    const keyword = inputValue.trim().toLowerCase();
    return suggestions
      .filter((suggestion) => !normalizedValues.some((value) => value.toLowerCase() === suggestion.toLowerCase()))
      .filter((suggestion) => !keyword || suggestion.toLowerCase().includes(keyword))
      .slice(0, 8);
  }, [inputValue, normalizedValues, suggestions]);

  const commitTokens = (rawValue: string) => {
    const nextTokens = rawValue
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (nextTokens.length === 0) {
      return;
    }

    const merged = [...normalizedValues];
    nextTokens.forEach((token) => {
      if (!merged.some((value) => value.toLowerCase() === token.toLowerCase())) {
        merged.push(token);
      }
    });

    onChange(merged);
    setInputValue('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitTokens(inputValue);
      return;
    }

    if (event.key === 'Backspace' && !inputValue && normalizedValues.length > 0) {
      onChange(normalizedValues.slice(0, -1));
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 px-3 py-3 focus-within:ring-2 focus-within:ring-go-500 focus-within:border-transparent transition-all duration-200">
        <div className="flex flex-wrap gap-2 mb-2">
          {normalizedValues.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 rounded-full"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(normalizedValues.filter((item) => item !== value))}
                className="text-go-500 hover:text-go-700 dark:hover:text-go-200 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commitTokens(inputValue)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none"
        />
      </div>

      {helperText && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}

      {filteredSuggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                commitTokens(suggestion);
              }}
              className="px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-go-50 dark:hover:bg-go-900/20 hover:text-go-700 dark:hover:text-go-300 rounded-full transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
