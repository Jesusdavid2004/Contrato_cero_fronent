import { z } from 'zod';

export const contractSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  file_name: z.string(),
  status: z.string(),
  global_risk_score: z.number(),
  uploaded_at: z.string(),
});

export type ContractSummary = z.infer<typeof contractSummarySchema>;

export const contractSummaryListSchema = z.array(contractSummarySchema);
