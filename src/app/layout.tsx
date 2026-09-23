import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Alem Match — подбор подрядчиков", description: "До трёх подрядчиков из каталога с понятным объяснением выбора." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
