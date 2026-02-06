import { randomUUID } from 'node:crypto';

/**
 * Enterprise Crypto Utilities
 * Provides a standardized way to generate unique identifiers.
 */
export const uuid = (): string => randomUUID();
