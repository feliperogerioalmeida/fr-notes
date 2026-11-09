import { z } from "zod";

export const FolderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type Folder = z.infer<typeof FolderSchema>;
