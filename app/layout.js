import "./globals.css";
import { getAppUrl } from "@/lib/site";

export const metadata = {
  metadataBase: new URL(getAppUrl()),
  title: "OpenBridge",
  description: "Smart links that reduce friction inside in-app browsers.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
