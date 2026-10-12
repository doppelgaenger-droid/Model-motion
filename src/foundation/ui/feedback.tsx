import "./feedback.css";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { UIButton } from "./controls";

export function UIConfirmDialog({ open, title, description, confirmLabel = "Confirm", busy = false, onConfirm, onCancel }: {
  open: boolean; title: string; description: ReactNode; confirmLabel?: string;
  busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="mm-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id={titleId}>{title}</h2><div className="mm-dialog-description">{description}</div>
    <div className="mm-dialog-actions">
      <UIButton onClick={onCancel} disabled={busy}>Cancel</UIButton>
      <UIButton variant="primary" onClick={onConfirm} disabled={busy}>{busy ? "Working…" : confirmLabel}</UIButton>
    </div>
  </dialog>;
}

export function UIProgress({ current, total, label }: { current: number; total: number; label: string }) {
  const safeTotal = Math.max(1, total);
  return <div className="mm-progress" role="status" aria-live="polite">
    <div className="mm-progress-label"><span>{label}</span><span>{Math.min(current, total)} / {total}</span></div>
    <progress max={safeTotal} value={Math.max(0, Math.min(current, safeTotal))}/>
  </div>;
}

export function UINotice({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: ReactNode }) {
  return <div className={`mm-notice mm-notice--${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}
