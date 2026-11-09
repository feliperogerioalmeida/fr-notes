import { z } from "zod";

export const TemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  instructions: z.string().min(1),
  isBuiltIn: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type Template = z.infer<typeof TemplateSchema>;

export const TemplateInputSchema = TemplateSchema.pick({
  name: true,
  description: true,
  instructions: true,
});

export type TemplateInput = z.infer<typeof TemplateInputSchema>;
