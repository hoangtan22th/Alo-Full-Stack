import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ContactLayout from '@/pages/contacts/ContactLayout';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import FriendRequestPage from '@/pages/contacts/FriendRequestPage';
import FriendListPage from '@/pages/contacts/FriendListPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Tuyến đường Danh bạ: Bọc Layout ở ngoài, các trang con bên trong */}
        <Route path="/contacts" element={<ContactLayout />}>
          {/* Mặc định gõ /contacts sẽ tự động nhảy vào /contacts/friends */}
          <Route index element={<Navigate to="friends" replace />} />
          
          {/* URL: /contacts/friends */}
          <Route path="friends" element={<FriendListPage />} />
          
          {/* URL: /contacts/requests */}
          <Route path="requests" element={<FriendRequestPage />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;