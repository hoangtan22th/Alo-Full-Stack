// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // Thêm dòng này

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Ánh xạ '@' vào thư mục 'src'
    },
  },
  server: {
    // Cho phép tất cả các host để tunnel chạy mượt
    allowedHosts: true,
    // Hoặc nếu bản Vite cũ hơn thì dùng:
    // allowedHosts: 'all',
    host: true, // Để Vite lắng nghe trên 0.0.0.0 thay vì chỉ 127.0.0.1
    port: 5173,
  },
});
