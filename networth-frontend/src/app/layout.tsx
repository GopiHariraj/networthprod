import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { CurrencyProvider } from "../lib/currency-context";
import { NetWorthProvider } from "../lib/networth-context";
import RootLayoutLayout from "../components/Layout";
import SessionTimeout from "../components/auth/SessionTimeout";
import RoutePreloader from "../components/RoutePreloader";
import { SWRProvider } from "../lib/swr-config";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Net Worth Tracker",
    description: "Personal finance and net worth tracking application",
    icons: {
        icon: '/favicon.png',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <SWRProvider>
                    <AuthProvider>
                        <SessionTimeout />
                        <RoutePreloader />
                        <CurrencyProvider>
                            <NetWorthProvider>
                                <RootLayoutLayout>{children}</RootLayoutLayout>
                            </NetWorthProvider>
                        </CurrencyProvider>
                    </AuthProvider>
                </SWRProvider>
            </body>
        </html>
    );
}
