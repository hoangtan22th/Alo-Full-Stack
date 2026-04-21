import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalElements,
  onPageChange,
  loading = false,
}: PaginationProps) {
  if (loading || totalPages <= 1) return null;

  return (
    <div className="flex justify-between flex-wrap gap-4 items-center mt-6 p-4 bg-surface-container-lowest rounded-xl border border-[#ebeef0]">
      <span className="text-sm text-on-surface-variant font-medium">
        Showing page {currentPage + 1} of {totalPages} ({totalElements} total
        items)
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={currentPage === 0}
          onClick={() => onPageChange(Math.max(0, currentPage - 1))}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-[#ebeef0] text-on-surface hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => onPageChange(i)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                currentPage === i
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button
          disabled={currentPage >= totalPages - 1}
          onClick={() =>
            onPageChange(Math.min(totalPages - 1, currentPage + 1))
          }
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-[#ebeef0] text-on-surface hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
