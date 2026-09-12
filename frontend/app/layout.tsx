import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { LanguageProvider } from "@/lib/i18n";
import { MapFiltersProvider } from "@/lib/mapFilters";
import { ThemeProvider } from "@/lib/theme";
import { VotesCacheProvider } from "@/lib/votesCache";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chunga Gava | Kenya Civic Transparency",
  description: "Understand policy, scrutinize elected officials, and rate public services in Kenya.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex h-screen flex-col overflow-hidden">
        <ThemeProvider>
          <LanguageProvider>
            <VotesCacheProvider>
              <MapFiltersProvider>
                <SiteHeader />
                {/* flex-1 + min-h-0 lets content fill the remaining viewport height
                    exactly, regardless of the header's actual (responsive) height -
                    no brittle "100vh - <hardcoded px>" math to keep in sync. */}
                <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
              </MapFiltersProvider>
            </VotesCacheProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
