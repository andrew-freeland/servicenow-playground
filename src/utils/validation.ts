/**
 * Validation schemas using Zod
 */

import { z } from 'zod';

/**
 * Incident creation input schema
 */
export const IncidentCreateSchema = z.object({
  product: z.string().min(1).describe('Product or integration name'),
  short_description: z.string().min(1).describe('Short description of the issue'),
  description: z.string().optional().describe('Detailed description'),
  priority: z.string().optional().describe('Priority (1-5)'),
  impact: z.string().optional().describe('Impact (1-3)'),
  urgency: z.string().optional().describe('Urgency (1-3)'),
});

export type IncidentCreate = z.infer<typeof IncidentCreateSchema>;

/**
 * KB suggestion request schema
 */
export const SuggestRequestSchema = z.object({
  sys_id: z.string().min(1).describe('Incident sys_id'),
});

export type SuggestRequest = z.infer<typeof SuggestRequestSchema>;

/**
 * Incident resolution request schema
 */
export const ResolveRequestSchema = z.object({
  sys_id: z.string().min(1).describe('Incident sys_id'),
  resolution_note: z.string().min(1).describe('Resolution notes'),
});

export type ResolveRequest = z.infer<typeof ResolveRequestSchema>;

/**
 * List incidents query parameters
 */
export const ListIncidentsQuerySchema = z.object({
  state: z.string().optional().default('open').describe('Incident state filter'),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20).pipe(z.number().int().positive().max(10000)),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0).pipe(z.number().int().nonnegative()),
});

export type ListIncidentsQuery = z.infer<typeof ListIncidentsQuerySchema>;

