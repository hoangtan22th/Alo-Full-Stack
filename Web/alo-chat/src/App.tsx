import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ContactLayout from '@/pages/contacts/ContactLayout';
// import ChatRoomPage from '@/pages/chat/ChatRoomPage'; // Ví dụ ông B sẽ import file của ổng ở đây

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Đường dẫn mặc định (Khi vào web, tự động chuyển sang trang danh bạ) */}
        <Route path="/" element={<Navigate to="/contacts" replace />} />

        {/* Tuyến đường 1: Trang Danh bạ anh em mình vừa làm */}
        <Route path="/contacts" element={<ContactLayout />} />

        {/* Tuyến đường 2: Trang Chat (Ông bạn B sẽ tự thêm dòng này vào) */}
        {/* <Route path="/chat" element={<ChatRoomPage />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;