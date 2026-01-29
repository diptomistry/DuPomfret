import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/app/providers";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { Chatbot } from "@/components/chatbot/Chatbot";
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
    title: "Orion",
    description: "Your intelligent course companion",
};

export default async function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    // Fetch session server-side and pass a minimal serializable payload to the client
    // so the client can hydrate auth state without an extra roundtrip.
    const initialSessionPayload = await (async () => {
        try {
            const supabase = await createServerClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session) return { session: null, user: null };

            return {
                session: {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    expires_at: session.expires_at,
                },
                user: session.user
                    ? {
                          id: session.user.id,
                          email: session.user.email,
                          user_metadata: session.user.user_metadata,
                          app_metadata: session.user.app_metadata,
                      }
                    : null,
            };
        } catch {
            return { session: null, user: null };
        }
    })();

    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <Providers initialSession={initialSessionPayload}>
                    {children}
                    <Chatbot />
                </Providers>
            </body>
        </html>
    );
}
