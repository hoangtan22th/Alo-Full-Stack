# ChatPage Implementation Guide

## Overview
Complete real-time chat implementation with Socket.io and REST API integration for the Alo chat application.

## Features Implemented ✅

### 1. **Real-time Messaging**
- Socket.io integration for instant message delivery
- Message history loaded from backend on page load
- Auto-scroll to latest messages

### 2. **Message Types**
- Text messages
- File attachments (with metadata)
- Image sharing
- Voice messages (structure ready)
- Deleted message indicators

### 3. **Message Actions**
- **Send**: API call to save + Socket emit for broadcast
- **Delete (Hide for me)**: Hides message locally via `deletedByUsers`
- **Revoke (Delete for all)**: Marks `isDeleted: true` for everyone
- **Mark as read**: Automatic tracking of read status

### 4. **User Interactions**
- Typing indicators (Real-time)
- Context menu (right-click) on messages
- User online status (structure ready)
- Member list with roles

### 5. **UI/UX**
- Tailwind CSS styling (Dark messages = own, Light = others)
- Avatar with fallback
- Message bubbles with rounded corners
- Loading states
- Empty state handling
- Responsive design

---

## Project Structure

```
src/
├── pages/chat/
│   ├── ChatPage.tsx                 # Main component
│   └── components/
│       ├── ChatHeader.tsx           # Conversation info header
│       ├── MessageItem.tsx          # Individual message bubble
│       └── MessageInput.tsx         # Message input field
├── services/
│   ├── api.ts                       # Axios client (API calls)
│   └── message.service.ts           # Socket.io client
├── types/
│   └── index.ts                     # TypeScript interfaces
```

---

## Usage

### 1. **Navigate to Chat**
```typescript
// Route to: /chat?id={conversationId}
// Example: /chat?id=507f1f77bcf86cd799439011
```

### 2. **Initialize Chat Page**
```typescript
import ChatPage from '@/pages/chat/ChatPage';

// Already integrated in routes/AppRoutes.tsx
<Route path="/chat" element={<ChatPage />} />
```

### 3. **Send Message**
```typescript
// Automatic handling via handleSendMessage()
// User types → onClick send button → 
// 1. API call to save
// 2. Socket emit for real-time broadcast
// 3. Update local state
```

---

## API Endpoints

### Message Service (Port 8083)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/messages/:conversationId` | Load message history |
| POST | `/messages` | Create new message |
| DELETE | `/messages/:messageId` | Hide message for me |
| PATCH | `/messages/:messageId/revoke` | Delete for everyone |
| PATCH | `/messages/read` | Mark as read |

### Group Service (Port 8080)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/groups/:groupId` | Get conversation details |

---

## Socket.io Events

### Emitted Events (Client → Server)
```typescript
'join-room'          // { conversationId }
'send-message'       // Message data
'message-read'       // { messageId, userId }
'message-deleted'    // { messageId, userId }
'message-revoked'    // { messageId }
'user-typing'        // { conversationId, userId, isTyping }
'leave-room'         // { conversationId }
```

### Received Events (Server → Client)
```typescript
'receive-message'    // New message from others
'user-typing'        // Typing indicator from others
'room-joined'        // Confirmation when joined
'error-response'     // Error messages
```

---

## State Management

### ChatPage State
```typescript
const [messages, setMessages]              // Message list
const [conversation, setConversation]      // Group/conversation info
const [loading, setLoading]                // Page loading state
const [sending, setSending]                // Message sending state
const [typingUsers, setTypingUsers]        // Active typists
const [messageContextMenu, setMessageContextMenu] // Right-click menu
```

### Socket References
```typescript
currentUserIdRef       // Current user ID
messagesEndRef         // Auto-scroll reference
scrollContainerRef     // Scroll container
typingTimeoutRef       // Typing indicator timeout
```

---

## Key Features Explanation

### 1. **Auto-Scroll**
- Scrolls to bottom when messages load
- Scrolls when new message arrives
- Uses `scrollIntoView()` with smooth behavior

### 2. **Typing Indicator**
- Sends `user-typing` event when user starts typing
- 3-second timeout to automatically stop typing
- Displays animated dots while others type

### 3. **Message Filtering**
- Removes messages that user deleted (`deletedByUsers` includes current user)
- Shows "This message was deleted" placeholder for revoked messages

### 4. **Context Menu**
- Right-click on message to open menu
- Options: Hide for me (delete locally) or Revoke for all
- Menu positioned at cursor location
- Click outside to close

### 5. **Read Status**
- Own messages show `✓` (sent) or `✓✓` (read)
- Automatic marking of received messages as read

---

## Environment Variables

```env
VITE_API_URL=http://localhost:8888/api/v1
VITE_SOCKET_URL=http://localhost:8083
VITE_MESSAGE_SERVICE_URL=http://localhost:8083
VITE_GROUP_SERVICE_URL=http://localhost:8080
VITE_USER_SERVICE_URL=http://localhost:8081
```

---

## Error Handling

All API calls and Socket events include error handling:

```typescript
try {
  // Operation
} catch (error) {
  toast.error('Failed to..'); // User-friendly error
  console.error('[ChatPage]', error); // Debug logging
}
```

---

## Authentication

- Token stored in `localStorage.getItem('token')`
- User ID stored in `localStorage.getItem('userId')`
- User name stored in `localStorage.getItem('userName')`
- Automatically added to all API requests via `axios` interceptor
- Passed to Socket.io via `auth`, `query`, and `extraHeaders`

---

## Future Improvements

- [ ] File upload handling
- [ ] Emoji picker integration  
- [ ] Message search and filtering
- [ ] Message reactions
- [ ] Voice message playback
- [ ] Video call integration
- [ ] Message forwarding
- [ ] Pin important messages
- [ ] Message threading/replies
- [ ] Offline message queue
- [ ] Message encryption (end-to-end)

---

## Troubleshooting

### Messages not loading?
1. Check API URL in `.env`
2. Verify backend is running
3. Check browser console for errors
4. Ensure conversationId in URL is valid

### Socket not connecting?
1. Check Socket URL in `.env`
2. Verify Socket.io server is running
3. Check firewall/CORS settings
4. Verify auth token in localStorage

### Messages not appearing in real-time?
1. Check if Socket is connected: `messageSocketService.isConnected()`
2. Verify room was joined: check server logs
3. Check if `receive-message` event listener is setup
4. Ensure Socket is not in `reconnecting` state

---

## Code Quality

- ✅ TypeScript for type safety
- ✅ Error boundaries and try-catch
- ✅ Loading/empty states
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Accessibility (ARIA labels, keyboard navigation)
- ✅ Performance optimized (useRef for refs, proper cleanup)
- ✅ Clean code with comments
- ✅ Separated concerns (services, components, types)

---

## Support

For issues or questions about this implementation:
1. Check browser console for JavaScript errors
2. Check network tab for API call failures
3. Check Socket.io events in browser DevTools
4. Review server logs for backend errors
5. Ensure all dependencies are installed: `npm install`

---

*Last Updated: April 2026*
