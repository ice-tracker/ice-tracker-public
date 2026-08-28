"use client";
import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import styles from "./InfoButton.module.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const InfoButton = ({ pdfUrl }: { pdfUrl: string }) => {
  const [open, setOpen] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfWidth, setPdfWidth] = useState(760);
  const pdfViewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const updateWidth = () => {
      if (pdfViewerRef.current) {
        setPdfWidth(Math.min(760, pdfViewerRef.current.clientWidth));
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [open]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  return (
    <>
      <div className={styles.infoButtonWrapper}>
        <button
            className={styles.infoButton}
            onClick={() => setOpen(true)}
            aria-label="Open info PDF"
        >
            i
        </button>
        <span className={styles.tooltip}>View Data Handbook</span>
     </div>

      {open && (
        <div className={styles.modalOverlay} onClick={() => setOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <button className={styles.modalCloseButton} onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <div className={styles.modalPdfViewer} ref={pdfViewerRef}>
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(e) => console.error("PDF load error:", e)}
                onSourceError={(e) => console.error("PDF source error:", e)}
              >
                {numPages && Array.from({ length: numPages }, (_, i) => (
                  <Page key={i + 1} pageNumber={i + 1} width={pdfWidth} />
                ))}
              </Document>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InfoButton;