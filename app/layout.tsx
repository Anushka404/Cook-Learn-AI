import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { Analytics } from '@vercel/analytics/next';
import { ClerkProvider } from '@clerk/nextjs';

const montserrat = Montserrat({
    subsets: ['latin'],
    variable: '--font-montserrat',
    display: 'swap',
    fallback: ['system-ui', 'sans-serif'],
});

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Cook & Learn AI",
    description: "Your smart assistant for cooking and learning with YouTube videos.",
};

// Neobrutalist theme for all Clerk UIs (modal + /sign-in + /sign-up)
const clerkAppearance = {
    variables: {
        colorPrimary: "#FF6B6B",
        colorText: "#000000",
        colorTextSecondary: "#374151",
        colorBackground: "#ffffff",
        colorInputBackground: "#ffffff",
        colorInputText: "#000000",
        borderRadius: "0.5rem",
        fontFamily: "var(--font-geist-mono)",
    },
    elements: {
        rootBox: "font-mono",

        // Cards & modals
        cardBox: "border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden",
        card: "bg-white",
        modalContent: "font-mono",
        modalCloseButton: "text-black hover:bg-amber-100 border-2 border-transparent hover:border-black rounded-md",

        // Headers
        headerTitle: "font-pixeboy text-3xl uppercase tracking-wide text-black",
        headerSubtitle: "font-mono text-gray-700",

        // Avatar (trigger + everywhere)
        avatarBox: "border-2 border-black",
        userButtonAvatarBox:
            "w-14! h-14! border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform",
        userButtonTrigger: "rounded-full focus:shadow-none",

        // UserButton popover
        userButtonPopoverCard:
            "border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden font-mono",
        userButtonPopoverMain: "bg-white",
        userButtonPopoverActionButton: "font-mono font-bold text-black hover:bg-amber-100",
        userButtonPopoverActionButtonText: "font-mono font-bold",
        userButtonPopoverFooter: "bg-amber-50 border-t-2 border-black",
        userPreviewMainIdentifier: "font-mono font-bold text-black",
        userPreviewSecondaryIdentifier: "font-mono text-gray-600",

        // UserProfile navbar
        navbar: "bg-amber-100 border-r-2 border-black",
        navbarButton: "font-mono font-bold text-black rounded-lg hover:bg-amber-200",
        navbarButtonIcon: "text-black",
        navbarButton__active: "bg-[#FFD761] border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",

        // UserProfile sections
        profileSectionTitleText: "font-pixeboy uppercase tracking-wide text-black",
        profileSectionPrimaryButton: "text-[#FF6B6B] font-bold font-mono hover:underline",
        accordionTriggerButton: "font-mono font-bold text-black",
        menuButton: "font-mono text-black hover:bg-amber-100",
        menuList: "border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg",
        badge: "bg-[#FFEB99] text-black border-2 border-black font-mono",

        // Sign-in / Sign-up
        socialButtonsBlockButton:
            "border-2 border-black rounded-lg bg-white text-black font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 transition-all",
        socialButtonsBlockButtonText: "font-mono font-bold",
        dividerLine: "bg-black h-0.5",
        dividerText: "font-mono text-gray-700",
        formFieldLabel: "font-mono font-bold text-black",
        formFieldInput:
            "border-4 border-black rounded-lg text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:ring-4 focus:ring-[#A0E7E5] focus:border-black",
        formButtonPrimary:
            "bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-black font-mono normal-case border-4 border-black rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all",
        footerActionLink: "text-[#FF6B6B] font-bold hover:underline",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ClerkProvider appearance={clerkAppearance}>
            <html lang="en">
                <body
                    className={`${geistSans.variable} ${geistMono.variable} antialiased ${montserrat.variable} font-sans`}>
                    {children}
                    <Analytics />
                </body>
            </html>
        </ClerkProvider>
    );
}
