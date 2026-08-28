"use client";

import React, { useState } from "react";
import { DuplicateGroup } from "@/types/data";
import ReportVisibilityToggle from "./ReportVisibilityToggle";
import styles from "./DuplicatesReviewPanel.module.css";

interface Props {
  exactGroups: DuplicateGroup[];
  relatedGroups: DuplicateGroup[];
  loading: boolean;
  onVisibilityChanged: (id: number, hidden: boolean) => void;
}

function ExactDuplicateGroup({
  group,
  onVisibilityChanged,
}: {
  group: DuplicateGroup;
  onVisibilityChanged: (id: number, hidden: boolean) => void;
}) {
  const [keeperId, setKeeperId] = useState(group.suggestedKeeperId ?? group.reports[0].id);
  const [hiding, setHiding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleHideOthers = async () => {
    setHiding(true);
    setError(null);
    const toHide = group.reports.filter((r) => r.id !== keeperId);
    try {
      for (const report of toHide) {
        const res = await fetch(`/api/reports/${report.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hidden: true,
            reason: `Exact duplicate of report ${keeperId}`,
          }),
        });
        if (!res.ok) throw new Error(`Failed to hide report ${report.id}`);
        onVisibilityChanged(report.id, true);
      }
    } catch {
      setError("Some reports could not be hidden — please retry.");
    } finally {
      setHiding(false);
    }
  };

  return (
    <div className={styles.group}>
      <table className={styles.groupTable}>
        <thead>
          <tr>
            <th>Keep</th>
            <th>Date</th>
            <th>City</th>
            <th>Activity</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {group.reports.map((r) => (
            <tr key={r.id}>
              <td>
                <input
                  type="radio"
                  name={group.key}
                  checked={keeperId === r.id}
                  onChange={() => setKeeperId(r.id)}
                  disabled={hiding}
                />
              </td>
              <td>{r.Date}</td>
              <td>{r.City ?? "—"}</td>
              <td>{r.Activity}</td>
              <td>{r.Description ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <p className={styles.errorText}>{error}</p>}
      <button
        className={styles.actionButton}
        onClick={handleHideOthers}
        disabled={hiding}
        type="button"
      >
        {hiding ? "Hiding…" : "Hide the rest, keep selected"}
      </button>
    </div>
  );
}

function RelatedGroup({
  group,
  onVisibilityChanged,
}: {
  group: DuplicateGroup;
  onVisibilityChanged: (id: number, hidden: boolean) => void;
}) {
  return (
    <div className={styles.group}>
      <table className={styles.groupTable}>
        <thead>
          <tr>
            <th>Date</th>
            <th>City</th>
            <th>Activity</th>
            <th>Description</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {group.reports.map((r) => (
            <tr key={r.id}>
              <td>{r.Date}</td>
              <td>{r.City ?? "—"}</td>
              <td>{r.Activity}</td>
              <td>{r.Description ?? "—"}</td>
              <td>
                <ReportVisibilityToggle report={r} onChanged={onVisibilityChanged} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DuplicatesReviewPanel({
  exactGroups,
  relatedGroups,
  loading,
  onVisibilityChanged,
}: Props) {
  if (loading) {
    return <p className={styles.emptyState}>Loading duplicate reports…</p>;
  }

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Exact duplicates</h2>
        <p className={styles.sectionHint}>
          Same date, location, activity, and description — almost always accidental
          (double-submit, re-uploaded CSV). A keeper is pre-selected; review and hide the rest.
          Hidden reports stay in the database and can be restored from the Reports tab.
        </p>
        {exactGroups.length > 0 ? (
          exactGroups.map((group) => (
            <ExactDuplicateGroup
              key={group.key}
              group={group}
              onVisibilityChanged={onVisibilityChanged}
            />
          ))
        ) : (
          <p className={styles.emptyState}>No exact duplicates found.</p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Related reports</h2>
        <p className={styles.sectionHint}>
          Same date and nearby location, but not identical — may be separate witnesses of the
          same event. Nothing is pre-selected; only hide a row if you&apos;ve confirmed it&apos;s
          a true duplicate.
        </p>
        {relatedGroups.length > 0 ? (
          relatedGroups.map((group) => (
            <RelatedGroup
              key={group.key}
              group={group}
              onVisibilityChanged={onVisibilityChanged}
            />
          ))
        ) : (
          <p className={styles.emptyState}>No related-report groups found.</p>
        )}
      </section>
    </div>
  );
}
