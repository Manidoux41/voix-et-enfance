import { z } from "zod";
export const signatorySchema = z.object({
  organizationName: z.string().trim().min(2).max(200),
  organizationType: z.enum(["Association", "Collectif", "Organisation", "Autre"]),
  representativeName: z.string().trim().min(2).max(160),
  representativeRole: z.string().trim().min(2).max(120),
  email: z.string().email().max(254),
  phone: z.string().max(40).optional().default(""),
  address: z.string().max(300).optional().default(""),
  website: z.string().url().optional().or(z.literal("")).default(""),
  hasReadDocument: z.literal(true),
  confirmsAuthority: z.literal(true),
  confirmsSupport: z.literal(true)
});
