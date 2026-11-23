"use client";
// "Download PDF": opens the browser's print dialog (choose "Save as PDF"). Every folded section is
// opened first so nothing is missing from the PDF, and the print styles in globals.css hide the
// menus and buttons and switch to white paper.
export default function PrintButton({ label = "Download PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        document.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
        window.print();
      }}
      className="btn btn-ghost h-11 px-4 text-sm"
    >
      {label}
    </button>
  );
}
