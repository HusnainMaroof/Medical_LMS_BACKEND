import { redis } from "../config/redis.js";

// ============================================================
// Cache TTLs (seconds)
// ============================================================

export const TTL = {
  DASHBOARD: 60 * 5, //  5 min — stats change often
  STUDENT_LIST: 60 * 5, //  5 min
  BATCH_LIST: 60 * 5, //  5 min
  BATCH_DETAIL: 60 * 10, // 10 min — full tree
  SUBJECT_DETAIL: 60 * 10, // 10 min
  TOPIC_DETAIL: 60 * 10, // 10 min
  LECTURE_DETAIL: 60 * 10, // 10 min
  ENROLLMENT_LIST: 60 * 5, //  5 min
} as const;

// ============================================================
// Cache Key Builders
// ============================================================

export const CACHE_KEYS = {
  dashboard: (professorId: string) => `prof:dashboard:${professorId}`,
  studentList: (professorId: string) => `prof:students:${professorId}`,
  batchList: (professorId: string) => `prof:batches:${professorId}`,
  batchDetail: (batchId: string) => `prof:batch:${batchId}`,
  subjectDetail: (subjectId: string) => `prof:subject:${subjectId}`,
  topicDetail: (topicId: string) => `prof:topic:${topicId}`,
  lectureDetail: (lectureId: string) => `prof:lecture:${lectureId}`,
  enrollmentList: (professorId: string) => `prof:enrollments:${professorId}`,
} as const;

// ============================================================
// Generic Helpers — never throw, cache is not a dependency
// ============================================================

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const value = await redis.get<T>(key);
    return value ?? null;
  } catch {
    return null;
  }
};

export const cacheSet = async <T>(
  key: string,
  value: T,
  ttl: number,
): Promise<void> => {
  try {
    await redis.set(key, value, { ex: ttl });
  } catch {
    // silent — DB is source of truth
  }
};

// Pipeline DEL: one HTTP round-trip for multiple keys (Upstash is HTTP-based)
export const cacheDel = async (...keys: string[]): Promise<void> => {
  if (!keys.length) return;
  try {
    const pipeline = redis.pipeline();
    for (const key of keys) pipeline.del(key);
    await pipeline.exec();
  } catch {
    // silent
  }
};

// ============================================================
// Domain Invalidation Helpers
// ============================================================

// Student create/update/delete
export const invalidateStudentCache = async (professorId: string) => {
  await cacheDel(
    CACHE_KEYS.dashboard(professorId),
    CACHE_KEYS.studentList(professorId),
    CACHE_KEYS.enrollmentList(professorId),
  );
};

// Batch create/update/delete
export const invalidateBatchCache = async (
  professorId: string,
  batchId?: string,
) => {
  const keys = [
    CACHE_KEYS.dashboard(professorId),
    CACHE_KEYS.batchList(professorId),
    CACHE_KEYS.enrollmentList(professorId),
  ];
  if (batchId) keys.push(CACHE_KEYS.batchDetail(batchId));
  await cacheDel(...keys);
};

// Subject create/update/delete — also busts batch detail (subject count changes)
export const invalidateSubjectCache = async (
  professorId: string,
  batchId: string,
  subjectId?: string,
) => {
  const keys = [
    CACHE_KEYS.batchDetail(batchId),
    CACHE_KEYS.batchList(professorId),
  ];
  if (subjectId) keys.push(CACHE_KEYS.subjectDetail(subjectId));
  await cacheDel(...keys);
};

// Topic create/update/delete — busts subject detail (topic count changes)
export const invalidateTopicCache = async (
  subjectId: string,
  topicId?: string,
) => {
  const keys = [CACHE_KEYS.subjectDetail(subjectId)];
  if (topicId) keys.push(CACHE_KEYS.topicDetail(topicId));
  await cacheDel(...keys);
};

// Lecture create/update/delete — busts topic detail (lecture count changes)
export const invalidateLectureCache = async (
  topicId: string,
  lectureId?: string,
) => {
  const keys = [CACHE_KEYS.topicDetail(topicId)];
  if (lectureId) keys.push(CACHE_KEYS.lectureDetail(lectureId));
  await cacheDel(...keys);
};

// Content create/update/delete — busts lecture detail only
export const invalidateLectureContentCache = async (lectureId: string) => {
  await cacheDel(CACHE_KEYS.lectureDetail(lectureId));
};

// Enrollment payment toggle — busts enrollment list + dashboard stats
export const invalidateEnrollmentCache = async (professorId: string) => {
  await cacheDel(
    CACHE_KEYS.dashboard(professorId),
    CACHE_KEYS.enrollmentList(professorId),
    CACHE_KEYS.studentList(professorId),
  );
};
