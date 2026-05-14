import type { Request, Response } from "express";
import { asyncHandler } from "../middlewares/Async.middleware.js";
import {
  getDashboardService,
  createStudentService,
  getStudentsService,
  updateStudentService,
  deleteStudentService,
  getEnrollmentsService,
  updateEnrollmentService,
  createBatchService,
  getBatchesService,
  getBatchDetailService,
  updateBatchService,
  deleteBatchService,
  createSubjectService,
  getSubjectDetailService,
  updateSubjectService,
  deleteSubjectService,
  createTopicService,
  getTopicDetailService,
  updateTopicService,
  deleteTopicService,
  createLectureService,
  getLectureDetailService,
  updateLectureService,
  deleteLectureService,
  createLectureContentService,
  updateLectureContentService,
  deleteLectureContentService,
} from "../services/professor.service.js";

// ============================================================
// ─── PARAM TYPE SHAPES ──────────────────────────────────────
// ============================================================

type IdParam = { id: string };
type BatchIdParam = { batchId: string };
type SubjectIdParam = { subjectId: string };
type TopicIdParam = { topicId: string };
type LectureIdParam = { lectureId: string };

// ============================================================
// ─── DASHBOARD ──────────────────────────────────────────────
// ============================================================

export const getDashboard = asyncHandler(
  async (req: Request, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await getDashboardService(professorId);

    res.status(200).json({ success: true, data });
  },
);

// ============================================================
// ─── STUDENTS ───────────────────────────────────────────────
// ============================================================

export const createStudent = asyncHandler(
  async (req: Request, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await createStudentService(professorId, req.body);

    res.status(201).json({
      success: true,
      message: "Student created and credentials sent via email",
      data,
    });
  },
);

export const getStudents = asyncHandler(async (req: Request, res: Response) => {
  const professorId = req.user!.userId!;
  const data = await getStudentsService(professorId);

  res.status(200).json({ success: true, data });
});

export const updateStudent = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await updateStudentService(
      professorId,
      req.params.id,
      req.body,
    );

    res.status(200).json({ success: true, message: "Student updated", data });
  },
);

export const deleteStudent = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    await deleteStudentService(professorId, req.params.id);

    res.status(200).json({ success: true, message: "Student deleted" });
  },
);

// ============================================================
// ─── ENROLLMENTS ────────────────────────────────────────────
// ============================================================

export const getEnrollments = asyncHandler(
  async (req: Request, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await getEnrollmentsService(professorId);

    res.status(200).json({ success: true, data });
  },
);

export const updateEnrollment = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await updateEnrollmentService(
      professorId,
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: `Payment status updated to ${data.paymentStatus}`,
      data,
    });
  },
);

// ============================================================
// ─── BATCHES ────────────────────────────────────────────────
// ============================================================

export const createBatch = asyncHandler(async (req: Request, res: Response) => {
  const professorId = req.user!.userId!;
  const data = await createBatchService(professorId, req.body);

  res.status(201).json({ success: true, message: "Batch created", data });
});

export const getBatches = asyncHandler(async (req: Request, res: Response) => {
  const professorId = req.user!.userId!;
  const data = await getBatchesService(professorId);

  res.status(200).json({ success: true, data });
});

export const getBatchDetail = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await getBatchDetailService(professorId, req.params.id);

    res.status(200).json({ success: true, data });
  },
);

export const updateBatch = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await updateBatchService(professorId, req.params.id, req.body);

    res.status(200).json({ success: true, message: "Batch updated", data });
  },
);

export const deleteBatch = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    await deleteBatchService(professorId, req.params.id);

    res.status(200).json({
      success: true,
      message: "Batch and all its content deleted",
    });
  },
);

// ============================================================
// ─── SUBJECTS ───────────────────────────────────────────────
// ============================================================

export const createSubject = asyncHandler(
  async (req: Request<BatchIdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await createSubjectService(
      professorId,
      req.params.batchId,
      req.body,
    );

    res.status(201).json({ success: true, message: "Subject created", data });
  },
);

export const getSubjectDetail = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await getSubjectDetailService(professorId, req.params.id);

    res.status(200).json({ success: true, data });
  },
);

export const updateSubject = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await updateSubjectService(
      professorId,
      req.params.id,
      req.body,
    );

    res.status(200).json({ success: true, message: "Subject updated", data });
  },
);

export const deleteSubject = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    await deleteSubjectService(professorId, req.params.id);

    res.status(200).json({
      success: true,
      message: "Subject and all its topics and lectures deleted",
    });
  },
);

// ============================================================
// ─── TOPICS ─────────────────────────────────────────────────
// ============================================================

export const createTopic = asyncHandler(
  async (req: Request<SubjectIdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await createTopicService(
      professorId,
      req.params.subjectId,
      req.body,
    );

    res.status(201).json({ success: true, message: "Topic created", data });
  },
);

export const getTopicDetail = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await getTopicDetailService(professorId, req.params.id);

    res.status(200).json({ success: true, data });
  },
);

export const updateTopic = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await updateTopicService(professorId, req.params.id, req.body);

    res.status(200).json({ success: true, message: "Topic updated", data });
  },
);

export const deleteTopic = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    await deleteTopicService(professorId, req.params.id);

    res.status(200).json({
      success: true,
      message: "Topic and all its lectures deleted",
    });
  },
);

// ============================================================
// ─── LECTURES ───────────────────────────────────────────────
// ============================================================

export const createLecture = asyncHandler(
  async (req: Request<TopicIdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await createLectureService(
      professorId,
      req.params.topicId,
      req.body,
    );

    res.status(201).json({ success: true, message: "Lecture created", data });
  },
);

export const getLectureDetail = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await getLectureDetailService(professorId, req.params.id);

    res.status(200).json({ success: true, data });
  },
);

export const updateLecture = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await updateLectureService(
      professorId,
      req.params.id,
      req.body,
    );

    res.status(200).json({ success: true, message: "Lecture updated", data });
  },
);

export const deleteLecture = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    await deleteLectureService(professorId, req.params.id);

    res.status(200).json({
      success: true,
      message: "Lecture and all its content items deleted",
    });
  },
);

// ============================================================
// ─── LECTURE CONTENT ────────────────────────────────────────
// ============================================================

export const createLectureContent = asyncHandler(
  async (req: Request<LectureIdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await createLectureContentService(
      professorId,
      req.params.lectureId,
      req.body,
    );

    res
      .status(201)
      .json({ success: true, message: "Content added to lecture", data });
  },
);

export const updateLectureContent = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    const data = await updateLectureContentService(
      professorId,
      req.params.id,
      req.body,
    );

    res.status(200).json({ success: true, message: "Content updated", data });
  },
);

export const deleteLectureContent = asyncHandler(
  async (req: Request<IdParam>, res: Response) => {
    const professorId = req.user!.userId!;
    await deleteLectureContentService(professorId, req.params.id);

    res
      .status(200)
      .json({ success: true, message: "Content removed from lecture" });
  },
);
