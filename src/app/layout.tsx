import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import { Footer } from "@/components/Footer";
import { HidePublicChrome } from "@/components/HidePublicChrome";
import { MobileBookCta } from "@/components/MobileBookCta";
import { Navbar } from "@/components/Navbar";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	display: "swap",
});

const oswald = Oswald({
	variable: "--font-oswald",
	subsets: ["latin"],
	display: "swap",
});

export const metadata: Metadata = {
	metadataBase: new URL(siteConfig.url),
	title: {
		default: `${siteConfig.name} – Barbershop på Södermalm`,
		template: `%s | ${siteConfig.name}`,
	},
	description: siteConfig.description,
	icons: { icon: { url: "/favicon.png", type: "image/png" } },
	openGraph: { type: "website", locale: "sv_SE", siteName: siteConfig.name },
	twitter: { card: "summary_large_image" },
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="sv">
			<body
				className={`${inter.variable} ${oswald.variable} flex min-h-screen flex-col antialiased`}
			>
				<a
					href="#main"
					className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-black"
				>
					Hoppa till innehåll
				</a>
				<HidePublicChrome>
					<Navbar />
				</HidePublicChrome>
				<main id="main" className="flex-1">
					{children}
				</main>
				<HidePublicChrome>
					<Footer />
					<MobileBookCta />
				</HidePublicChrome>
			</body>
		</html>
	);
}
