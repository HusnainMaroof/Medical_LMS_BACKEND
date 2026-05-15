// from src/utils/helper.ts

import bcrypt from "bcrypt";
import otpGenerator from "otp-generator";
import { prisma } from "../config/prisma.js";

export const hashValueHelper = async (value: string): Promise<string> => {
  return await bcrypt.hash(value, 12);
};

export const generateOtpHelper = (): string => {
  return otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
};



export const generateStudentCode = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.student.count();
  const serial = String(count + 1).padStart(4, "0");
  return `MED-${year}-${serial}`;
};