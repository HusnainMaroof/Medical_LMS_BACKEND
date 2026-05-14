import { Router } from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { requireProfessor } from "../middlewares/role.moddleware.js";
import {
  getDashboard,
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent,
  getEnrollments,
  updateEnrollment,
  createBatch,
  getBatches,
  getBatchDetail,
  updateBatch,
  deleteBatch,
  createSubject,
  getSubjectDetail,
  updateSubject,
  deleteSubject,
  createTopic,
  getTopicDetail,
  updateTopic,
  deleteTopic,
  createLecture,
  getLectureDetail,
  updateLecture,
  deleteLecture,
  createLectureContent,
  updateLectureContent,
  deleteLectureContent,
} from "../controllers/professor.controller.js";

const router = Router();

// Every route in this file requires a valid session + professor role
router.use(protectRoute, requireProfessor);

// ──────────────────────────────────────────────────────────────
// Dashboard
// GET /professor/dashboard
//   → stats (total students, batches, paid/unpaid counts)
//   → recent students (last 5)
//   → recent enrollment changes (last 5)
//   → batch overview table
//   → cached 2 min, busted on any write
// ──────────────────────────────────────────────────────────────
router.get("/dashboard", getDashboard);

// ──────────────────────────────────────────────────────────────
// Students
// POST   /professor/students         body: { fullName, email, password, studentCode, batchId, paymentStatus? }
// GET    /professor/students         list all students with their enrollments
// PATCH  /professor/students/:id     body: { fullName?, email?, status? }
// DELETE /professor/students/:id
// ──────────────────────────────────────────────────────────────
router.route("/students").post(createStudent).get(getStudents);

router.route("/students/:id").patch(updateStudent).delete(deleteStudent);

// ──────────────────────────────────────────────────────────────
// Enrollments
// GET   /professor/enrollments       all enrollments across all batches
// PATCH /professor/enrollments/:id   body: { paymentStatus: "paid" | "unpaid" }
// ──────────────────────────────────────────────────────────────
router.route("/enrollments").get(getEnrollments);

router.route("/enrollments/:id").patch(updateEnrollment);

// ──────────────────────────────────────────────────────────────
// Batches
// POST   /professor/batches          body: { name, description? }
// GET    /professor/batches          list with subject count + enrollment count
// GET    /professor/batches/:id      detail: batch + subjects tree
// PATCH  /professor/batches/:id      body: { name?, description?, isActive? }
// DELETE /professor/batches/:id      cascades: subjects → topics → lectures → content
// ──────────────────────────────────────────────────────────────
router.route("/batches").post(createBatch).get(getBatches);

router
  .route("/batches/:id")
  .get(getBatchDetail)
  .patch(updateBatch)
  .delete(deleteBatch);

// ──────────────────────────────────────────────────────────────
// Subjects
// POST   /professor/batches/:batchId/subjects   body: { name, description?, order? }
// GET    /professor/subjects/:id                detail: subject + topics list
// PATCH  /professor/subjects/:id                body: { name?, description?, order? }
// DELETE /professor/subjects/:id                cascades: topics → lectures → content
// ──────────────────────────────────────────────────────────────
router.post("/batches/:batchId/subjects", createSubject);

router
  .route("/subjects/:id")
  .get(getSubjectDetail)
  .patch(updateSubject)
  .delete(deleteSubject);

// ──────────────────────────────────────────────────────────────
// Topics
// POST   /professor/subjects/:subjectId/topics  body: { name, description?, order? }
// GET    /professor/topics/:id                  detail: topic + lectures list
// PATCH  /professor/topics/:id                  body: { name?, description?, order? }
// DELETE /professor/topics/:id                  cascades: lectures → content
// ──────────────────────────────────────────────────────────────
router.post("/subjects/:subjectId/topics", createTopic);

router
  .route("/topics/:id")
  .get(getTopicDetail)
  .patch(updateTopic)
  .delete(deleteTopic);

// ──────────────────────────────────────────────────────────────
// Lectures
// POST   /professor/topics/:topicId/lectures    body: { title, description?, order?, isFree? }
// GET    /professor/lectures/:id                detail: lecture + full breadcrumb + content items
// PATCH  /professor/lectures/:id                body: { title?, description?, order?, isFree? }
// DELETE /professor/lectures/:id                cascades: content items
// ──────────────────────────────────────────────────────────────
router.post("/topics/:topicId/lectures", createLecture);

router
  .route("/lectures/:id")
  .get(getLectureDetail)
  .patch(updateLecture)
  .delete(deleteLecture);

// ──────────────────────────────────────────────────────────────
// Lecture Content
// POST   /professor/lectures/:lectureId/contents  body: { type, url, label?, order? }
//   type: "video" | "pdf" | "document" | "link"
// PATCH  /professor/contents/:id                  body: { type?, url?, label?, order? }
// DELETE /professor/contents/:id
// ──────────────────────────────────────────────────────────────
router.post("/lectures/:lectureId/contents", createLectureContent);

router
  .route("/contents/:id")
  .patch(updateLectureContent)
  .delete(deleteLectureContent);

export { router as professorRoutes };
