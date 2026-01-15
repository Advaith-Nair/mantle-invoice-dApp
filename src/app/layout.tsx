import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css'; 
import { Providers } from './providers'; // <--- MUST BE IMPORTED

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mantle Invoice",
  description: "Hackathon DApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>  {/* <--- THIS TAG MUST WRAP {children} */}
          {children}
        </Providers>
      </body>
    </html>
  );
}    