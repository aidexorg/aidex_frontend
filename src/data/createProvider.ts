import { getApiBaseUrl } from './apiConfig';
import { HttpDataProvider } from './httpProvider';
import type { DataProvider } from './types';

/** All domain persistence goes through the REST API (SUR-02). */
export function createDataProvider(): DataProvider {
  return new HttpDataProvider(getApiBaseUrl());
}
