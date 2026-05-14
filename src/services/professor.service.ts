import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { sendStudentCredentialsEmail } from "../utils/email.util.js";
import {
  CACHE_KEYS,
  TTL,
  cacheGet,
  cacheSet,
  invalidateBatchCache,
  invalidateEnrollmentCache,
  invalidateLectureCache,
  invalidateLectureContentCache,
  invalidateStudentCache,
  invalidateSubjectCache,
  invalidateTopicCache,
} from "../lib/professor.redis.js";
import type {
  CreateBatchInput,
  CreateLectureContentInput,
  CreateLectureInput,
  CreateStudentInput,
  CreateSubjectInput,
  CreateTopicInput,
  UpdateBatchInput,
  UpdateEnrollmentInput,
  UpdateLectureContentInput,
  UpdateLectureInput,
  UpdateStudentInput,
  UpdateSubjectInput,
  UpdateTopicInput,
} from "../type/professor.type.js";

// ============================================================
// ─── DASHBOARD ──────────────────────────────────────────────
// ============================================================

export const getDashboardService = async (professorId: string) => {
  const cacheKey = CACHE_KEYS.dashboard(professorId);
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  // All counts + recent data in parallel — single round-trip to DB
  const [
    totalStudents,
    totalBatches,
    activeBatches,
    enrollmentStats,
    recentStudents,
    recentEnrollments,
    batchOverview,
  ] = await Promise.all([
    // Total students this professor created
    prisma.student.count({ where: { professorId } }),

    // Total batches
    prisma.batch.count({ where: { professorId } }),

    // Active batches
    prisma.batch.count({ where: { professorId, isActive: true } }),

    // Enrollment breakdown — paid vs unpaid
    prisma.enrollment.groupBy({
      by: ["paymentStatus"],
      where: { batch: { professorId } },
      _count: { _all: true },
    }),

    // 5 most recent students
    prisma.student.findMany({
      where: { professorId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        fullName: true,
        email: true,
        studentCode: true,
        status: true,
        createdAt: true,
        enrollments: {
          select: {
            paymentStatus: true,
            batch: { select: { id: true, name: true } },
          },
        },
      },
    }),

    // 5 most recent enrollment changes
    prisma.enrollment.findMany({
      where: { batch: { professorId } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        paymentStatus: true,
        createdAt: true,
        updatedAt: true,
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            studentCode: true,
          },
        },
        batch: { select: { id: true, name: true } },
      },
    }),

    // All batches with subject + enrollment counts (for overview table)
    prisma.batch.findMany({
      where: { professorId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        isActive: true,
        _count: { select: { subjects: true, enrollments: true } },
      },
    }),
  ]);

  // Reduce groupBy result into paid / unpaid counts
  const paidEnrollments =
    enrollmentStats.find((e) => e.paymentStatus === "paid")?._count._all ?? 0;
  const unpaidEnrollments =
    enrollmentStats.find((e) => e.paymentStatus === "unpaid")?._count._all ?? 0;

  const dashboard = {
    stats: {
      totalStudents,
      totalBatches,
      activeBatches,
      totalEnrollments: paidEnrollments + unpaidEnrollments,
      paidEnrollments,
      unpaidEnrollments,
    },
    recentStudents,
    recentEnrollments,
    batchOverview,
  };

  await cacheSet(cacheKey, dashboard, TTL.DASHBOARD);
  return dashboard;
};

// ============================================================
// ─── STUDENTS ───────────────────────────────────────────────
// ============================================================

