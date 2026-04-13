import { Routes, Route, Navigate } from "react-router-dom";
import ContactLayout from "@/pages/contacts/ContactLayout";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import FriendRequestPage from "@/pages/contacts/FriendRequestPage";
import FriendListPage from "@/pages/contacts/FriendListPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute"; // Import hàng rào mới
import GroupListPage from "@/pages/contacts/GroupListPage";
import ChatPage from "@/pages/chat/ChatPage";

// IMPORT THÊM SIDEBAR ĐỂ GẮN VÀO TRANG CHAT
import Sidebar from "@/components/ui/Sidebar"; // Chú ý kiểm tra lại đường dẫn này cho đúng với máy ông nhé
import GroupInvitePage from "@/pages/contacts/GroupInvitePage";
import FriendSentRequestPage from "@/pages/contacts/FriendSentRequestPage";

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
        {/* KHU VỰC DANH BẠ */}
        <Route path="/contacts" element={<ContactLayout />}>
          <Route index element={<Navigate to="friends" replace />} />
          <Route path="friends" element={<FriendListPage />} />
          <Route path="requests" element={<FriendRequestPage />} />
          <Route path="sent-requests" element={<FriendSentRequestPage />} />
          <Route path="groups" element={<GroupListPage />} />
          <Route path="group-invites" element={<GroupInvitePage />} />
        </Route>

        {/* KHU VỰC CHAT (Đã được đưa ra ngoài, ngang hàng với contacts) */}
        <Route
          path="/chat"
          element={
            <div className="flex h-screen w-full overflow-hidden bg-white">
              <Sidebar /> {/* Gắn thanh menu vào bên trái */}
              <ChatPage />
            </div>
          }
        />
        <Route
          path="/chat/:conversationId"
          element={
            <div className="flex h-screen w-full overflow-hidden bg-white">
              <Sidebar />
              <ChatPage />
            </div>
          }
        />
      </Route>

      {/* Catch-all: Nếu gõ bậy bạ thì đá về login hoặc trang chủ tùy trạng thái */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
