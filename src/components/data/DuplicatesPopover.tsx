"use client";

import React, { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";
import { PointData } from "@/types/data";
import styles from "./DuplicatesPopover.module.css";

interface DuplicatesPopoverProps {
  currentRow: PointData;
  allReports: PointData[];
}

export default function DuplicatesPopover({ currentRow, allReports }: DuplicatesPopoverProps) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const duplicates = allReports.filter(
    (r) =>
      r.RelReportID != null &&
      currentRow.RelReportID != null &&
      r.RelReportID === currentRow.RelReportID &&
      r.id !== currentRow.id
  );

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (duplicates.length === 0) return null;

  const POPOVER_HEIGHT = 320; // approximate max height of the popover

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const flipUp = spaceBelow < POPOVER_HEIGHT;

      setPopoverPos({
        top: flipUp
          ? rect.top + window.scrollY - POPOVER_HEIGHT - 6
          : rect.bottom + window.scrollY + 6,
        left: rect.right + window.scrollX,
      });
    }
    setOpen(true);
  };

  return (
    <div className={styles.wrapper}>
      <button
        ref={buttonRef}
        className={styles.iconButton}
        onClick={handleOpen}
        title={`${duplicates.length} related report${duplicates.length > 1 ? "s" : ""}`}
        type="button"
      >
        <Info size={15} strokeWidth={2} />
        <span className={styles.badge}>{duplicates.length}</span>
      </button>

      {open && popoverPos && (
        <div
          ref={popoverRef}
          className={styles.popover}
          style={{
            position: "fixed",
            top: popoverPos.top,
            // anchor right edge to button's right edge
            left: popoverPos.left,
            transform: "translateX(-100%)",
          }}
        >
          <div className={styles.popoverHeader}>
            <span>Potential Related Reports ({duplicates.length})</span>
            <button className={styles.closeBtn} onClick={() => setOpen(false)} type="button">
              ×
            </button>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.miniTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>City</th>
                  <th>Activity</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {duplicates.map((r) => (
                  <tr key={r.id}>
                    <td>{r.Date}</td>
                    <td>{r.City ?? "—"}</td>
                    <td>{r.Activity}</td>
                    <td>{r.Description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