export const createStudentService = async (
  professorId: string,
  input: CreateStudentInput,
) => {
  const {
    fullName,
    email,
    password,
    studentCode,
    batchId,
    paymentStatus = "unpaid",
  } = input;

  // 1. Verify batch belongs to this professor
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, professorId },
    select: { id: true, name: true },
  });
  if (!batch) throw new Error("Batch not found or access denied");

  // 2. Check uniqueness before bcrypt (saves CPU on duplicate)
  const [emailTaken, codeTaken] = await Promise.all([
    prisma.student.findUnique({ where: { email }, select: { id: true } }),
    prisma.student.findUnique({ where: { studentCode }, select: { id: true } }),
  ]);
  if (emailTaken) throw new Error("Email already in use");
  if (codeTaken) throw new Error("Student code already in use");

  // 3. Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // 4. Create student + enrollment atomically
  const student = await prisma.$transaction(async (tx) => {
    const created = await tx.student.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        studentCode,
        professorId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        studentCode: true,
        status: true,
        createdAt: true,
      },
    });

    await tx.enrollment.create({
      data: { studentId: created.id, batchId, paymentStatus },
    });

    return created;
  });

  // 5. Send credentials email after transaction (plain password — only time it exists)
  await sendStudentCredentialsEmail(
    email,
    fullName,
    password,
    studentCode,
    batch.name,
  );

  // 6. Bust student list + dashboard
  await invalidateStudentCache(professorId);

  return {
    student,
    enrollment: { batchId, batchName: batch.name, paymentStatus },
  };
};

export const getStudentsService = async (professorId: string) => {
  const cacheKey = CACHE_KEYS.studentList(professorId);
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const students = await prisma.student.findMany({
    where: { professorId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      studentCode: true,
      status: true,
      createdAt: true,
      enrollments: {
        select: {
          id: true,
          paymentStatus: true,
          batch: { select: { id: true, name: true } },
        },
      },
    },
  });

  await cacheSet(cacheKey, students, TTL.STUDENT_LIST);
  return students;
};

export const updateStudentService = async (
  professorId: string,
  studentId: string,
  input: UpdateStudentInput,
) => {
  const student = await prisma.student.findFirst({
    where: { id: studentId, professorId },
    select: { id: true, email: true },
  });
  if (!student) throw new Error("Student not found or access denied");

  if (input.email && input.email !== student.email) {
    const taken = await prisma.student.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (taken) throw new Error("Email already in use");
  }

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: input,
    select: {
      id: true,
      fullName: true,
      email: true,
      studentCode: true,
      status: true,
      updatedAt: true,
    },
  });

  await invalidateStudentCache(professorId);
  return updated;
};

export const deleteStudentService = async (
  professorId: string,
  studentId: string,
) => {
  const student = await prisma.student.findFirst({
    where: { id: studentId, professorId },
    select: { id: true },
  });
  if (!student) throw new Error("Student not found or access denied");

  await prisma.student.delete({ where: { id: studentId } });
  await invalidateStudentCache(professorId);
};

// ============================================================
// ─── ENROLLMENTS ────────────────────────────────────────────
// ============================================================

export const getEnrollmentsService = async (professorId: string) => {
  const cacheKey = CACHE_KEYS.enrollmentList(professorId);
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const enrollments = await prisma.enrollment.findMany({
    where: { batch: { professorId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      paymentStatus: true,
      createdAt: true,
      updatedAt: true,
      student: {
        select: {
          id: true,
          fullName: true,
          email: true,
          studentCode: true,
          status: true,
        },
      },
      batch: { select: { id: true, name: true } },
    },
  });

  await cacheSet(cacheKey, enrollments, TTL.ENROLLMENT_LIST);
  return enrollments;
};

export const updateEnrollmentService = async (
  professorId: string,
  enrollmentId: string,
  input: UpdateEnrollmentInput,
) => {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, batch: { professorId } },
    select: { id: true },
  });
  if (!enrollment) throw new Error("Enrollment not found or access denied");

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { paymentStatus: input.paymentStatus },
    select: {
      id: true,
      paymentStatus: true,
      updatedAt: true,
      student: {
        select: { id: true, fullName: true, email: true, studentCode: true },
      },
      batch: { select: { id: true, name: true } },
    },
  });

  // Bust enrollment list + dashboard (paid/unpaid counts changed)
  await invalidateEnrollmentCache(professorId);
  return updated;
};

// ============================================================
// ─── BATCHES ────────────────────────────────────────────────
// ============================================================

