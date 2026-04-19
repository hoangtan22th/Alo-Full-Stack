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
};
