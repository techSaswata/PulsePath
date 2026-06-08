/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdfkit ships its own font binaries; mark server-only externals so they aren't bundled for the browser.
  experimental: {
    serverComponentsExternalPackages: ["pdfkit", "@qdrant/js-client-rest"],
  },
};

export default nextConfig;
