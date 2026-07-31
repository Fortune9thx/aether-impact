import type { Metadata } from "next";
import { Newsreader, Inter, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { PageTransition } from "@/components/motion/PageTransition";
import { WalletProvider } from "@/components/providers/WalletProvider";
import { ContractStatusBanner } from "@/components/ui/ContractStatusBanner";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aether Impact",
  description:
    "A GenLayer-powered retroactive impact funding evaluation engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-background text-text-primary antialiased">
        <WalletProvider>
          <ContractStatusBanner />
          <Nav />
          <main className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}
