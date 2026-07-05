/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Turn off strict mode to avoid double mounting sockets during dev
  images: {
    unoptimized: true
  }
};

export default nextConfig;
