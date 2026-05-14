// from src/utils/helper.ts

import bcrypt from "bcrypt";
import otpGenerator from "otp-generator";

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