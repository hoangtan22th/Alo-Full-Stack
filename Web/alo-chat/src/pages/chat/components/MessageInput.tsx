// src/pages/chat/components/MessageInput.tsx
import { useRef, useState } from 'react';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline';

interface MessageInputProps {
  onSendMessage: (content: string, type?: 'text' | 'file' | 'image' | 'voice') => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
}

export default function MessageInput({
  onSendMessage,
  onTyping,
  disabled = false,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    // Emit typing indicator
    if (!isTyping && onTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (onTyping) {
        onTyping(false);
      }
    }, 3000);
  };

  /**
   * Handle sending message
   */
  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message, 'text');
      setMessage('');
      setIsTyping(false);

      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (onTyping) {
        onTyping(false);
      }

      // Refocus input
      inputRef.current?.focus();
    }
  };

  /**
   * Handle key press (Enter to send)
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Handle file attachment
   */
  const handleFileAttach = () => {
    // TODO: Implement file upload
    console.log('File attachment clicked');
  };

  /**
   * Handle emoji picker
   */
  const handleEmojiPicker = () => {
    // TODO: Implement emoji picker
    console.log('Emoji picker clicked');
  };

  return (
    <div className="p-4 bg-white shrink-0 border-t border-gray-100">
      <div className="flex items-center gap-3 bg-[#F5F5F5] p-2 rounded-full border border-transparent focus-within:border-gray-200 focus-within:bg-white transition-all">
        {/* Attachment button */}
        <button
          onClick={handleFileAttach}
          disabled={disabled}
          className="p-2 text-gray-400 hover:text-black transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Attach file"
        >
          <PaperClipIcon className="w-5 h-5" />
        </button>

        {/* Message input */}
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium placeholder:text-gray-400 disabled:opacity-50"
        />

        {/* Emoji button */}
        <button
          onClick={handleEmojiPicker}
          disabled={disabled}
          className="p-2 text-gray-400 hover:text-black transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add emoji"
        >
          <FaceSmileIcon className="w-5 h-5" />
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
        >
          <PaperAirplaneIcon className="w-4 h-4 -mr-0.5" />
        </button>
      </div>

      {/* Character count (optional) */}
      {message.length > 0 && message.length > 500 && (
        <p className="text-[11px] font-bold text-orange-500 mt-2 ml-2">
          {message.length}/1000
        </p>
      )}
    </div>
  );
}
