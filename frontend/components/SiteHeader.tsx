"use client";

import Link from "next/link";
import CategoryDropdown from "@/components/CategoryDropdown";
import DarkModeToggle from "@/components/DarkModeToggle";
import HeaderSearch from "@/components/HeaderSearch";
import LanguageSelector from "@/components/LanguageSelector";
import LocationDropdown from "@/components/LocationDropdown";
import { useLanguage } from "@/lib/i18n";

export default function SiteHeader() {
  const { t } = useLanguage();

  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* A shared grid (not two independently-sized rows) guarantees the filter row's
          middle column is always exactly as wide as the search bar's, at every breakpoint,
          and stays correct if more filters are added later. */}
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-kenya-black dark:text-white"
        >
          <span className="inline-block h-3 w-3 rounded-full bg-kenya-red" />
          Chunga Gava
        </Link>
        <div className="min-w-0">
          <div className="mx-auto w-[90%] min-w-0">
            <HeaderSearch />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          <LanguageSelector />
          <Link
            href="/admin"
            className="text-sm font-medium text-gray-900 hover:text-kenya-green dark:text-gray-100"
          >
            {t("admin")}
          </Link>
        </div>

        <div aria-hidden="true" />
        <div className="min-w-0">
          <div className="mx-auto flex w-[90%] min-w-0 gap-3">
            <CategoryDropdown />
            <LocationDropdown />
          </div>
        </div>
        <div aria-hidden="true" />
      </div>
    </header>
  );
}
