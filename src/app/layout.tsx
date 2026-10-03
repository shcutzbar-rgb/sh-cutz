import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import { MobileBookCta } from "@/components/MobileBookCta";
import { Navbar } from "@/components/Navbar";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	metadataBase: new URL(siteConfig.url),
	title: {
		default: `${siteConfig.name} – Barbershop på Södermalm`,
		template: `%s | ${siteConfig.name}`,
	},
	description: siteConfig.description,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="sv">
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
			>
				<a
					href="#main"
					className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-black"
				>
					Hoppa till innehåll
				</a>
				<Navbar />
				<main id="main" className="flex-1">
					{children}
				</main>
				<Footer />
				<MobileBookCta />
			</body>
		</html>
	);
}
