import { z } from 'zod';

export const EmployeeSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  startDate: z.string().optional(),
});

export type EmployeeInput = z.infer<typeof EmployeeSchema>;
