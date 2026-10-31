import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const PROVIDERS_PATH = path.join(process.cwd(), 'logs', 'local_model_providers.json');
const MODEL_ID_PREFIX = 'local/';
const LIST_TIMEOUT_MS = 3000;
// Local inference can be far slower than a hosted API, especially on CPU or on a cold model load
const CHAT_TIMEOUT_MS = 5 * 60 * 1000;
// Ollama silently truncates prompts beyond num_ctx, so it must fit the 20k character log window
const OLLAMA_NUM_CTX = 16384;

export type LocalProviderType = 'ollama' | 'openai' | 'custom';

export interface LocalProvider {
  id: string;
  name: string;
  type: LocalProviderType;
  baseUrl: string;
  apiKey?: string;
  // Names entered by hand, for servers that cannot list their models
  models?: string[];
  // Custom endpoints only: JSON body with {{model}} and {{prompt}} placeholders
  requestTemplate?: string;
  // Custom endpoints only: dotted path to the reply text, e.g. results.0.text
  responsePath?: string;
}

// Errors with a message that is safe and useful to show to the user
export class LocalModelError extends Error {}
class EndpointUnreachableError extends LocalModelError {}

function loadProviders(): LocalProvider[] {
  try {
    if (fs.existsSync(PROVIDERS_PATH)) {
      return JSON.parse(fs.readFileSync(PROVIDERS_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading local model providers:', err);
  }
  return [];
}

function saveProviders(providers: LocalProvider[]) {
  fs.mkdirSync(path.dirname(PROVIDERS_PATH), { recursive: true });
  fs.writeFileSync(PROVIDERS_PATH, JSON.stringify(providers, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

function parseEndpointUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(String(url || '').trim());
  } catch {
    throw new LocalModelError('Enter a valid URL, e.g. http://192.168.0.50:11434');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new LocalModelError('Endpoint URL must use http or https');
  }
  return parsed;
}

function normalizeBaseUrl(baseUrl: string): string {
  const parsed = parseEndpointUrl(baseUrl);
  return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '').replace(/\/v1$/, '');
}

function parseModelNames(models: unknown): string[] {
  const names = Array.isArray(models) ? models : String(models || '').split(/[,\n]/);
  return [...new Set(names.map(name => String(name).trim()).filter(Boolean))];
}

function authHeaders(provider: LocalProvider): Record<string, string> {
  return provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {};
}

async function fetchProviderModelNames(provider: LocalProvider): Promise<string[]> {
  const url = provider.type === 'ollama' ? `${provider.baseUrl}/api/tags` : `${provider.baseUrl}/v1/models`;
  let response: Response;
  try {
    response = await fetch(url, { headers: authHeaders(provider), signal: AbortSignal.timeout(LIST_TIMEOUT_MS) });
  } catch {
    throw new EndpointUnreachableError(`Could not reach ${provider.baseUrl}. Check the URL and that the server accepts network connections.`);
  }
  if (!response.ok) {
    throw new LocalModelError(`${url} responded with status ${response.status}`);
  }
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new LocalModelError(`${url} did not return JSON. Check the provider type.`);
  }
  const entries = provider.type === 'ollama' ? data?.models : data?.data;
  if (!Array.isArray(entries)) {
    throw new LocalModelError(`${url} returned an unexpected response. Check the provider type.`);
  }
  return entries.map((m: any) => m.name || m.model || m.id).filter(Boolean);
}

async function listModelNames(provider: LocalProvider): Promise<string[]> {
  const manualNames = provider.models || [];
  if (provider.type === 'custom') return manualNames;
  try {
    return [...new Set([...await fetchProviderModelNames(provider), ...manualNames])];
  } catch (err) {
    // A running server with no model listing is still usable through the names entered by hand
    if (manualNames.length > 0 && !(err instanceof EndpointUnreachableError)) return manualNames;
    throw err;
  }
}

function toModelEntry(provider: LocalProvider, modelName: string) {
  return {
    id: `${MODEL_ID_PREFIX}${provider.id}/${modelName}`,
    name: `Local: ${modelName} (${provider.name})`,
    context_length: provider.type === 'ollama' ? OLLAMA_NUM_CTX : undefined,
    pricing: { prompt: '0', completion: '0' }
  };
}

export function isLocalModelId(modelId?: string): boolean {
  return Boolean(modelId && modelId.startsWith(MODEL_ID_PREFIX));
}

// Provider details for the UI. The API key is deliberately left out.
export async function listProviderStatuses() {
  return Promise.all(loadProviders().map(async (provider) => {
    const { apiKey, ...publicFields } = provider;
    // Custom endpoints have no listing call, and probing them would run a generation
    const verified = provider.type !== 'custom';
    try {
      const models = await listModelNames(provider);
      return { ...publicFields, hasApiKey: Boolean(apiKey), verified, online: true, models };
    } catch (err) {
      return { ...publicFields, hasApiKey: Boolean(apiKey), verified, online: false, models: [], error: (err as Error).message };
    }
  }));
}

export async function listLocalModels() {
  const results = await Promise.allSettled(loadProviders().map(async (provider) => {
    const names = await listModelNames(provider);
    return names.map(name => toModelEntry(provider, name));
  }));
  return results.flatMap(result => (result.status === 'fulfilled' ? result.value : []));
}

async function detectProviderType(provider: LocalProvider): Promise<LocalProviderType> {
  for (const type of ['ollama', 'openai'] as const) {
    try {
      await fetchProviderModelNames({ ...provider, type });
      return type;
    } catch (err) {
      if (err instanceof EndpointUnreachableError) throw err;
    }
  }
  if (provider.models?.length) return 'openai';
  throw new LocalModelError(`Could not detect the server type at ${provider.baseUrl}. Enter its model names, or choose Custom HTTP Endpoint if it has its own API.`);
}

function configureCustomProvider(provider: LocalProvider, requestTemplate?: string, responsePath?: string) {
  const parsed = parseEndpointUrl(provider.baseUrl);
  provider.baseUrl = `${parsed.origin}${parsed.pathname}${parsed.search}`;
  const template = String(requestTemplate || '').trim();
  try {
    JSON.parse(template);
  } catch {
    throw new LocalModelError('Request Body must be valid JSON');
  }
  if (!template.includes('{{prompt}}')) {
    throw new LocalModelError('Request Body must include the {{prompt}} placeholder');
  }
  provider.requestTemplate = template;
  provider.responsePath = String(responsePath || '').trim();
  if (!provider.responsePath) {
    throw new LocalModelError('Enter the Response Text Path, e.g. results.0.text');
  }
  if (!provider.models?.length) {
    provider.models = ['default'];
  }
}

// Connects to the endpoint before saving so a bad configuration is reported up front
export async function addProvider(input: {
  name?: string;
  type?: string;
  baseUrl?: string;
  apiKey?: string;
  models?: unknown;
  requestTemplate?: string;
  responsePath?: string;
}) {
  const isCustom = input.type === 'custom';
  const baseUrl = isCustom ? String(input.baseUrl || '').trim() : normalizeBaseUrl(input.baseUrl || '');
  const provider: LocalProvider = {
    id: crypto.randomUUID().slice(0, 8),
    name: String(input.name || '').trim() || parseEndpointUrl(baseUrl).host,
    type: input.type === 'ollama' || input.type === 'openai' || input.type === 'custom' ? input.type : 'ollama',
    baseUrl,
    ...(input.apiKey ? { apiKey: String(input.apiKey) } : {})
  };
  const manualNames = parseModelNames(input.models);
  if (manualNames.length > 0) provider.models = manualNames;

  if (isCustom) {
    configureCustomProvider(provider, input.requestTemplate, input.responsePath);
    await sendCustomRequest(provider, provider.models![0], 'Reply with the word OK.');
  } else if (input.type !== 'ollama' && input.type !== 'openai') {
    provider.type = await detectProviderType(provider);
  }

  const models = await listModelNames(provider);
  saveProviders([...loadProviders(), provider]);
  return { id: provider.id, name: provider.name, type: provider.type, models };
}

export function removeProvider(id: string): boolean {
  const providers = loadProviders();
  const remaining = providers.filter(p => p.id !== id);
  if (remaining.length === providers.length) return false;
  saveProviders(remaining);
  return true;
}

async function postToProvider(provider: LocalProvider, url: string, body: unknown, modelName: string): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(provider) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CHAT_TIMEOUT_MS)
    });
  } catch (err) {
    const timedOut = (err as Error).name === 'TimeoutError';
    throw new LocalModelError(timedOut
      ? `Local model "${modelName}" did not respond within ${CHAT_TIMEOUT_MS / 60000} minutes.`
      : `Could not reach local model server "${provider.name}" at ${provider.baseUrl}.`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Local model API error (${response.status}):`, errorText);
    throw new LocalModelError(`Local model server "${provider.name}" responded with status ${response.status}.`);
  }

  try {
    return await response.json();
  } catch {
    throw new LocalModelError(`Local model server "${provider.name}" did not return JSON.`);
  }
}

// Fills placeholders after parsing, so prompt text cannot break the JSON structure
function renderTemplate(value: any, variables: Record<string, string>): any {
  if (typeof value === 'string') {
    return value.replace(/\{\{(model|prompt)\}\}/g, (_, key) => variables[key]);
  }
  if (Array.isArray(value)) {
    return value.map(item => renderTemplate(item, variables));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, renderTemplate(item, variables)]));
  }
  return value;
}

async function sendCustomRequest(provider: LocalProvider, modelName: string, prompt: string): Promise<string> {
  const body = renderTemplate(JSON.parse(provider.requestTemplate!), { model: modelName, prompt });
  const data = await postToProvider(provider, provider.baseUrl, body, modelName);
  const content = provider.responsePath!.split('.').reduce((current: any, key) => current?.[key], data);
  if (typeof content !== 'string' || !content) {
    const fields = data && typeof data === 'object' ? Object.keys(data).join(', ') : typeof data;
    throw new LocalModelError(`No text found at "${provider.responsePath}". The response has: ${fields}.`);
  }
  return content;
}

export async function chatWithLocalModel(modelId: string, prompt: string): Promise<string> {
  // Model names can themselves contain slashes (e.g. hf.co/org/model:tag)
  const [providerId, ...nameParts] = modelId.slice(MODEL_ID_PREFIX.length).split('/');
  const modelName = nameParts.join('/');
  const provider = loadProviders().find(p => p.id === providerId);
  if (!provider || !modelName) {
    throw new LocalModelError(`Local model "${modelId}" is no longer configured. Select another model.`);
  }

  if (provider.type === 'custom') {
    return sendCustomRequest(provider, modelName, prompt);
  }

  const isOllama = provider.type === 'ollama';
  const url = isOllama ? `${provider.baseUrl}/api/chat` : `${provider.baseUrl}/v1/chat/completions`;
  const messages = [{ role: 'user', content: prompt }];
  const body = isOllama
    ? { model: modelName, messages, stream: false, options: { num_ctx: OLLAMA_NUM_CTX } }
    : { model: modelName, messages };

  const data = await postToProvider(provider, url, body, modelName);
  const content = isOllama ? data.message?.content : data.choices?.[0]?.message?.content;
  if (!content) {
    throw new LocalModelError(`Local model "${modelName}" returned no content.`);
  }
  return content;
}
