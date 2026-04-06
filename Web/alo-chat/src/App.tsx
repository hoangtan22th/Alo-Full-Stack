import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ContactLayout from '@/pages/contacts/ContactLayout';
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage';
// import ChatRoomPage from '@/pages/chat/ChatRoomPage'; // Ví dụ ông B sẽ import file của ổng ở đây

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* tuyến mặc định */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Tuyến đường 1: Trang Danh bạ anh em mình vừa làm */}
        <Route path="/contacts" element={<ContactLayout />} />

        {/* Tuyến đường 2: Trang Chat (Ông bạn B sẽ tự thêm dòng này vào) */}
        {/* <Route path="/chat" element={<ChatRoomPage />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;