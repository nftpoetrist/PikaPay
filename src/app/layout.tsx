import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import { EmbeddedWalletProvider } from "@/contexts/EmbeddedWalletContext";
import { SessionWalletProvider } from "@/contexts/SessionWalletContext";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PikaPay — Micro-payment tools on Arc",
  description: "Pay tiny amounts of USDC to access premium text and dev utilities, powered by Arc Testnet.",
  keywords: ["micropayments", "USDC", "Arc", "tools", "utilities", "web3"],
};

export const viewport: Viewport = {
  themeColor: "#07070f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <EmbeddedWalletProvider>
          <WalletProvider>
            <SessionWalletProvider>
              <Navbar />
              <main className="flex-1 pt-16">{children}</main>
            </SessionWalletProvider>
          </WalletProvider>
        </EmbeddedWalletProvider>
      </body>
    </html>
  );
}
