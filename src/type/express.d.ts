import "express-session";

declare module "express-session" {
  interface SessionData {
    id?: string;
    userId: string;
    email: string;
    role: "professor" | "student";
    fullName: string;

    // Student-only — always undefined for professor
    studentCode?: string;
    batchId?: string;
    paymentStatus?: "paid" | "unpaid";
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId?: string;
        id?: string;
        email: string;
        role: "professor" | "student";
        fullName: string;

        // Student-only
        studentCode?: string;
        batchId?: string;
        paymentStatus?: "paid" | "unpaid";
      };
    }
  }
}