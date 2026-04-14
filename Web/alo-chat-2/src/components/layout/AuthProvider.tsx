"use client";
import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useRouter, usePathname } from "next/navigation";

import Swal from "sweetalert2";

import { socketService } from "../../services/socketService";
import { SocketManager } from "./SocketManager";

// Các route cho phép xem khi chưa đăng nhập
const publicRoutes = ["/login", "/register"];

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // 1. Xử lý event logout toàn cục (ví dụ từ axios interceptor)
  useEffect(() => {
    const handleForceLogout = () => {
      // Ngăn chặn hiển thị đè đúp Swal nếu đã có một cái đang mở
      if (document.body.classList.contains("swal2-shown")) {
         return;
      }

      // 1. Chỉ ngắt kết nối socket để ko gửi/nhận thêm tin nhắn (treo UI lại)
      socketService.disconnect();
      
      // 2. Hiển thị Swal bằng static import và đợi user xác nhận
      Swal.fire({
        icon: 'warning',
        title: 'Đã ngắt kết nối',
        text: 'Tài khoản của bạn đã bị đăng nhập ở một thiết bị khác. Vui lòng đăng nhập lại.',
        confirmButtonColor: '#000',
        allowOutsideClick: false, // Bắt buộc user phải bấm OK
        allowEscapeKey: false,
      }).then((result) => {
        // Chỉ logout khi người dùng thực sự bấm nút OK (Confirm)
        if (result.isConfirmed) {
          // 3. Gọi logout để huỷ state + chuyển trang TỰ NGUYỆN
          logout();
          router.push("/login"); // Push login sau khi logout
        }
      });
    };

    window.addEventListener("force_logout", handleForceLogout);
    return () => window.removeEventListener("force_logout", handleForceLogout);
  }, [logout, router]);

  // 2. Kích hoạt mounted để bắt đầu logic bảo vệ routes (SSR -> Client)
  useEffect(() => {
    setMounted(true);
  }, []);

  // 3. Logic bảo vệ route (Private/Public) & Quản lý Socket Toàn Cục
  useEffect(() => {
    if (!mounted) return;

    const token = localStorage.getItem("accessToken");
    const isAuth = isAuthenticated || !!token;

    // Quản lý Socket
    if (isAuth) {
      if (!socketService.connected) {
        socketService.connect();
      }
    } else {
      socketService.disconnect();
    }

    // Kiểm tra xem route hiện tại có phải là route public hay không
    const isPublicRoute = publicRoutes.some((route) =>
      pathname?.startsWith(route),
    );

    // TH1: Cố tình truy cập Private Route khi chưa đăng nhập
    if (!isAuth && !isPublicRoute) {
      router.push("/login");
    }
    // TH2: Đã đăng nhập nhưng cố vào lại Public Route (login, register)
    else if (isAuth && isPublicRoute) {
      router.replace("/chat");
    }
  }, [pathname, isAuthenticated, mounted, router]);

  // Tránh Hydration Mismatch
  if (!mounted) return null;

  // Render Blocking: Chặn màn hình nhấp nháy UI nếu điều kiện bắt buộc redirect đang xảy ra
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const isAuth = isAuthenticated || !!token;
  const isPublicRoute = publicRoutes.some((route) =>
    pathname?.startsWith(route),
  );

  if (!isAuth && !isPublicRoute) return null; // Đang bị redirect về /login
  if (isAuth && isPublicRoute) return null; // Đang bị redirect về /

  return <><SocketManager />{children}</>;
}

