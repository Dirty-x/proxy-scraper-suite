import type { Awaitable, CheerioCrawlingContext } from 'crawlee';
import type { Proxy } from './proxy.js';

// Define local allowed methods for platform independence
export type AllowedHttpMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type AgentOptions = {
    headers?: Record<string, string>;
    method?: AllowedHttpMethods;
    label?: string;
};

export type Controller = (context: CheerioCrawlingContext) => Awaitable<Proxy[]>;

export type Agent = {
    url: string;
    controller: Controller;
    options: AgentOptions;
};

export type GenerateAgent = (url: string, controller: Controller, options?: AgentOptions) => Agent;
