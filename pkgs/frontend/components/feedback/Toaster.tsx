"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { NETWORK_CONSTANTS, SUCCESS_MESSAGES } from "@/utils/constants";

type ToastType = "success" | "error" | "info" | "loading";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  description?: string;
  txHash?: string | null;
  href?: string;
  duration?: number; // ms; undefined means use default; 0 disables auto-dismiss
}

interface ToastContextValue {
  toasts: ToastItem[];
  show: (toast: Omit<ToastItem, "id"> & { id?: string }) => string;
  update: (id: string, patch: Partial<ToastItem>) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const genId = () => Math.random().toString(36).slice(2);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const scheduleAutoDismiss = useCallback((id: string, duration?: number) => {
    const d = typeof duration === "number" ? duration : 5000;
    if (d <= 0) return; // no auto-dismiss
    if (timers.current.has(id)) window.clearTimeout(timers.current.get(id));
    const handle = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, d);
    timers.current.set(id, handle);
  }, []);

  const show: ToastContextValue["show"] = useCallback(
    (toast) => {
      const id = toast.id ?? genId();
      setToasts((prev) => {
        const next: ToastItem = { id, ...toast } as ToastItem;
        return [...prev, next];
      });
      if (toast.type !== "loading") scheduleAutoDismiss(id, toast.duration);
      return id;
    },
    [scheduleAutoDismiss]
  );

  const update: ToastContextValue["update"] = useCallback(
    (id, patch) => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      if (patch.type && patch.type !== "loading") scheduleAutoDismiss(id, patch.duration);
    },
    [scheduleAutoDismiss]
  );

  const dismiss: ToastContextValue["dismiss"] = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current.has(id)) window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
    for (const h of timers.current.values()) window.clearTimeout(h);
    timers.current.clear();
  }, []);

  const value = useMemo(
    () => ({ toasts, show, update, dismiss, clear }),
    [toasts, show, update, dismiss, clear]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
      <FirstRunHint
        maybeShow={(msg) =>
          show({
            type: "info",
            title: msg,
            description: "ウォレットを接続し、トークンを選択して金額を入力します。",
            duration: 7000,
          })
        }
      />
    </ToastContext.Provider>
  );
}

export function useToasts(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToasts must be used within ToasterProvider");
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      role="region"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <ToastItemView key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItemView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const icon =
    toast.type === "success" ? (
      <CheckCircle2 className="h-5 w-5 text-green-600" />
    ) : toast.type === "error" ? (
      <XCircle className="h-5 w-5 text-red-600" />
    ) : toast.type === "loading" ? (
      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
    ) : (
      <Info className="h-5 w-5 text-blue-600" />
    );

  const borderColor =
    toast.type === "success"
      ? "border-green-200"
      : toast.type === "error"
        ? "border-red-200"
        : "border-blue-200";

  const role = toast.type === "error" ? "alert" : "status";
  return (
    <div
      role={role}
      className={cn(
        "pointer-events-auto relative flex items-start gap-3 rounded-md border bg-white p-3 shadow-lg",
        borderColor
      )}
    >
      <div className="pt-0.5">{icon}</div>
      <div className="flex-1">
        {toast.title && <div className="text-sm font-medium">{toast.title}</div>}
        {toast.description && (
          <div className="text-xs text-muted-foreground">{toast.description}</div>
        )}
        {toast.txHash && (
          <a
            className="mt-1 inline-block text-xs text-blue-600 hover:underline"
            href={`${NETWORK_CONSTANTS.EXPLORER_URL}/tx/${toast.txHash}`}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Etherscanでトランザクション詳細を開く"
          >
            Etherscanで確認
          </a>
        )}
      </div>
      <button onClick={onDismiss} className="text-xs text-muted-foreground">
        閉じる
      </button>
    </div>
  );
}

// 1回だけ初回ヒントを表示
function FirstRunHint({ maybeShow }: { maybeShow: (msg: string) => void }) {
  useEffect(() => {
    try {
      const key = "amm-dex-first-run-hint-v1";
      const seen = typeof window !== "undefined" ? window.localStorage.getItem(key) : "true";
      if (!seen) {
        maybeShow("ようこそ！まずはスワップを試してみましょう");
        window.localStorage.setItem(key, "seen");
      }
    } catch {}
  }, [maybeShow]);
  return null;
}

// Convenience helpers
export function useToastHelpers() {
  const { show, update, dismiss } = useToasts();

  const showLoading = useCallback(
    (title: string, description?: string) =>
      show({ type: "loading", title, description, duration: 0 }),
    [show]
  );
  const showSuccess = useCallback(
    (title: string, description?: string, txHash?: string | null) =>
      show({ type: "success", title, description, txHash }),
    [show]
  );
  const showError = useCallback(
    (title: string, description?: string) => show({ type: "error", title, description }),
    [show]
  );
  const showInfo = useCallback(
    (title: string, description?: string) => show({ type: "info", title, description }),
    [show]
  );

  return { show, update, dismiss, showLoading, showSuccess, showError, showInfo };
}
