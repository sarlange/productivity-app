import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata: Metadata = {
 title: "Productivity app",
 description: "Plan tasks around your real availability.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
 return <html lang="en"><body>{children}</body></html>;
}