export const createBatchService = async (
  professorId: string,
  input: CreateBatchInput,
) => {
  const batch = await prisma.batch.create({
    data: { ...input, professorId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
    },
  });

  await invalidateBatchCache(professorId);
  return batch;
};

export const getBatchesService = async (professorId: string) => {
  const cacheKey = CACHE_KEYS.batchList(professorId);
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const batches = await prisma.batch.findMany({
    where: { professorId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      _count: { select: { subjects: true, enrollments: true } },
    },
  });

  await cacheSet(cacheKey, batches, TTL.BATCH_LIST);
  return batches;
};

export const getBatchDetailService = async (
  professorId: string,
  batchId: string,
) => {
  const cacheKey = CACHE_KEYS.batchDetail(batchId);
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const batch = await prisma.batch.findFirst({
    where: { id: batchId, professorId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      _count: { select: { enrollments: true } },
      subjects: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          order: true,
          _count: { select: { topics: true } },
        },
      },
    },
  });
  if (!batch) throw new Error("Batch not found or access denied");

  await cacheSet(cacheKey, batch, TTL.BATCH_DETAIL);
  return batch;
};

export const updateBatchService = async (
  professorId: string,
  batchId: string,
  input: UpdateBatchInput,
) => {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, professorId },
    select: { id: true },
  });
  if (!batch) throw new Error("Batch not found or access denied");

  const updated = await prisma.batch.update({
    where: { id: batchId },
    data: input,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      updatedAt: true,
    },
  });

  await invalidateBatchCache(professorId, batchId);
  return updated;
};

export const deleteBatchService = async (
  professorId: string,
  batchId: string,
) => {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, professorId },
    select: { id: true },
  });
  if (!batch) throw new Error("Batch not found or access denied");

  // Schema cascades: Batch → Subject → Topic → Lecture → LectureContent
  await prisma.batch.delete({ where: { id: batchId } });
  await invalidateBatchCache(professorId, batchId);
};

// ============================================================
// ─── SUBJECTS ───────────────────────────────────────────────
// ============================================================

export const createSubjectService = async (
  professorId: string,
  batchId: string,
  input: CreateSubjectInput,
) => {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, professorId },
    select: { id: true },
  });
  if (!batch) throw new Error("Batch not found or access denied");

  // Auto-order: append after last subject in this batch
  let order = input.order;
  if (order === undefined) {
    const last = await prisma.subject.findFirst({
      where: { batchId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    order = (last?.order ?? -1) + 1;
  }

  const subject = await prisma.subject.create({
    data: { ...input, order, batchId },
    select: {
      id: true,
      name: true,
      description: true,
      order: true,
      createdAt: true,
      batchId: true,
    },
  });

  await invalidateSubjectCache(professorId, batchId);
  return subject;
};

export const getSubjectDetailService = async (
  professorId: string,
  subjectId: string,
) => {
  const cacheKey = CACHE_KEYS.subjectDetail(subjectId);
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, batch: { professorId } },
    select: {
      id: true,
      name: true,
      description: true,
      order: true,
      batch: { select: { id: true, name: true } },
      topics: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          order: true,
          _count: { select: { lectures: true } },
        },
      },
    },
  });
  if (!subject) throw new Error("Subject not found or access denied");

  await cacheSet(cacheKey, subject, TTL.SUBJECT_DETAIL);
  return subject;
};

export const updateSubjectService = async (
  professorId: string,
  subjectId: string,
  input: UpdateSubjectInput,
) => {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, batch: { professorId } },
    select: { id: true, batchId: true },
  });
  if (!subject) throw new Error("Subject not found or access denied");

  const updated = await prisma.subject.update({
    where: { id: subjectId },
    data: input,
    select: {
      id: true,
      name: true,
      description: true,
      order: true,
      updatedAt: true,
    },
  });

  await invalidateSubjectCache(professorId, subject.batchId, subjectId);
  return updated;
};

