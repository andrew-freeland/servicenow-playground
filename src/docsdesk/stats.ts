/**
 * Statistics module
 * Provides metrics and reporting for the help desk
 */

import { servicenowClient } from '../clients/servicenow';
import { logger } from '../utils/logger';

export interface HelpDeskStats {
  counts: {
    open: number;
    inProgress: number;
    resolved: number;
    total: number;
  };
  deflection: {
    totalIncidents: number;
    suggestedIncidents: number;
    resolvedAfterSuggestion: number;
    deflectionRate: number; // percentage
  };
}

/**
 * Get help desk statistics
 */
export async function getStats(): Promise<HelpDeskStats> {
  logger.info('Calculating help desk statistics');

  try {
    // Get all incidents for counting
    const allIncidents = await servicenowClient.getTable<{
      sys_id: string;
      state: string;
      work_notes?: string;
      u_cursor_suggested?: boolean;
    }>('incident', {
      sysparm_fields: 'sys_id,state,work_notes,u_cursor_suggested',
      sysparm_limit: 10000, // Max allowed
    });

    // Count by state
    const open = allIncidents.result.filter(inc => parseInt(inc.state) < 2).length;
    const inProgress = allIncidents.result.filter(inc => parseInt(inc.state) >= 2 && parseInt(inc.state) < 6).length;
    const resolved = allIncidents.result.filter(inc => parseInt(inc.state) === 6).length;
    const total = allIncidents.result.length;

    // Calculate deflection metrics
    // Check for custom field first, then fallback to work_notes marker
    const marker = '[cursor_suggested]';
    const suggestedIncidents = allIncidents.result.filter(inc => {
      if (inc.u_cursor_suggested === true) return true;
      if (inc.work_notes && inc.work_notes.includes(marker)) return true;
      return false;
    }).length;
    
    // Only count resolved incidents that were suggested (deflected)
    const resolvedAfterSuggestion = allIncidents.result.filter(inc => {
      const isResolved = parseInt(inc.state) === 6;
      if (!isResolved) return false;
      
      // Must have been suggested before resolution
      if (inc.u_cursor_suggested === true) return true;
      if (inc.work_notes && inc.work_notes.includes(marker)) return true;
      return false;
    }).length;

    const deflectionRate = total > 0 ? (resolvedAfterSuggestion / total) * 100 : 0;

    const stats: HelpDeskStats = {
      counts: {
        open,
        inProgress,
        resolved,
        total,
      },
      deflection: {
        totalIncidents: total,
        suggestedIncidents,
        resolvedAfterSuggestion,
        deflectionRate: Math.round(deflectionRate * 100) / 100, // Round to 2 decimal places
      },
    };

    logger.info('Statistics calculated', stats);
    return stats;
  } catch (error) {
    logger.error('Failed to calculate statistics', { error });
    throw error;
  }
}

