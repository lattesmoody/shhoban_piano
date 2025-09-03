import type { Metadata } from "next";

// The 'next/font' and './globals.css' imports were removed to resolve
// compilation errors in environments that don't fully support the Next.js build process.
// Tailwind CSS and the Inter font are now loaded via a CDN in the <head> below.

export const metadata: Metadata = {
  title: "호반피아노학원", // 페이지 제목
  description: "연습실 및 학습 현황 관리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The <html> and <body> tags have been restored to comply with Next.js root layout requirements.
    // Scripts and links have been moved into the <head> tag, which is their standard location.
    <html lang="ko">
      <head>
        {/* The "async" attribute allows the script to load without blocking page rendering. */}
        <script src="https://cdn.tailwindcss.com" async></script>
        
        {/* Google Font (Inter) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* The "precedence" attribute helps Next.js determine the loading order for external stylesheets. */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" precedence="default" />
        {/* The "precedence" and "href" attributes allow Next.js to correctly hoist and deduplicate inline styles. */}
        <style precedence="default" href="#custom-global-styles">{`
          /* Custom base styles */
          body {
            font-family: 'Inter', sans-serif;
            background-color: #f0f2f5;
          }
        `}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}

