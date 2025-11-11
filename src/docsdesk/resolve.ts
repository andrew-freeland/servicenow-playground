/**
 * Incident resolution module
 * Handles closing and resolving incidents
 */

import { servicenowClient } from '../clients/servicenow';
import { logger } from '../utils/logger';

export interface ResolvedIncident {
  sys_id: string;
  number?: string;
  state: string;
  resolution_code?: string;
  resolution_notes?: string;
  resolved_at?: string;
}

/**
 * Resolve an incident
 */
export async function resolveIncident(
  incidentSysId: string,
  resolutionNote: string
): Promise<ResolvedIncident> {
  logger.info('Resolving incident', { incidentSysId });

  try {
    const result = await servicenowClient.patch<ResolvedIncident>('incident', incidentSysId, {
      state: '6', // Resolved
      close_code: 'Solved (Permanently)', // Standard close code
      close_notes: resolutionNote, // Use close_notes instead of resolution_notes
      resolved_at: new Date().toISOString(),
    });

    logger.info('Incident resolved', {
      sys_id: result.result.sys_id,
      number: result.result.number,
    });

    return result.result;
  } catch (error) {
    logger.error('Failed to resolve incident', { incidentSysId, error });
    throw error;
  }
}

