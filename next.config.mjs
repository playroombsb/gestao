/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Upload de materiais de apoio (PDF até 50 MB) passa por server action
  experimental: { serverActions: { bodySizeLimit: "50mb" } },
  // O painel só de leitura virou a página Produtos
  async redirects() {
    return [
      { source: "/painel", destination: "/produtos", permanent: false },
      { source: "/integracoes", destination: "/admin/integracoes", permanent: false },
    ];
  },
};

export default nextConfig;
