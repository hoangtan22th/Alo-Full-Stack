"use client";
import React from "react";
import ReportModal from "@/components/ui/report/ReportModal";
import { useChatStore } from "@/store/useChatStore";
import { useShallow } from "zustand/react/shallow";

/**
 * Reads modal state from useChatStore and renders the ReportModal globally.
 * This is needed because the modal is triggered from ChatInfoPanel but
 * must survive outside the panel's render tree for the full customize flow.
 */
export default function StoreReportModal() {
  const {
    isReportModalOpen,
    reportTargetId,
    reportTargetName,
    selectedMessagesForReport,
    isCustomizeMode,
    closeReportModal,
    enterCustomizeMode,
    clearReportSelection,
  } = useChatStore(
    useShallow((s) => ({
      isReportModalOpen: s.isReportModalOpen,
      reportTargetId: s.reportTargetId,
      reportTargetName: s.reportTargetName,
      selectedMessagesForReport: s.selectedMessagesForReport,
      isCustomizeMode: s.isCustomizeMode,
      closeReportModal: s.closeReportModal,
      enterCustomizeMode: s.enterCustomizeMode,
      clearReportSelection: s.clearReportSelection,
    }))
  );

  if (!isReportModalOpen || !reportTargetId) return null;

  return (
    <ReportModal
      isOpen={isReportModalOpen}
      onClose={closeReportModal}
      targetId={reportTargetId}
      targetType="USER"
      targetName={reportTargetName ?? undefined}
      selectedMessageIds={selectedMessagesForReport}
      isCustomizeMode={isCustomizeMode}
      onCustomizeEvidence={enterCustomizeMode}
      onSuccess={() => {
        clearReportSelection();
      }}
    />
  );
}
