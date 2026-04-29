"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import styles from "./DeleteReportButton.module.css";
import { PointData } from "@/types/data";

interface Props {
  report: PointData;
  onDeleted: (id: number) => void;
}

export default function DeleteReportButton({ report, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${report.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Delete failed");
        setLoading(false);
        return;
      }
      setOpen(false);
      onDeleted(report.id);
    } catch {
      setError("Network error — please try again");
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className={styles.deleteButton}
        onClick={() => setOpen(true)}
        type="button"
        title="Delete this report"
      >
        <Trash2 size={14} strokeWidth={2} />
      </button>

      {open && (
        <div
          className={styles.modalOverlay}
          onClick={() => { if (!loading) setOpen(false); }}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Delete Report</span>
              <button
                className={styles.modalCloseButton}
                onClick={() => { if (!loading) setOpen(false); }}
                disabled={loading}
                type="button"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>Are you sure you want to permanently delete this report?</p>
              <p className={styles.reportInfo}>
                <strong>{report.Date}</strong> — {report.Activity} at {report.Location}
                {report.City ? `, ${report.City}` : ""}
              </p>
              <p className={styles.warningText}>This action cannot be undone.</p>
              {error && <p className={styles.errorText}>{error}</p>}
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setOpen(false)}
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
                {loading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
