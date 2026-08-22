"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; type: ToastType; message: string };

const ToastContext = createContext<(message: string, type?: ToastType) => void>(
  () => {},
);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const STYLE: Record<ToastType, { border: string; icon: typeof CheckCircle2 }> = {
  success: { border: "border-l-growth-teal", icon: CheckCircle2 },
  error: { border: "border-l-critique-rust", icon: XCircle },
  info: { border: "border-l-spotlight-amber", icon: Info },
};

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const s = STYLE[toast.type];
  const Icon = s.icon;
  const tone =
    toast.type === "success"
      ? "text-growth-teal"
      : toast.type === "error"
        ? "text-critique-rust"
        : "text-spotlight-amber";
  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 border border-paper-line border-l-2 ${s.border} bg-warm-paper px-4 py-3 shadow-lg`}
    >
      <Icon size={18} strokeWidth={1.5} className={`mt-0.5 shrink-0 ${tone}`} />
      <p className="flex-1 text-sm text-ink-navy">{toast.message}</p>
      <button
        onClick={onClose}
        aria-label="Tutup notifikasi"
        className="shrink-0 text-ink-gray transition-colors hover:text-ink-navy"
      >
        <X size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}
