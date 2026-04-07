import { Routes, Route, Navigate } from "react-router-dom";
import ContactLayout from "@/pages/contacts/ContactLayout";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import FriendRequestPage from "@/pages/contacts/FriendRequestPage";
import FriendListPage from "@/pages/contacts/FriendListPage";
import ProtectedRoute from "./ProtectedRoute"; // Import anh bảo vệ vào

export default function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC ROUTES (Ai cũng vào được) */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* PRIVATE ROUTES (Phải có Token mới cho vào) */}
      <Route element={<ProtectedRoute />}>
        {/* Đưa toàn bộ cụm danh bạ vào đây */}
        <Route path="/contacts" element={<ContactLayout />}>
          <Route index element={<Navigate to="friends" replace />} />
          <Route path="friends" element={<FriendListPage />} />
          <Route path="requests" element={<FriendRequestPage />} />
        </Route>

        {/* Sau này ông có làm trang /messages hay /profile thì cứ nhét tiếp vào trong khối này */}
      </Route>
    </Routes>
  );
}
