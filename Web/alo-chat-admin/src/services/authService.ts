export const authService = {
  login: async (email: string, password: string) => {
    const baseUrl =
      process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8888";

    const res = await fetch(`${baseUrl}/api/v1/admin/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.data?.accessToken) {
      throw new Error(
        data.message ||
          data.error ||
          "Invalid credentials or unauthorized role",
      );
    }

    return data.data.accessToken;
  },
  logout: async () => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8888";

      // Lấy admin_token (accessToken) hiện tại để đính kèm vào Header
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift();
        return null;
      };

      const token = getCookie("admin_token");

      if (token) {
        // Gọi API Đăng xuất của hệ thống (nằm ở user AuthController do chung hàm logic huỷ RefreshToken)
        await fetch(`${baseUrl}/api/v1/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          // Gửi HttpOnly cookie refreshToken lên server để blacklist
          credentials: "include",
        });
      }
    } catch (error) {
      console.error("Backend logout failed:", error);
    } finally {
      // Vẫn phải đảm bảo dọn dẹp Cookie ở Frontend
      document.cookie = "admin_token=; Max-Age=0; path=/;";
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  },
};
