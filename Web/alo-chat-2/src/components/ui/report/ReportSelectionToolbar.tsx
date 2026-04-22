"use client";
import React from "react";
import { useChatStore } from "@/store/useChatStore";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Floating toolbar shown when the user is in message-selection mode.
 * When the user clicks "Continue", it calls `exitCustomizeMode()` which
 * re-opens the `ReportModal` (rendered by the parent page via store state).
 */
export default function ReportSelectionToolbar() {
  const {
    isReportSelectionMode,
    selectedMessagesForReport,
    clearReportSelection,
    exitCustomizeMode,
  } = useChatStore(
    useShallow((s) => ({
      isReportSelectionMode: s.isReportSelectionMode,
      selectedMessagesForReport: s.selectedMessagesForReport,
      clearReportSelection: s.clearReportSelection,
      exitCustomizeMode: s.exitCustomizeMode,
    }))
  );

  const count = selectedMessagesForReport.length;
  const isInvalid = count < 3 || count > 40;

  if (!isReportSelectionMode) return null;

  return (
    <div className="fixed left-0 right-0 bottom-20 z-50 flex justify-center pointer-events-none">
      <div className="max-w-3xl w-full px-4 pointer-events-auto">
        <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-neutral-800 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Đã chọn{" "}
            <span className={`font-bold ${isInvalid && count > 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}>
              {count}
            </span>{" "}
            tin nhắn làm bằng chứng
            {isInvalid && count > 0 && (
              <span className="ml-1 text-red-500 text-xs">(cần 3–40)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearReportSelection()}
              className="text-sm text-gray-500"
            >
              Hủy
            </Button>

            <Button
              size="sm"
              onClick={() => {
                if (isInvalid) {
                  toast.error("Vui lòng chọn từ 3 đến 40 tin nhắn làm bằng chứng.");
                  return;
                }
                exitCustomizeMode();
              }}
              disabled={isInvalid}
            >
              Tiếp tục
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
