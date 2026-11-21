import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La base de datos SQLite se inicializa en tiempo de ejecución.
  // Mantenemos los módulos nativos de Node fuera del bundle del cliente.
  serverExternalPackages: [],
};

export default nextConfig;
