/**
 * KB (Knowledge Base) suggestions module
 * Provides article suggestions based on incident description
 */

import { servicenowClient } from '../clients/servicenow';
import { logger } from '../utils/logger';

export interface KBArticle {
  sys_id: string;
  number?: string;
  short_description: string;
  text?: string;
}

/**
 * Extract keywords from text (simple tokenization)
 */
function extractKeywords(text: string): string[] {
  // Simple keyword extraction: split by whitespace, filter short words, remove duplicates
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.replace(/[^\w]/g, ''))
    .filter(word => word.length > 3) // Filter out short words
    .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'way', 'use', 'her', 'she', 'him', 'his', 'its', 'our', 'your', 'their'].includes(word));

  // Return unique keywords
  return Array.from(new Set(words));
}

/**
 * Build ServiceNow query for KB articles
 */
function buildKBQuery(keywords: string[]): string {
  if (keywords.length === 0) {
    return '';
  }

  // Build OR query: short_descriptionLIKEkeyword^ORtextLIKEkeyword
  const conditions = keywords
    .slice(0, 5) // Limit to 5 keywords to avoid query length issues
    .map(keyword => `short_descriptionLIKE${keyword}^ORtextLIKE${keyword}`)
    .join('^OR');

  return conditions;
}

/**
 * Suggest KB articles for an incident
 */
export async function suggestArticles(incidentSysId: string): Promise<KBArticle[]> {
  logger.info('Suggesting KB articles', { incidentSysId });

  try {
    // Get incident details
    const incidentResult = await servicenowClient.getTable<{
      sys_id: string;
      short_description: string;
      description?: string;
    }>('incident', {
      sysparm_query: `sys_id=${incidentSysId}`,
      sysparm_fields: 'sys_id,short_description,description',
      sysparm_limit: 1,
    });

    if (incidentResult.result.length === 0) {
      logger.warn('Incident not found', { incidentSysId });
      return [];
    }

    const incident = incidentResult.result[0];
    const searchText = `${incident.short_description} ${incident.description || ''}`.trim();

    if (!searchText) {
      logger.warn('No search text available for incident', { incidentSysId });
      return [];
    }

    // Extract keywords
    const keywords = extractKeywords(searchText);
    logger.debug('Extracted keywords', { keywords });

    if (keywords.length === 0) {
      logger.warn('No keywords extracted', { incidentSysId });
      return [];
    }

    // Build query
    const query = buildKBQuery(keywords);
    if (!query) {
      return [];
    }

    // Query KB articles
    const kbResult = await servicenowClient.getTable<KBArticle>('kb_knowledge', {
      sysparm_query: `active=true^${query}`,
      sysparm_fields: 'sys_id,number,short_description',
      sysparm_limit: 3,
    });

    // Mark incident as having suggestions using work_notes
    // First, get current work_notes to append (not overwrite)
    try {
      const currentIncident = await servicenowClient.getTable<{
        sys_id: string;
        work_notes?: string;
        u_cursor_suggested?: boolean;
      }>('incident', {
        sysparm_query: `sys_id=${incidentSysId}`,
        sysparm_fields: 'sys_id,work_notes,u_cursor_suggested',
        sysparm_limit: 1,
      });

      if (currentIncident.result.length > 0) {
        const incident = currentIncident.result[0];
        const marker = '[cursor_suggested]';
        
        // Try custom field first if it exists, otherwise use work_notes
        if (incident.u_cursor_suggested !== undefined) {
          await servicenowClient.patch('incident', incidentSysId, {
            u_cursor_suggested: true,
          });
          logger.debug('Marked incident as suggested (custom field)', { incidentSysId });
        } else {
          // Fallback to work_notes marker
          const existingNotes = incident.work_notes || '';
          const updatedNotes = existingNotes.includes(marker)
            ? existingNotes
            : `${existingNotes}\n${marker}`.trim();
          
          await servicenowClient.patch('incident', incidentSysId, {
            work_notes: updatedNotes,
          });
          logger.debug('Marked incident as suggested (work_notes)', { incidentSysId });
        }
      }
    } catch (error) {
      logger.warn('Failed to mark incident as suggested', { incidentSysId, error });
      // Don't fail the whole operation if this fails
    }

    logger.info(`Found ${kbResult.result.length} KB articles`, { incidentSysId });
    return kbResult.result;
  } catch (error) {
    logger.error('Failed to suggest KB articles', { incidentSysId, error });
    throw error;
  }
}

