import './globals.css';
import { OWNER, ADDRESS, GYM_NAME } from '@/lib/config';

export const metadata = {
  title: GYM_NAME + ' — gym sign-in',
  description: 'Sign in and out of the gym. Never train alone.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'S&S Gym' },
  icons: { apple: '/apple-touch-icon.png' },
};

export const viewport = {
  themeColor: '#08090a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="wrap">
          <header className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt={GYM_NAME} />
            <p className="owner">Gym space provided by {OWNER}<br />{ADDRESS}</p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
