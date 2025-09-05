/**
 * 数値フォーマット機能
 * トークン量、価格、パーセンテージなどの表示用フォーマット関数
 */

import { formatUnits, parseUnits } from "viem";

/**
 * フォーマット設定オプション
 */
export interface FormatOptions {
  /** 小数点以下の桁数 */
  decimals?: number;
  /** 通貨記号を表示するか */
  showSymbol?: boolean;
  /** 通貨記号 */
  symbol?: string;
  /** 千の位区切り文字を使用するか */
  useGrouping?: boolean;
  /** 最小表示桁数 */
  minimumFractionDigits?: number;
  /** 最大表示桁数 */
  maximumFractionDigits?: number;
}

/**
 * トークン量をフォーマット（BigInt → 表示用文字列）
 *
 * @param amount トークン量（BigInt）
 * @param decimals トークンの小数点桁数
 * @param options フォーマットオプション
 * @returns フォーマットされた文字列
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  options: FormatOptions = {}
): string {
  const {
    decimals: displayDecimals = 6,
    showSymbol = false,
    symbol = "",
    useGrouping = true,
    minimumFractionDigits,
    maximumFractionDigits = displayDecimals,
  } = options;

  try {
    // BigInt を数値に変換
    const numericValue = Number(formatUnits(amount, decimals));

    // 数値フォーマット
    const formatted = formatNumber(numericValue, {
      useGrouping,
      minimumFractionDigits,
      maximumFractionDigits,
    });

    // 通貨記号を追加
    return showSymbol && symbol ? `${formatted} ${symbol}` : formatted;
  } catch (error) {
    console.error("Token amount formatting error:", error);
    return "0";
  }
}

/**
 * 数値をフォーマット
 *
 * @param value 数値
 * @param options フォーマットオプション
 * @returns フォーマットされた文字列
 */
