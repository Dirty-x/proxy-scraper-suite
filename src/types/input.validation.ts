import { z } from 'zod';

/**
 * Input validation schema using Zod
 * Ensures all user inputs are properly validated before processing
 */
export const InputSchema = z.object({
    proxy: z.object({
        useCloudProxy: z.boolean().optional().default(false),
        cloudProxyGroups: z.array(z.string()).optional(),
        proxyUrls: z.array(z.string().url()).optional(),
    }).optional(),
    runTests: z.boolean().default(true),
    debug: z.boolean().default(false),
    kvStoreName: z.string()
        .min(1, 'Store name must not be empty')
        .max(100, 'Store name must be less than 100 characters')
        .regex(/^[a-zA-Z0-9-_]+$/, 'Store name must contain only alphanumeric characters, hyphens, and underscores')
        .default('default'),
});

export type InputSchema = z.infer<typeof InputSchema>;

/**
 * Validates and parses input data
 * @param input - Raw input data
 * @returns Validated and typed input
 * @throws ZodError if validation fails
 */
export function validateInput(input: unknown): InputSchema {
    return InputSchema.parse(input);
}
