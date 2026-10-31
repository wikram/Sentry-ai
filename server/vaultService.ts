import fs from 'fs';
import path from 'path';

const SETTINGS_PATH = path.join(process.cwd(), 'logs', 'vault_settings.json');
const REQUEST_TIMEOUT_MS = 5000;
const DEFAULT_MOUNT = 'secret';
const DEFAULT_PATH_PREFIX = 'devops-studio';
const ENVIRONMENTS = ['production', 'staging', 'development'];
// Keeps user input from walking out of the KV path, e.g. ../../sys/seal
const PATH_SEGMENT = /^[A-Za-z0-9_.-]+$/;

interface VaultSettings {
  address: string;
  token: string;
  mount: string;
  pathPrefix: string;
  namespace: string;
}

// Errors with a message that is safe and useful to show to the user
export class VaultError extends Error {}

function readSavedSettings(): Partial<VaultSettings> {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading Vault settings:', err);
  }
  return {};
}

function loadSettings(): VaultSettings {
  const saved = readSavedSettings();
  return {
    address: saved.address || process.env.VAULT_ADDR || '',
    token: saved.token || process.env.VAULT_TOKEN || '',
    mount: saved.mount || DEFAULT_MOUNT,
    pathPrefix: saved.pathPrefix ?? DEFAULT_PATH_PREFIX,
    namespace: saved.namespace || process.env.VAULT_NAMESPACE || ''
  };
}

function parseAddress(address: unknown): string {
  let parsed: URL;
  try {
    parsed = new URL(String(address || '').trim());
  } catch {
    throw new VaultError('Enter a valid Vault address, e.g. https://vault.internal:8200');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new VaultError('Vault address must use http or https');
  }
  return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
}

function parseKvPath(value: string, label: string): string {
  const segments = value.split('/').filter(Boolean);
  if (segments.some(segment => !PATH_SEGMENT.test(segment) || /^\.+$/.test(segment))) {
    throw new VaultError(`${label} can only contain letters, numbers, and . _ - characters`);
  }
  return segments.join('/');
}

function secretPath(settings: VaultSettings, environment: string, key = ''): string {
  return [settings.pathPrefix, environment, key].filter(Boolean).join('/');
}

function headers(settings: VaultSettings): Record<string, string> {
  return {
    'X-Vault-Token': settings.token,
    ...(settings.namespace ? { 'X-Vault-Namespace': settings.namespace } : {})
  };
}

