"use client";

import { useEffect, useState, useRef } from "react";

export default function SingleTabGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLocked, setIsLocked] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabId = useRef(Math.random().toString(36).substring(7));

  useEffect(() => {
    // Chỉ chạy trên client
    if (typeof window === "undefined") return;

    channelRef.current = new BroadcastChannel("alo_chat_single_tab");
    const channel = channelRef.current;

    channel.onmessage = (event) => {
      if (
        event.data.type === "CLAIM_ACTIVE" &&
        event.data.tabId !== tabId.current
      ) {
        // Một tab khác vừa nhận làm active => khóa tab này lại
        setIsLocked(true);
      }
    };

    // Khi tab này tải lên, tự động giành quyền active
    const claimActive = () => {
      setIsLocked(false);
      channel.postMessage({ type: "CLAIM_ACTIVE", tabId: tabId.current });
    };

    claimActive();

    return () => {
      channel.close();
    };
  }, []);

  const handleActivate = () => {
    setIsLocked(false);
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: "CLAIM_ACTIVE",
        tabId: tabId.current,
      });
    }
  };

  return (
    <>
      {isLocked && (
        <div className="fixed inset-0 z-[99999] bg-gray-100 flex items-center justify-center">
          <div className="bg-white border border-gray-300 shadow-xl rounded-md p-6 max-w-[450px] w-full text-left">
            <h2 className="text-[17px] font-semibold text-gray-800 pb-4 border-b border-gray-200">
              Bạn đang mở Alo Chat trên một Tab khác hoặc không sử dụng quá lâu
            </h2>
            <p className="text-[15px] text-gray-700 mt-5 mb-6">
              Nhấn kích hoạt để sử dụng trên Tab này
            </p>
            <div className="flex justify-end">
              <button
                onClick={handleActivate}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded text-[15px] transition-colors"
              >
                Kích hoạt
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
