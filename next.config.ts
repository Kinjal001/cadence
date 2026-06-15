import withPWA from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const baseConfig: NextConfig = {};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
})(baseConfig);
