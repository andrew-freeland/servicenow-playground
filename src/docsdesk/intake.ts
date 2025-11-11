/**
 * Incident intake module
 * Handles creation and listing of incidents
 */

import { servicenowClient } from '../clients/servicenow';
import { logger } from '../utils/logger';
import { IncidentCreate, ListIncidentsQuery } from '../utils/validation';

export interface Incident {
  sys_id: string;
  number?: string;
  short_description: string;
  description?: string;
  state: string;
  priority?: string;
  impact?: string;
  urgency?: string;
  category?: string;
  x_cursor_suggested?: boolean;
}

/**
 * Create a new incident
 */
export async function createIncident(payload: IncidentCreate): Promise<Incident> {
  logger.info('Creating incident', { product: payload.product, short_description: payload.short_description });

  try {
    const result = await servicenowClient.create<Incident>('incident', {
      short_description: payload.short_description,
      description: payload.description,
      priority: payload.priority,
      impact: payload.impact,
      urgency: payload.urgency,
      category: payload.product,
    });

    logger.info('Incident created', { sys_id: result.result.sys_id, number: result.result.number });
    return result.result;
  } catch (error) {
    logger.error('Failed to create incident', { error });
    throw error;
  }
}

/**
 * List incidents with filtering and pagination
 */
export async function listIncidents(query: ListIncidentsQuery = { state: 'open', limit: 20, offset: 0 }): Promise<{
  incidents: Incident[];
  total?: number;
}> {
  logger.info('Listing incidents', { query });

  try {
    // Build query string
    let sysparmQuery = '';
    if (query.state === 'open') {
      sysparmQuery = 'state<6'; // States 1-5 are open/in-progress
    } else if (query.state === 'resolved') {
      sysparmQuery = 'state=6'; // State 6 is resolved
    } else if (query.state) {
      sysparmQuery = `state=${query.state}`;
    }

    const result = await servicenowClient.getTable<Incident>('incident', {
      sysparm_query: sysparmQuery,
      sysparm_fields: 'sys_id,number,short_description,description,state,priority,impact,urgency,category,x_cursor_suggested',
      sysparm_limit: query.limit,
      sysparm_offset: query.offset,
    });

    logger.info(`Retrieved ${result.result.length} incidents`);
    return {
      incidents: result.result,
    };
  } catch (error) {
    logger.error('Failed to list incidents', { error });
    throw error;
  }
}

