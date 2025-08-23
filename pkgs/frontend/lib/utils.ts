import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatNumber(value: number | string, decimals: number = 2): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";

  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(decimals)}B`;
  }
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(decimals)}M`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(decimals)}K`;
  }

  return num.toFixed(decimals);
}

export function formatCurrency(value: number | string, currency: string = "USD"): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0.00";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(num);
}

export function formatPercentage(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0%";

  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
}
