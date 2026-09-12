"use client";

import { useEffect, useRef } from "react";
import BudgetBarChart from "@/components/BudgetBarChart";
import ProjectTimeline from "@/components/ProjectTimeline";
import RatingForm from "@/components/RatingForm";
import { useLanguage } from "@/lib/i18n";
import type { ExpenditureProject } from "@/types";

interface ExpenditureModalProps {
  project: ExpenditureProject | null;
  onClose: () => void;
  onRatingSubmitted?: () => void;
  /** Present only when the project's county has a known Governor; renders the "View Owner"
   * pill that pushes the leader card onto the modal stack in-place. */
  onViewOwner?: () => void;
}

const STATUS_LABELS: Record<ExpenditureProject["status"], string> = {
  planned: "Planned",
  ongoing: "Ongoing",
  stalled: "Stalled",
  completed: "Completed",
};

const STATUS_COLORS: Record<ExpenditureProject["status"], string> = {
  planned: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  ongoing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  stalled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
};

export default function ExpenditureModal({ project, onClose, onRatingSubmitted, onViewOwner }: ExpenditureModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { tCategory } = useLanguage();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (project) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [project]);

  if (!project) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-xl rounded-lg bg-white p-0 text-gray-900 backdrop:bg-black/50 dark:bg-gray-800 dark:text-gray-100"
    >
      <div className="max-h-[85vh] overflow-y-auto p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{project.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {tCategory(project.category)} {project.county ? `· ${project.county}` : ""}
            </p>
          </div>
          <form method="dialog">
            <button
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-xl leading-none text-gray-400 transition-colors hover:bg-black/10 hover:text-gray-700 dark:bg-white/10 dark:hover:bg-white/20 dark:hover:text-gray-200"
            >
              &times;
            </button>
          </form>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[project.status]}`}
          >
            {STATUS_LABELS[project.status]}
          </span>
          {onViewOwner && (
            <button
              type="button"
              onClick={onViewOwner}
              className="rounded-full bg-systemOrange px-2.5 py-0.5 text-xs font-bold text-white"
            >
              View Owner
            </button>
          )}
        </div>

        {project.description && (
          <p className="mb-3 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{project.description}</p>
        )}

        {project.spec_label && project.spec_value && (
          <p className="mb-4 text-sm">
            <span className="font-semibold text-gray-700 dark:text-gray-200">{project.spec_label}:</span>{" "}
            <span className="text-gray-600 dark:text-gray-300">{project.spec_value}</span>
          </p>
        )}

        <h3 className="mb-2 font-semibold">Budget: allocated vs. spent</h3>
        <BudgetBarChart allocated={project.budget_allocated} spent={project.budget_spent} />

        <h3 className="mb-2 mt-5 font-semibold">Timeline</h3>
        <ProjectTimeline milestones={project.milestones} status={project.status} />

        {project.ai_summary && (
          <div className="mb-4 rounded-md bg-kenya-green/10 p-3 dark:bg-kenya-green/20">
            <h3 className="text-xs font-semibold uppercase text-kenya-green">AI summary of community feedback</h3>
            <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{project.ai_summary}</p>
          </div>
        )}

        <h3 className="mb-2 font-semibold">Rate this project</h3>
        <RatingForm targetType="expenditure_project" targetId={project.id} onSubmitted={onRatingSubmitted} />
      </div>
    </dialog>
  );
}
