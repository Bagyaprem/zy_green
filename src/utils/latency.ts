import { appConfig } from '@/config/config';

/** Simulates network latency for mock service calls. */
export function wait(ms: number = appConfig.mockLatency.normal): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
