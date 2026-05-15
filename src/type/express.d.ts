// No express-session augmentation needed anymore.
// req.user is populated by protectRoute after JWT verification.

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;   // always present after protectRoute — no optional
        id: string;       // alias kept for backward compat with professor controller
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

export {};