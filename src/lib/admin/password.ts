import { z } from "zod";

export const newPassword = z.string().min(12).max(128)
  .regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9]/);

export const passwordFields = z.object({
  password: newPassword,
  confirmation: z.string(),
}).refine(input => input.password === input.confirmation);
