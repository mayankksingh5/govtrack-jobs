import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

let client;
let recommendationClient;

export function getDb() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    const error = new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured');
    error.status = 500;
    error.code = 'CONFIGURATION_ERROR';
    throw error;
  }

  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function getRecommendationDb() {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    const error = new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured');
    error.status = 500;
    error.code = 'RECOMMENDATION_CONFIGURATION_ERROR';
    throw error;
  }

  if (!recommendationClient) {
    recommendationClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return recommendationClient;
}
