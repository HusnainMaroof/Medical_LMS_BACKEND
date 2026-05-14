// ============================================================
// Professor Module — Input & Response Types
// ============================================================

// ──────────────────────────────────────────────
// Student
// ──────────────────────────────────────────────

export interface CreateStudentInput {
  fullName: string;
  email: string;
  password: string;
  studentCode: string;
  batchId: string;
  paymentStatus?: "paid" | "unpaid";
}

export interface UpdateStudentInput {
  fullName?: string;
  email?: string;
  status?: "active" | "suspended";
}

// ──────────────────────────────────────────────
// Batch
// ──────────────────────────────────────────────

export interface CreateBatchInput {
  name: string;
  description?: string;
}

export interface UpdateBatchInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// ──────────────────────────────────────────────
// Subject
// ──────────────────────────────────────────────

export interface CreateSubjectInput {
  name: string;
  description?: string;
  order?: number;
}

export interface UpdateSubjectInput {
  name?: string;
  description?: string;
  order?: number;
}

// ──────────────────────────────────────────────
// Topic
// ──────────────────────────────────────────────

export interface CreateTopicInput {
  name: string;
  description?: string;
  order?: number;
}

export interface UpdateTopicInput {
  name?: string;
  description?: string;
  order?: number;
}

// ──────────────────────────────────────────────
// Lecture
// ──────────────────────────────────────────────

export interface CreateLectureInput {
  title: string;
  description?: string;
  order?: number;
  isFree?: boolean;
}

export interface UpdateLectureInput {
  title?: string;
  description?: string;
  order?: number;
  isFree?: boolean;
}

// ──────────────────────────────────────────────
// Lecture Content
// ──────────────────────────────────────────────

export type ContentTypeValue = "video" | "pdf" | "document" | "link";

export interface CreateLectureContentInput {
  type: ContentTypeValue;
  url: string;
  label?: string;
  order?: number;
}

export interface UpdateLectureContentInput {
  type?: ContentTypeValue;
  url?: string;
  label?: string;
  order?: number;
}

// ──────────────────────────────────────────────
// Enrollment
// ──────────────────────────────────────────────

export interface UpdateEnrollmentInput {
  paymentStatus: "paid" | "unpaid";
}