'use client';

import './globals.css';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import Script from 'next/script';
import { useEffect } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Telegram WebApp
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
  }, []);

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <title>Static Shop</title>
      </head>
      <body className="bg-black text-white min-h-dvh">
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <TonConnectUIProvider
          manifestUrl="https://tma-project-ten.vercel.app/tonconnect-manifest.json"
        >
          {children}
        </TonConnectUIProvider>
      </body>
    </html>
  );
}
