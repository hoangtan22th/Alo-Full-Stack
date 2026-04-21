"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PhoneIcon, VideoCameraIcon } from "@heroicons/react/24/outline";

interface Props {
  incomingCall: {
    roomId: string;
    caller: {
      id: string;
      name: string;
      avatar?: string;
    };
    isVideo: boolean;
    isGroup?: boolean;
  };
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({ incomingCall, onAccept, onDecline }: Props) {
  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white/90 backdrop-blur-xl rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-8 relative border border-white/20"
      >
        {/* Background Avatar Blur */}
        {incomingCall.caller?.avatar && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <img 
              src={incomingCall.caller.avatar} 
              className="w-full h-full object-cover blur-[40px] opacity-20 scale-125" 
              alt="" 
            />
          </div>
        )}
        
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50/50 to-transparent"></div>
        
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
          {incomingCall.caller?.avatar ? (
            <img 
              src={incomingCall.caller.avatar} 
              alt="Avatar" 
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg relative z-10" 
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg relative z-10">
              {(incomingCall.caller?.name || "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h3 className="text-xl font-black text-gray-900 mb-1 z-10">
          {incomingCall.caller?.name || "Ai đó"}
        </h3>
        <p className="text-blue-600 font-bold text-sm animate-pulse z-10 mb-8">
          Đang gọi {incomingCall.isVideo ? "Video" : "Thoại"} {incomingCall.isGroup ? "nhóm" : ""} cho bạn...
        </p>

        <div className="flex items-center gap-12 z-10">
          <button 
            onClick={onDecline}
            className="flex flex-col items-center gap-3 group"
          >
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-200 group-hover:bg-red-600 group-active:scale-90 transition-all">
              <XMarkIcon className="w-8 h-8" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-gray-500">Từ chối</span>
          </button>

          <button 
            onClick={onAccept}
            className="flex flex-col items-center gap-3 group"
          >
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-200 group-hover:bg-green-600 group-active:scale-90 transition-all animate-bounce">
              {incomingCall.isVideo ? <VideoCameraIcon className="w-8 h-8"/> : <PhoneIcon className="w-8 h-8"/>}
            </div>
            <span className="text-xs font-bold text-gray-500">Trả lời</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
