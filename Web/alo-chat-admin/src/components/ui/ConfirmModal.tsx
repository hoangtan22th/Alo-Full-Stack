"use client";

import { useConfirmStore } from "@/store/useConfirmStore";
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

export function ConfirmModal() {
  const { isOpen, options, close } = useConfirmStore();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !options) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await options.onConfirm();
      close();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDestructive = options.destructive !== false; // Default is true if unspecified

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-300">
      <div className="bg-surface-container-lowest rounded-xl shadow-2xl w-full max-w-sm p-6 border border-[#ebeef0] transform transition-all animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`p-3 rounded-full shrink-0 ${isDestructive ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}
          >
            {isDestructive ? (
              <ExclamationTriangleIcon className="w-6 h-6" />
            ) : (
              <ExclamationCircleIcon className="w-6 h-6" />
            )}
          </div>
          <div className="mt-1.5 flex-1">
            <h2 className="text-xl font-bold text-on-surface leading-none mb-2">
              {options.title}
            </h2>
            <p className="text-on-surface-variant text-sm whitespace-pre-wrap">
              {options.message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={close}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface rounded-lg transition-colors disabled:opacity-50"
          >
            {options.cancelText || "Hủy"}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-white shadow-sm flex items-center justify-center min-w-[100px] ${
              isDestructive ? "bg-red-600" : "bg-primary"
            }`}
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              options.confirmText || "Xác nhận"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
