"use client";

import { useEffect, useState } from "react";
import AmenitiesManager from "@/components/admin/AmenitiesManager";
import CountiesManager from "@/components/admin/CountiesManager";
import ExpenditureCategoriesManager from "@/components/admin/ExpenditureCategoriesManager";
import ExpenditureProjectsManager from "@/components/admin/ExpenditureProjectsManager";
import KnowledgeBaseUploader from "@/components/admin/KnowledgeBaseUploader";
import LoginForm from "@/components/admin/LoginForm";
import OfficialsManager from "@/components/admin/OfficialsManager";
import ServiceClassesManager from "@/components/admin/ServiceClassesManager";
import { clearAdminToken, getAdminToken } from "@/lib/auth";

type Tab =
  | "knowledge-base"
  | "officials"
  | "amenities"
  | "service-classes"
  | "counties"
  | "expenditure-categories"
  | "expenditure-projects";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState<Tab>("knowledge-base");

  useEffect(() => {
    setAuthenticated(!!getAdminToken());
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!authenticated) {
    return <LoginForm onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-md bg-kenya-black px-3 py-1.5 text-white">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-kenya-red" />
          <span className="text-sm font-semibold">Country: Kenya</span>
        </div>
        <button
          onClick={() => {
            clearAdminToken();
            setAuthenticated(false);
          }}
          className="text-sm text-gray-600 underline dark:text-gray-400"
        >
          Sign out
        </button>
      </div>

      <nav className="mb-6 flex gap-4 border-b text-sm font-medium dark:border-gray-700">
        {([
          ["knowledge-base", "Knowledge Base (RAG)"],
          ["officials", "Officials & Map Data"],
          ["amenities", "Amenities"],
          ["service-classes", "Service Classes"],
          ["counties", "Counties"],
          ["expenditure-categories", "Expenditure Categories"],
          ["expenditure-projects", "Expenditure Projects"],
        ] as [Tab, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`-mb-px border-b-2 px-1 pb-2 ${
              tab === value
                ? "border-kenya-green text-kenya-green"
                : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "knowledge-base" && <KnowledgeBaseUploader />}
      {tab === "officials" && <OfficialsManager />}
      {tab === "amenities" && <AmenitiesManager />}
      {tab === "service-classes" && <ServiceClassesManager />}
      {tab === "counties" && <CountiesManager />}
      {tab === "expenditure-categories" && <ExpenditureCategoriesManager />}
      {tab === "expenditure-projects" && <ExpenditureProjectsManager />}
    </div>
  );
}