// Returns null for 404, which is also how Vault reports an empty listing
async function vaultRequest(settings: VaultSettings, method: string, apiPath: string, body?: unknown): Promise<any> {
  let response: Response;
  try {
    response = await fetch(`${settings.address}/v1/${apiPath}`, {
      method,
      headers: { ...headers(settings), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch {
    throw new VaultError(`Could not reach Vault at ${settings.address}.`);
  }

  if (response.status === 404) return null;
  if (response.status === 204) return {};
  const data: any = await response.json().catch(() => ({}));
  if (response.ok) return data;
  if (response.status === 403) {
    throw new VaultError('The Vault token is invalid or does not have permission for this operation.');
  }
  throw new VaultError(data.errors?.[0] || `Vault responded with status ${response.status}.`);
}

async function checkConnection(settings: VaultSettings): Promise<{ version: string }> {
  // These codes make a standby, sealed or uninitialized node answer 200 so its state can be read
  const health = await vaultRequest(settings, 'GET', 'sys/health?standbyok=true&sealedcode=200&uninitcode=200');
  if (!health?.version) {
    throw new VaultError(`${settings.address} did not respond like a Vault server.`);
  }
  if (!health.initialized) throw new VaultError('Vault is not initialized.');
  if (health.sealed) throw new VaultError('Vault is sealed. Unseal it and try again.');

  await vaultRequest(settings, 'GET', 'auth/token/lookup-self');

  const mount = await vaultRequest(settings, 'GET', `sys/internal/ui/mounts/${settings.mount}`).catch(() => null);
  if (!mount?.data) {
    throw new VaultError(`KV mount "${settings.mount}" was not found, or the token cannot access it.`);
  }
  if (mount.data.type !== 'kv' || mount.data.options?.version !== '2') {
    throw new VaultError(`Mount "${settings.mount}" must be a KV version 2 secrets engine.`);
  }
  return { version: health.version };
}

export function isVaultConfigured(): boolean {
  const { address, token } = loadSettings();
  return Boolean(address && token);
}

// Connection details for the UI. The token is deliberately left out.
export async function getVaultStatus() {
  const settings = loadSettings();
  const { token, ...publicFields } = settings;
  const base = {
    ...publicFields,
    configured: isVaultConfigured(),
    hasToken: Boolean(token),
    tokenFromEnv: Boolean(token && !readSavedSettings().token)
  };
  if (!base.configured) return { ...base, connected: false };
  try {
    return { ...base, ...await checkConnection(settings), connected: true };
  } catch (err) {
    if (err instanceof VaultError) return { ...base, connected: false, error: err.message };
    throw err;
  }
}

// Connects before saving so a bad configuration is reported up front
export async function connectVault(input: { address?: string; token?: string; mount?: string; pathPrefix?: string; namespace?: string }) {
  const current = loadSettings();
  const address = parseAddress(input.address);
  const newToken = String(input.token || '').trim();

  // Otherwise anyone able to reach this API could have the saved token sent to their own server
  if (!newToken && address !== current.address) {
    throw new VaultError('Enter the token for this Vault address.');
  }
  const token = newToken || current.token;
  if (!token) throw new VaultError('Enter a Vault token.');

  const settings: VaultSettings = {
    address,
    token,
    mount: parseKvPath(String(input.mount || DEFAULT_MOUNT), 'KV mount'),
    pathPrefix: parseKvPath(String(input.pathPrefix ?? DEFAULT_PATH_PREFIX), 'Path prefix'),
    namespace: String(input.namespace || '').trim()
  };
  await checkConnection(settings);

  const savedToken = newToken || readSavedSettings().token;
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ ...settings, token: savedToken }, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

export function disconnectVault() {
  fs.rmSync(SETTINGS_PATH, { force: true });
}

// Names and metadata only. Values are never read, so they cannot reach the browser.
export async function listVaultSecrets() {
  if (!isVaultConfigured()) return [];
  const settings = loadSettings();

  const perEnvironment = await Promise.all(ENVIRONMENTS.map(async (environment) => {
    const listing = await vaultRequest(settings, 'GET', `${settings.mount}/metadata/${secretPath(settings, environment)}?list=true`);
    const keys: string[] = (listing?.data?.keys || []).filter((key: string) => !key.endsWith('/'));

    return Promise.all(keys.map(async (key) => {
      const fullPath = secretPath(settings, environment, key);
      const metadata = await vaultRequest(settings, 'GET', `${settings.mount}/metadata/${fullPath}`);
      return {
        id: `sec-vault-${environment}-${key}`,
        key,
        value: '',
        source: 'vault' as const,
        vaultPath: `${settings.mount}/${fullPath}`,
        environment,
        scope: metadata?.data?.custom_metadata?.scope || 'HashiCorp Vault Secret',
        lastRotated: String(metadata?.data?.updated_time || '').split('T')[0],
        expiresInDays: 0,
        status: 'valid' as const
      };
    }));
  }));
  return perEnvironment.flat();
}

// Writing to an existing key creates a new version, which Vault keeps for rollback
export async function storeVaultSecret(key: string, value: string, environment = 'production', scope = 'Application Secret') {
  if (!ENVIRONMENTS.includes(environment)) {
    throw new VaultError(`Unknown environment "${environment}".`);
  }
  const settings = loadSettings();
  const fullPath = secretPath(settings, environment, parseKvPath(key, 'Secret name'));
  await vaultRequest(settings, 'POST', `${settings.mount}/data/${fullPath}`, { data: { value } });
  await vaultRequest(settings, 'POST', `${settings.mount}/metadata/${fullPath}`, { custom_metadata: { scope } });
}
