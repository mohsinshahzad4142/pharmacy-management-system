import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Development mein disable rakhein taake testing asaan ho
});

const nextConfig: NextConfig = {
  // Agar aapke paas pehle se koi aur config options hain toh woh yahan aayenge
};

export default withPWA(nextConfig);