export const deleteSubjectService = async (
  professorId: string,
  subjectId: string,
) => {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, batch: { professorId } },
    select: { id: true, batchId: true },
  });
  if (!subject) throw new Error("Subject not found or access denied");

  await prisma.subject.delete({ where: { id: subjectId } });
  await invalidateSubjectCache(professorId, subject.batchId, subjectId);
};

// ============================================================
// ─── TOPICS ─────────────────────────────────────────────────
// ============================================================

export const createTopicService = async (
  professorId: string,
  subjectId: string,
  input: CreateTopicInput,
) => {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, batch: { professorId } },
    select: { id: true },
  });
  if (!subject) throw new Error("Subject not found or access denied");

  let order = input.order;
  if (order === undefined) {
    const last = await prisma.topic.findFirst({
      where: { subjectId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    order = (last?.order ?? -1) + 1;
  }

  const topic = await prisma.topic.create({
    data: { ...input, order, subjectId },
    select: {
      id: true,
      name: true,
      description: true,
      order: true,
      createdAt: true,
      subjectId: true,
    },
  });

  await invalidateTopicCache(subjectId);
  return topic;
};

export const getTopicDetailService = async (
  professorId: string,
  topicId: string,
) => {
  const cacheKey = CACHE_KEYS.topicDetail(topicId);
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const topic = await prisma.topic.findFirst({
    where: { id: topicId, subject: { batch: { professorId } } },
    select: {
      id: true,
      name: true,
      description: true,
      order: true,
      subject: {
        select: {
          id: true,
          name: true,
          batch: { select: { id: true, name: true } },
        },
      },
      lectures: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          isFree: true,
          _count: { select: { contents: true } },
        },
      },
    },
  });
  if (!topic) throw new Error("Topic not found or access denied");

  await cacheSet(cacheKey, topic, TTL.TOPIC_DETAIL);
  return topic;
};

export const updateTopicService = async (
  professorId: string,
  topicId: string,
  input: UpdateTopicInput,
) => {
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, subject: { batch: { professorId } } },
    select: { id: true, subjectId: true },
  });
  if (!topic) throw new Error("Topic not found or access denied");

  const updated = await prisma.topic.update({
    where: { id: topicId },
    data: input,
    select: {
      id: true,
      name: true,
      description: true,
      order: true,
      updatedAt: true,
    },
  });

  await invalidateTopicCache(topic.subjectId, topicId);
  return updated;
};

export const deleteTopicService = async (
  professorId: string,
  topicId: string,
) => {
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, subject: { batch: { professorId } } },
    select: { id: true, subjectId: true },
  });
  if (!topic) throw new Error("Topic not found or access denied");

  await prisma.topic.delete({ where: { id: topicId } });
  await invalidateTopicCache(topic.subjectId, topicId);
};

// ============================================================
// ─── LECTURES ───────────────────────────────────────────────
// ============================================================

export const createLectureService = async (
  professorId: string,
  topicId: string,
  input: CreateLectureInput,
) => {
  // Full ownership chain verified in one query
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, subject: { batch: { professorId } } },
    select: {
      id: true,
      subjectId: true,
      subject: {
        select: {
          name: true,
          batchId: true,
          batch: { select: { name: true } },
        },
      },
    },
  });
  if (!topic) throw new Error("Topic not found or access denied");

  let order = input.order;
  if (order === undefined) {
    const last = await prisma.lecture.findFirst({
      where: { topicId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    order = (last?.order ?? -1) + 1;
  }

  const lecture = await prisma.lecture.create({
    data: { ...input, order, topicId },
    select: {
      id: true,
      title: true,
      description: true,
      order: true,
      isFree: true,
      createdAt: true,
      topicId: true,
    },
  });

  await invalidateLectureCache(topicId);

  // Return full breadcrumb context so frontend doesn't need extra calls
  return {
    ...lecture,
    context: {
      batch: { id: topic.subject.batchId, name: topic.subject.batch.name },
      subject: { id: topic.subjectId, name: topic.subject.name },
      topic: { id: topic.id },
    },
  };
};

export const getLectureDetailService = async (
  professorId: string,
  lectureId: string,
) => {
  const cacheKey = CACHE_KEYS.lectureDetail(lectureId);
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const lecture = await prisma.lecture.findFirst({
    where: { id: lectureId, topic: { subject: { batch: { professorId } } } },
    select: {
      id: true,
      title: true,
      description: true,
      order: true,
      isFree: true,
      createdAt: true,
      topic: {
        select: {
          id: true,
          name: true,
          subject: {
            select: {
              id: true,
              name: true,
              batch: { select: { id: true, name: true } },
            },
          },
        },
      },
      contents: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          url: true,
          label: true,
          order: true,
        },
      },
    },
  });
  if (!lecture) throw new Error("Lecture not found or access denied");

  await cacheSet(cacheKey, lecture, TTL.LECTURE_DETAIL);
  return lecture;
};

