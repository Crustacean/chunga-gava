export type OfficialRole = "governor" | "mca";
export type ReportFrequency = "daily" | "weekly" | "monthly" | "quarterly";
export type TargetType = "official" | "amenity" | "expenditure_project";
export type ExpenditureStatus = "planned" | "ongoing" | "stalled" | "completed";

export interface ManifestoItem {
  id: number;
  title: string;
  description: string;
}

export interface Official {
  id: number;
  name: string;
  role: OfficialRole;
  county: string;
  ward: string | null;
  photo_url: string | null;
  lat: number;
  lng: number;
  report_frequency: ReportFrequency;
  manifesto_items: ManifestoItem[];
}

export interface VoteStatus {
  voted: boolean;
}

export interface PeerOfficial {
  id: number;
  name: string;
  photo_url: string | null;
  approval_pct: number;
}

export interface OfficialInsights {
  ai_summary: string;
  approval_pct: number;
  disapproval_pct: number;
  approval_count: number;
  disapproval_count: number;
  total_ratings: number;
  county_budget_allocated: number;
  county_budget_spent: number;
  county_expenditure_pct: number;
  benchmark_label: string;
  benchmark_approval_pct: number;
  comparison_official: PeerOfficial | null;
}

export interface Amenity {
  id: number;
  name: string;
  category: string;
  access_requirements: string;
  county: string | null;
  lat: number;
  lng: number;
  ai_summary?: string | null;
}

export interface Citation {
  document_title: string;
  category: string;
  excerpt: string;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  low_confidence: boolean;
}

export interface ServiceClass {
  id: number;
  name: string;
  color: string;
}

export interface County {
  id: number;
  name: string;
  emoji: string;
  lat: number;
  lng: number;
}

export interface ExpenditureCategory {
  id: number;
  name: string;
  color: string;
}

export interface Milestone {
  date: string;
  milestone: "started" | "stalled" | "resumed" | "finished";
  note?: string | null;
}

export interface ExpenditureProject {
  id: number;
  name: string;
  category: string;
  county: string | null;
  lat: number;
  lng: number;
  description: string;
  spec_label: string | null;
  spec_value: string | null;
  budget_allocated: number;
  budget_spent: number;
  status: ExpenditureStatus;
  milestones: Milestone[];
  ai_summary?: string | null;
}

export interface KnowledgeDocument {
  id: number;
  title: string;
  category: string;
  filename: string;
  status: string;
  created_at: string;
}
