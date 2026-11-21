import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mesa de Ayuda · Sistema de tickets",
    template: "%s · Mesa de Ayuda",
  },
  description:
    "Sistema de tickets para gestionar incidencias y solicitudes de soporte: dashboard, prioridades, asignaciones y conversaciones.",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
