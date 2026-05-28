import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  content: string;
}

export default function TxtFileViewerModal({ isOpen, onClose, fileName, content }: Props) {
  const [wordWrap, setWordWrap] = useState(true);

  if (!isOpen) return null;

  // Split lines to generate line numbers
  const lines = content.split("\n");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[85vh] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Text File Viewer</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
            title="Đóng"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
          
          {/* Filename Readonly Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tên file
            </label>
            <input
              type="text"
              readOnly
              value={fileName}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none select-all"
            />
          </div>

          {/* Content Area */}
          <div className="flex flex-col gap-1.5 flex-1 min-h-0">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Nội dung
            </label>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-gray-50 text-sm font-mono flex-1 min-h-0">
              
              {/* Line Numbers column */}
              <div className="py-3 px-3 text-right bg-gray-100 border-r border-gray-200 text-gray-400 select-none text-[13px] leading-6 shrink-0 min-w-[3rem]">
                {lines.map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>

              {/* Text content column */}
              <div 
                className={`py-3 px-4 text-gray-700 flex-1 overflow-auto text-[13px] leading-6
                  ${wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre overflow-x-auto"}
                `}
              >
                {content || <span className="italic text-gray-400">Tệp trống</span>}
              </div>

            </div>
          </div>

          {/* Word Wrap Checkbox */}
          <div className="flex items-center gap-2 select-none">
            <input
              type="checkbox"
              id="wordwrap-toggle"
              checked={wordWrap}
              onChange={(e) => setWordWrap(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <label 
              htmlFor="wordwrap-toggle" 
              className="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800 transition"
            >
              Ngắt dòng
            </label>
          </div>

        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400 rounded-lg text-sm font-semibold transition"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
