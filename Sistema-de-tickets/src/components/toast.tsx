"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect } from "react";

export function Toast({
  message,
  tone = "error",
  onClose,
}: {
  message: string;
  tone?: "error" | "success";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [onClose, message]);

  return (
    <div
      role="status"
      className={`fixed bottom-4 right-4 z-[70] flex max-w-sm items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl animate-in ${
        tone === "error" ? "bg-red-600" : "bg-slate-900"
      }`}
    >
      {tone === "error" ? (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      )}
      <span>{message}</span>
    </div>
  );
}
