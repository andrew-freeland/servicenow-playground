import { z } from 'zod';

const envSchema = z.object({
  SERVICE_NOW_INSTANCE: z.string().url().describe('ServiceNow instance URL (e.g., https://dev12345.service-now.com)'),
  SERVICE_NOW_USER: z.string().min(1).describe('ServiceNow username'),
  SERVICE_NOW_PASSWORD: z.string().min(1).describe('ServiceNow password'),
  
  // Optional auth methods (not used unless selected)
  SERVICE_NOW_CLIENT_ID: z.string().optional().describe('OAuth client ID'),
  SERVICE_NOW_CLIENT_SECRET: z.string().optional().describe('OAuth client secret'),
  SERVICE_NOW_API_KEY: z.string().optional().describe('API key for token auth'),
  
  // Server config
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Auth mode selection
  AUTH_MODE: z.enum(['basic', 'oauth', 'apiKey']).default('basic'),
});

export type Config = z.infer<typeof envSchema>;

function loadConfig(): Config {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
      console.error('❌ Invalid environment configuration:\n', missing);
      console.error('\nRequired variables:');
      console.error('  SERVICE_NOW_INSTANCE - ServiceNow instance URL');
      console.error('  SERVICE_NOW_USER - ServiceNow username');
      console.error('  SERVICE_NOW_PASSWORD - ServiceNow password');
      process.exit(1);
    }
    throw error;
  }
}

export const config = loadConfig();

