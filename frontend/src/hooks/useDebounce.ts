import { useState, useEffect } from 'react';

/**
 * 値をデバウンスするカスタムフック
 * @param value デバウンスする値
 * @param delay 遅延時間（ミリ秒）
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