export const updateLectureService = async (
  professorId: string,
  lectureId: string,
  input: UpdateLectureInput,
) => {
  const lecture = await prisma.lecture.findFirst({
    where: { id: lectureId, topic: { subject: { batch: { professorId } } } },
    select: { id: true, topicId: true },
  });
  if (!lecture) throw new Error("Lecture not found or access denied");

  const updated = await prisma.lecture.update({
    where: { id: lectureId },
    data: input,
    select: {
      id: true,
      title: true,
      description: true,
      order: true,
      isFree: true,
      updatedAt: true,
    },
  });

  await invalidateLectureCache(lecture.topicId, lectureId);
  return updated;
};

export const deleteLectureService = async (
  professorId: string,
  lectureId: string,
) => {
  const lecture = await prisma.lecture.findFirst({
    where: { id: lectureId, topic: { subject: { batch: { professorId } } } },
    select: { id: true, topicId: true },
  });
  if (!lecture) throw new Error("Lecture not found or access denied");

  await prisma.lecture.delete({ where: { id: lectureId } });
  await invalidateLectureCache(lecture.topicId, lectureId);
};

// ============================================================
// ─── LECTURE CONTENT ────────────────────────────────────────
// ============================================================

export const createLectureContentService = async (
  professorId: string,
  lectureId: string,
  input: CreateLectureContentInput,
) => {
  const lecture = await prisma.lecture.findFirst({
    where: { id: lectureId, topic: { subject: { batch: { professorId } } } },
    select: { id: true },
  });
  if (!lecture) throw new Error("Lecture not found or access denied");

  let order = input.order;
  if (order === undefined) {
    const last = await prisma.lectureContent.findFirst({
      where: { lectureId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    order = (last?.order ?? -1) + 1;
  }

  const content = await prisma.lectureContent.create({
    data: { ...input, order, lectureId },
    select: {
      id: true,
      type: true,
      url: true,
      label: true,
      order: true,
      createdAt: true,
    },
  });

  await invalidateLectureContentCache(lectureId);
  return content;
};

export const updateLectureContentService = async (
  professorId: string,
  contentId: string,
  input: UpdateLectureContentInput,
) => {
  const content = await prisma.lectureContent.findFirst({
    where: {
      id: contentId,
      lecture: { topic: { subject: { batch: { professorId } } } },
    },
    select: { id: true, lectureId: true },
  });
  if (!content) throw new Error("Content not found or access denied");

  const updated = await prisma.lectureContent.update({
    where: { id: contentId },
    data: input,
    select: {
      id: true,
      type: true,
      url: true,
      label: true,
      order: true,
    },
  });

  await invalidateLectureContentCache(content.lectureId);
  return updated;
};

export const deleteLectureContentService = async (
  professorId: string,
  contentId: string,
) => {
  const content = await prisma.lectureContent.findFirst({
    where: {
      id: contentId,
      lecture: { topic: { subject: { batch: { professorId } } } },
    },
    select: { id: true, lectureId: true },
  });
  if (!content) throw new Error("Content not found or access denied");

  await prisma.lectureContent.delete({ where: { id: contentId } });
  await invalidateLectureContentCache(content.lectureId);
};
