import "./[lang]/globals.css";

import type { Metadata } from "next";
import { Toaster } from "sonner";

import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "FrontEnd APP",
  description: "Descrição do App",
  keywords: [],
  authors: [{ name: "FrontEnd", url: "http://localhost:3000" }],
  creator: "",
  publisher: "",
  openGraph: {
    title: "FrontEnd APP",
    description: "Descrição do APP",
    url: "",
    siteName: "FrontEnd APP",
    images: [
      {
        url: "http://localhost:3000",
        width: 1200,
        height: 630,
        alt: "Logo APP",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  metadataBase: new URL("http://localhost:3000"),
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster richColors />
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
