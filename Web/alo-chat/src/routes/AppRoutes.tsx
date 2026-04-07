import { Routes, Route, Navigate } from "react-router-dom";
import ContactLayout from "@/pages/contacts/ContactLayout";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import FriendRequestPage from "@/pages/contacts/FriendRequestPage";
import FriendListPage from "@/pages/contacts/FriendListPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute"; // Import hàng rào mới
import GroupListPage from "@/pages/contacts/GroupListPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* LỚP BẢO VỆ 1: Chỉ dành cho khách (Chưa có token) */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* LỚP BẢO VỆ 2: Chỉ dành cho hội viên (Đã có token) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/contacts" element={<ContactLayout />}>
          <Route index element={<Navigate to="friends" replace />} />
          <Route path="friends" element={<FriendListPage />} />
          <Route path="requests" element={<FriendRequestPage />} />
          <Route path="groups" element={<GroupListPage />} />
        </Route>
      </Route>

      {/* Catch-all: Nếu gõ bậy bạ thì đá về login hoặc trang chủ tùy trạng thái */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
