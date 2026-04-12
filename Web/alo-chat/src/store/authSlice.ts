import { createSlice, type PayloadAction } from "@reduxjs/toolkit"; // ✅ Thêm chữ 'type' vào đây

// Định nghĩa interface y chang cũ
interface User {
  id: string;
  fullName: string;
  avatar: string;
  email: string;
  phoneNumber: string;
  gender: number;
}

interface AuthState {
  token: string | null;
  userId: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  token: null,
  userId: null,
  user: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Tương đương setAuth bên Zustand
    setAuth: (
      state,
      action: PayloadAction<{ token: string; userId: string }>,
    ) => {
      state.token = action.payload.token;
      state.userId = action.payload.userId;
      state.isAuthenticated = true;
    },
    // Tương đương setUser
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    // Đăng xuất sạch sẽ
    logout: (state) => {
      state.token = null;
      state.userId = null;
      state.user = null;
      state.isAuthenticated = false;
      // Dọn rác thủ công cho chắc ăn
      localStorage.removeItem("persist:root");
      localStorage.clear();
      sessionStorage.clear();
    },
  },
});

export const { setAuth, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
