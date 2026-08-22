import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { NotifyProvider } from "@/components/notify-provider";
import { RegisterServiceWorker } from "@/components/register-sw";
import { ThemeProvider } from "@/components/theme-provider";
import { WalletProvider } from "@/components/wallet-provider";
import { Web3Provider } from "@/components/web3-provider";
import "./globals.css";

const THEME_BOOT = `(function(){try{var t=localStorage.getItem("walinox.theme");if(t!=="light"&&t!=="dark")t="dark";var r=document.documentElement;r.classList.remove("light","dark");r.classList.add(t);r.style.colorScheme=t;}catch(e){document.documentElement.classList.add("dark");}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Walinox",
  title: {
    default: "Walinox",
    template: "%s · Walinox",
  },
  description: "Billetera USDT: saldo, enviar y recibir. Online o sin internet.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Walinox",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e7f3f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1014" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`dark ${geistSans.variable} ${geistMono.variable} h-dvh overflow-hidden antialiased`}
    >
      <body className="h-dvh overflow-hidden bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <RegisterServiceWorker />
        <ThemeProvider>
          <Web3Provider>
            <WalletProvider>
              <NotifyProvider>
                <AppShell>{children}</AppShell>
              </NotifyProvider>
            </WalletProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
