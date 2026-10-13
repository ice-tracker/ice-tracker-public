"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import styles from "./ReportVisibilityToggle.module.css";
import { PointData } from "@/types/data";

interface Props {
  report: PointData;
  onChanged: (id: number, hidden: boolean) => void;
}

// Admin control for a single report's visibility. Replaces the old delete
// button: nothing is removed from the database, it is flipped out of every
// public read instead (see PATCH /api/reports/[id]).
export default function ReportVisibilityToggle({ report, onChanged }: Props) {
  const isHidden = !!report.Hidden;
  const nextHidden = !isHidden;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const closeIfIdle = () => {
    if (loading) return;
    setOpen(false);
    setError(null);
    setReason("");
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: nextHidden, reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Update failed");
        setLoading(false);
        return;
      }
      setOpen(false);
      setReason("");
      setLoading(false);
      onChanged(report.id, nextHidden);
    } catch {
      setError("Network error — please try again");
      setLoading(false);
    }
  };

  // The modal is portalled to <body> rather than left in the table cell. As a
  // descendant of a <tr> it was at the mercy of any stacking context on the row
  // — which is exactly what broke unhiding — and a dialog has no reason to be
  // scoped to the cell that opened it.
  const modal = (
    <div className={styles.modalOverlay} onClick={closeIfIdle}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>
            {nextHidden ? "Hide Report" : "Restore Report"}
          </span>
          <button
            className={styles.modalCloseButton}
            onClick={closeIfIdle}
            disabled={loading}
            type="button"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <p>
            {nextHidden
              ? "Hide this report from the public site?"
              : "Make this report public again?"}
          </p>
          <p className={styles.reportInfo}>
            <strong>{report.Date}</strong> — {report.Activity} at {report.Location}
            {report.City ? `, ${report.City}` : ""}
          </p>
          <p className={styles.noteText}>
            {nextHidden
              ? "It stays in the database and in this table, but disappears from the map, the public data table, the CSV export, and every area total. Nothing else changes and you can restore it at any time."
              : "It will show up on the map, in the public data table, in the CSV export, and in area totals again."}
          </p>

          <label className={styles.reasonLabel} htmlFor={`vis-reason-${report.id}`}>
            Reason (optional)
          </label>
          <textarea
            id={`vis-reason-${report.id}`}
            className={styles.reasonInput}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={nextHidden ? "e.g. duplicate of #1234" : "e.g. verified, re-publishing"}
            rows={2}
            maxLength={500}
            disabled={loading}
          />
          <p className={styles.noteText}>Recorded in the audit log.</p>

          {error && <p className={styles.errorText}>{error}</p>}
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.cancelButton}
            onClick={closeIfIdle}
            disabled={loading}
            type="button"
          >
            Cancel
          </button>
          <button
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={loading}
            type="button"
          >
            {loading
              ? nextHidden
                ? "Hiding…"
                : "Restoring…"
              : nextHidden
                ? "Hide"
                : "Restore"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        className={`${styles.toggleButton} ${isHidden ? styles.isHidden : styles.isVisible}`}
        onClick={() => setOpen(true)}
        type="button"
        title={
          isHidden
            ? "Hidden from the public site — click to restore"
            : "Visible on the public site — click to hide"
        }
      >
        {isHidden ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
      </button>

      {open && typeof document !== "undefined" && createPortal(modal, document.body)}
    </>
  );
}
