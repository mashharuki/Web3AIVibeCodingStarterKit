import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSSのクラスを結合し、重複を解決するユーティリティ関数
 *
 * @param inputs 結合するクラスの配列
 * @returns 結合されたクラス文字列
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