export function formatNumber(value: number, options: FormatOptions = {}): string {
  const { useGrouping = true, minimumFractionDigits = 0, maximumFractionDigits = 6 } = options;

  if (isNaN(value) || !isFinite(value)) {
    return "0";
  }

  return new Intl.NumberFormat("ja-JP", {
    useGrouping,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

/**
 * 価格をフォーマット（自動的に適切な桁数を選択）
 *
 * @param price 価格
 * @param options フォーマットオプション
 * @returns フォーマットされた価格文字列
 */
export function formatPrice(price: number, options: FormatOptions = {}): string {
  const { showSymbol = false, symbol = "$" } = options;

  if (isNaN(price) || !isFinite(price) || price < 0) {
    return showSymbol ? `${symbol}0` : "0";
  }

  let decimals: number;

  // 価格に応じて適切な小数点桁数を決定
  if (price >= 1000) {
    decimals = 2;
  } else if (price >= 1) {
    decimals = 4;
  } else if (price >= 0.01) {
    decimals = 6;
  } else {
    decimals = 8;
  }

  const formatted = formatNumber(price, {
    useGrouping: true,
    maximumFractionDigits: decimals,
    minimumFractionDigits: price >= 1 ? 2 : 0,
  });

  return showSymbol ? `${symbol}${formatted}` : formatted;
}

/**
 * パーセンテージをフォーマット
 *
 * @param percentage パーセンテージ（0-100の数値）
 * @param options フォーマットオプション
 * @returns フォーマットされたパーセンテージ文字列
 */
export function formatPercentage(percentage: number, options: FormatOptions = {}): string {
  const { decimals = 2 } = options;

  if (isNaN(percentage) || !isFinite(percentage)) {
    return "0%";
  }

  const formatted = formatNumber(percentage, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  });

  return `${formatted}%`;
}

/**
 * 大きな数値を短縮形式でフォーマット（K, M, B, T）
 *
 * @param value 数値
 * @param options フォーマットオプション
 * @returns 短縮形式の文字列
 */
export function formatCompactNumber(value: number, options: FormatOptions = {}): string {
  const { decimals = 2, showSymbol = false, symbol = "$" } = options;

  if (isNaN(value) || !isFinite(value) || value < 0) {
    return showSymbol ? `${symbol}0` : "0";
  }

  const suffixes = [
    { value: 1e12, suffix: "T" },
    { value: 1e9, suffix: "B" },
    { value: 1e6, suffix: "M" },
    { value: 1e3, suffix: "K" },
  ];

  for (const { value: threshold, suffix } of suffixes) {
    if (value >= threshold) {
      const compactValue = value / threshold;
      const formatted = formatNumber(compactValue, {
        maximumFractionDigits: decimals,
        minimumFractionDigits: 0,
      });
      const result = `${formatted}${suffix}`;
      return showSymbol ? `${symbol}${result}` : result;
    }
  }

  // 1000未満の場合は通常のフォーマット
  const formatted = formatNumber(value, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  });

  return showSymbol ? `${symbol}${formatted}` : formatted;
}

/**
 * 時間をフォーマット（秒から人間が読みやすい形式へ）
 *
 * @param seconds 秒数
 * @returns フォーマットされた時間文字列
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}時間${minutes}分` : `${hours}時間`;
  } else {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return hours > 0 ? `${days}日${hours}時間` : `${days}日`;
  }
}

/**
 * アドレスを短縮形式でフォーマット
 *
 * @param address ウォレットアドレス
 * @param startLength 開始部分の文字数（デフォルト: 6）
 * @param endLength 終了部分の文字数（デフォルト: 4）
 * @returns 短縮されたアドレス
 */
export function formatAddress(
  address: string,
  startLength: number = 6,
  endLength: number = 4
): string {
  if (!address || address.length < startLength + endLength) {
    return address;
  }

  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * トランザクションハッシュを短縮形式でフォーマット
 *
 * @param hash トランザクションハッシュ
 * @returns 短縮されたハッシュ
 */
export function formatTxHash(hash: string): string {
  return formatAddress(hash, 8, 6);
}

/**
 * 日付をフォーマット
 *
 * @param date 日付
 * @param options フォーマットオプション
 * @returns フォーマットされた日付文字列
 */
export function formatDate(
  date: Date | number | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };

  try {
    const dateObj = new Date(date);
    return new Intl.DateTimeFormat("ja-JP", defaultOptions).format(dateObj);
  } catch (error) {
    console.error("Date formatting error:", error);
    return "無効な日付";
  }
}

/**
 * 相対時間をフォーマット（〜前、〜後）
 *
 * @param date 基準となる日付
 * @param baseDate 比較基準日（デフォルト: 現在時刻）
 * @returns 相対時間文字列
 */
export function formatRelativeTime(
  date: Date | number | string,
  baseDate: Date = new Date()
): string {
  try {
    const targetDate = new Date(date);
    const diffMs = targetDate.getTime() - baseDate.getTime();
    const diffSeconds = Math.abs(diffMs) / 1000;

    const rtf = new Intl.RelativeTimeFormat("ja", { numeric: "auto" });

    if (diffSeconds < 60) {
      return rtf.format(Math.sign(diffMs) * Math.floor(diffSeconds), "second");
    } else if (diffSeconds < 3600) {
      return rtf.format(Math.sign(diffMs) * Math.floor(diffSeconds / 60), "minute");
    } else if (diffSeconds < 86400) {
      return rtf.format(Math.sign(diffMs) * Math.floor(diffSeconds / 3600), "hour");
    } else {
      return rtf.format(Math.sign(diffMs) * Math.floor(diffSeconds / 86400), "day");
    }
  } catch (error) {
    console.error("Relative time formatting error:", error);
    return "不明";
  }
}

/**
 * 入力値を BigInt に変換（文字列 → BigInt）
 *
 * @param value 入力値（文字列）
 * @param decimals トークンの小数点桁数
 * @returns BigInt値
 */
export function parseTokenAmount(value: string, decimals: number): bigint {
  try {
    // 空文字列や無効な値の場合は0を返す
    if (!value || value.trim() === "" || isNaN(Number(value))) {
      return BigInt(0);
    }

    // 負の値は0として扱う
    const numValue = Number(value);
    if (numValue < 0) {
      return BigInt(0);
    }

    return parseUnits(value, decimals);
  } catch (error) {
    console.error("Token amount parsing error:", error);
    return BigInt(0);
  }
}

/**
 * 数値の有効性をチェック
 *
 * @param value チェックする値
 * @returns 有効な数値かどうか
 */
export function isValidNumber(value: any): boolean {
  return typeof value === "number" && isFinite(value) && !isNaN(value);
}

/**
 * 文字列が有効な数値表現かチェック
 *
 * @param value チェックする文字列
 * @returns 有効な数値文字列かどうか
 */
export function isValidNumberString(value: string): boolean {
  if (!value || value.trim() === "") return false;
  const num = Number(value);
  return isValidNumber(num) && num >= 0;
}

/**
 * 小数点以下の桁数を制限
 *
 * @param value 数値文字列
 * @param maxDecimals 最大小数点桁数
 * @returns 桁数制限された文字列
 */
export function limitDecimals(value: string, maxDecimals: number): string {
  if (!value.includes(".")) return value;

  const [integer, decimal] = value.split(".");
  const limitedDecimal = decimal.slice(0, maxDecimals);

  return limitedDecimal ? `${integer}.${limitedDecimal}` : integer;
}

/**
 * 数値入力を正規化（ローカルの小数点・全角ドット/カンマ対応、不要文字の除去、複数ドットの解決）。
 * @param value 入力文字列
 * @param maxDecimals 最大小数桁（省略可）
 */
export function normalizeNumericInput(value: string, maxDecimals?: number): string {
  if (typeof value !== "string") return "";

  // 全角/日本語句読点/中点/アラビア小数点/カンマをドットに統一
  let v = value.replace(/[，、。．,・･٫٬]/g, ".");

  // 数字とドット以外を除去
  v = v.replace(/[^0-9.]/g, "");

  // 複数ドットは最初の1つだけ残し、以降は削除
  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    const before = v.slice(0, firstDot + 1);
    const after = v.slice(firstDot + 1).replace(/\./g, "");
    v = before + after;
  }

  // 先頭がドットなら 0. を付与
  if (v.startsWith(".")) v = `0${v}`;

  // 小数桁制限
  if (typeof maxDecimals === "number" && maxDecimals >= 0) {
    v = limitDecimals(v, maxDecimals);
  }

  return v;
}

/**
 * 数値の範囲をクランプ（制限）
 *
 * @param value 値
 * @param min 最小値
 * @param max 最大値
 * @returns クランプされた値
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
