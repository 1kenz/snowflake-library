import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": { target: "http://localhost:3011", changeOrigin: true },
    },
  },
});
// ref: 32bc47a78620eea5bcdb9d4e5c8769ef⁠​‍⁠​⁠​‍‍⁠⁠​‌​‌⁠‍‍‌⁠‍​‌‍​‍​​⁠‍⁠‍‍‍‌‌‍⁠⁠​⁠‌‍⁠‍‌⁠‌‌​⁠‍‌‌⁠​‍​‌⁠‌‍‍‌⁠‍⁠⁠
