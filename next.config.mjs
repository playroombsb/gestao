/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // O painel só de leitura virou a página Produtos
  async redirects() {
    return [{ source: "/painel", destination: "/produtos", permanent: false }];
  },
};

export default nextConfig;
