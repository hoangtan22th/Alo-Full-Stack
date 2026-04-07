// src/App.tsx
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import AppRoutes from "@/routes/AppRoutes";

function App() {
  return (
    <BrowserRouter>
      {/* Toaster đặt ở mức cao nhất để luôn hiển thị thông báo */}
      <Toaster position="top-right" richColors closeButton />

      {/* Nạp toàn bộ Route vào đây */}
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
