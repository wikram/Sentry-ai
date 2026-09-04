/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RCAAgent } from '../types';

export const isTruthy = (val: any): boolean => {
  if (val === true || val === 1) return true;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'primary' || s === 'default' || s === 't';
  }
  return false;
};

export const isExplicitlyFalse = (val: any): boolean => {
  if (val === false || val === 0) return true;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'false' || s === '0' || s === 'no' || s === 'n' || s === 'inactive' || s === 'disabled' || s === 'off' || s === 'f' || s === 'deactivated';
  }
  return false;
};

export const parseIsActive = (val: any, fallback: boolean = true): boolean => {
  if (val === undefined || val === null || val === '') return fallback;
  if (isExplicitlyFalse(val)) return false;
  if (isTruthy(val) || (typeof val === 'string' && (val.trim().toLowerCase() === 'active' || val.trim().toLowerCase() === 'operational' || val.trim().toLowerCase() === 'enabled'))) return true;
  return Boolean(val);
};

export const parseIsPrimary = (val: any): boolean => {
  if (val === undefined || val === null || val === '') return false;
  return isTruthy(val);
};

export const isNotFalse = (val: any): boolean => {
  return parseIsActive(val, true);
};

export const cleanQuote = (val: any): string => {
  if (val === undefined || val === null) return '';
  let s = String(val).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
};

export const splitCsvRow = (row: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if ((char === '"' || char === "'") && (i === 0 || row[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (quoteChar === char) {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

export const parseField = (val: any): string => {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (str.includes('=')) {
    const parts = str.split('=');
    parts.shift();
    let value = parts.join('=').trim();
    return cleanQuote(value);
  }
  return cleanQuote(str);
};

/**
 * Parses raw text/string payloads into an array of agent items or tuples.
 */
export const parseStringPayload = (str: string): any[] => {
  if (!str || typeof str !== 'string') return [];
  const trimmed = str.trim();
  if (!trimmed) return [];

  // 1. Try standard JSON.parse
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed !== 'string') {
      return extractItems(parsed);
    }
  } catch {
    // Not standard JSON
  }

  // 2. Check for Python-like tuple lists or representations: e.g. [('1', 'Agent 1', ...), ('2', 'Agent 2', ...)]
  // Or (id, name, model, url, key, is_primary, is_active)
  // Or Agent(id=1, name='Agent 1', ...)
  const tupleMatches = trimmed.match(/(?:Agent)?\s*\(([^()]+)\)/g);
  if (tupleMatches && tupleMatches.length > 0) {
    const items: any[] = [];
    for (const t of tupleMatches) {
      const inner = t.replace(/^(?:Agent)?\s*\(/, '').replace(/\)\s*$/, '').trim();
      if (!inner) continue;

      if (inner.includes('=')) {
        const obj: Record<string, any> = {};
        const kvRegex = /([a-zA-Z0-9_]+)\s*=\s*(?:(['"])(.*?)\2|([^,]+))/g;
        let kvMatch;
        while ((kvMatch = kvRegex.exec(inner)) !== null) {
          const k = kvMatch[1].trim();
          const v = (kvMatch[3] !== undefined ? kvMatch[3] : (kvMatch[4] || '')).trim();
          obj[k] = cleanQuote(v);
        }
        if (Object.keys(obj).length > 0) {
          items.push(obj);
          continue;
        }
      }

      const parts = splitCsvRow(inner).map(p => cleanQuote(p));
      items.push(parts);
    }
    if (items.length > 0) return items;
  }

  // 3. Check for line-delimited records
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));
  if (lines.length > 1) {
    return lines.map((line, idx) => {
      if (line.includes('=')) {
        const obj: Record<string, any> = {};
        const kvRegex = /([a-zA-Z0-9_]+)\s*=\s*(?:(['"])(.*?)\2|([^,\s;]+))/g;
        let m;
        while ((m = kvRegex.exec(line)) !== null) {
          obj[m[1].trim()] = cleanQuote((m[3] !== undefined ? m[3] : (m[4] || '')).trim());
        }
        if (Object.keys(obj).length > 0) return obj;
      }
      if (line.includes(',')) {
        return splitCsvRow(line).map(cleanQuote);
      }
      if (line.includes('|')) {
        return line.split('|').map(cleanQuote);
      }
      return { id: String(idx + 1), name: line };
    });
  }

  // 4. Multiple agent split by identifier patterns: e.g. agent_id= or id= or Agent N
  const segments = trimmed.split(/(?=(?:agent_id\s*=|id\s*=|Agent\s*\d+:?))/i).map(s => s.trim()).filter(Boolean);
  if (segments.length > 1) {
    return segments.map((seg, idx) => {
      const obj: Record<string, any> = {};
      const kvRegex = /([a-zA-Z0-9_]+)\s*=\s*(?:(['"])(.*?)\2|([^,\s;]+))/g;
      let m;
      while ((m = kvRegex.exec(seg)) !== null) {
        obj[m[1].trim()] = cleanQuote((m[3] !== undefined ? m[3] : (m[4] || '')).trim());
      }
      return Object.keys(obj).length > 0 ? obj : { id: String(idx + 1), name: seg };
    });
  }

  // 5. Single comma-separated or pipe-separated agent line
  if (trimmed.includes(',') || trimmed.includes('|')) {
    const parts = trimmed.includes(',') ? splitCsvRow(trimmed) : trimmed.split('|');
    return [parts.map(cleanQuote)];
  }

  return [{ name: trimmed }];
};

/**
 * Extracts items from arbitrary nested objects, arrays, wrapper keys, and dictionaries.
 */
export const extractItems = (input: any): any[] => {
  if (!input) return [];

  // If input is a raw string
  if (typeof input === 'string') {
    return parseStringPayload(input);
  }

  if (Array.isArray(input)) {
    if (input.length === 0) return [];

    // Array containing 1 string: e.g. [ "[('1', 'Agent 1', ...), ...]" ]
    if (input.length === 1 && typeof input[0] === 'string') {
      return parseStringPayload(input[0]);
    }

    // Single nested array: [[agent1, agent2]] or [[[agent1, agent2]]]
    if (input.length === 1 && Array.isArray(input[0])) {
      return extractItems(input[0]);
    }

    // Array of objects
    if (input.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
      return input;
    }

    // Array of arrays (e.g. tuples)
    if (input.every(item => Array.isArray(item))) {
      return input;
    }

    // Array of strings
    if (input.every(item => typeof item === 'string')) {
      // Check if strings look like serialized tuples or key-value agents
      const hasDelimiters = input.some(str => str.includes(',') || str.includes('=') || str.includes('('));
      if (hasDelimiters) {
        const expanded = input.flatMap(str => parseStringPayload(str));
        if (expanded.length > 0) return expanded;
      }

      // Check if strings are distinct agent names e.g. ["Agent 1", "Agent 2"]
      const looksLikeAgentNames = input.every(str => !str.includes('http') && !str.includes('@') && isNaN(Number(str)));
      if (looksLikeAgentNames && input.length >= 2) {
        return input.map((name, idx) => ({ id: String(idx + 1), name: cleanQuote(name) }));
      }

      // If flat array with >= 8 elements: chunk into 7 or 6
      if (input.length >= 8) {
        const chunkSize = input.length % 7 === 0 ? 7 : (input.length % 6 === 0 ? 6 : (input.length % 8 === 0 ? 8 : 7));
        const chunks: any[] = [];
        for (let i = 0; i < input.length; i += chunkSize) {
          chunks.push(input.slice(i, i + chunkSize));
        }
        return chunks;
      }

      return [input];
    }

    // Mixed flat array with length >= 8
    if (input.length >= 8) {
      const chunkSize = input.length % 7 === 0 ? 7 : (input.length % 6 === 0 ? 6 : 7);
      const chunks: any[] = [];
      for (let i = 0; i < input.length; i += chunkSize) {
        chunks.push(input.slice(i, i + chunkSize));
      }
      return chunks;
    }

    return [input];
  }

  if (typeof input === 'object' && input !== null) {
    // Wrapper keys
    const candidateKeys = ['agents', 'data', 'result', 'records', 'items', 'agent', 'response', 'payload'];
    for (const key of candidateKeys) {
      if (input[key] !== undefined && input[key] !== null) {
        const res = extractItems(input[key]);
        if (res && res.length > 0) return res;
      }
    }

    if (input.configuration?.agents?.agent) {
      return extractItems(input.configuration.agents.agent);
    }

    // SQL Tabular format { columns: [...], rows: [[...], [...]] }
    if (Array.isArray(input.rows)) {
      const cols: string[] = Array.isArray(input.columns) ? input.columns.map((c: any) => String(c).toLowerCase()) : [];
      return input.rows.map((row: any[]) => {
        if (!Array.isArray(row)) return row;
        if (cols.length === 0) return row;
        const obj: Record<string, any> = {};
        cols.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj;
      });
    }

    // Numeric keys { "0": {...}, "1": {...} }
    const keys = Object.keys(input);
    const isNumeric = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
    if (isNumeric) {
      return keys.map(k => input[k]);
    }

    // Single agent object
    if (input.name || input.agent_name || input.id || input.agent_id || input.llm_model || input.model) {
      return [input];
    }

    // Dictionary of agents { "agent_1": {...}, "agent_2": {...} }
    const vals = Object.values(input);
    if (vals.length > 0) {
      return vals.flatMap(v => {
        if (typeof v === 'string') return parseStringPayload(v);
        return [v];
      });
    }
  }

  return [];
};

/**
 * Sanitizes agent name to prevent raw tuple/dump strings from appearing in the UI.
 */
export const sanitizeAgentName = (rawName: any, fallbackId: string): string => {
  let name = String(rawName !== undefined && rawName !== null ? rawName : '').trim();
  if (name.includes('Agent(') || name.includes('agent_name=') || name.includes('name=')) {
    const m = name.match(/(?:agent_)?name\s*=\s*(?:['"]([^'"]+)['"]|([^,)]+))/i);
    if (m) name = (m[1] || m[2]).trim();
  }
  if (name.startsWith('(') && name.endsWith(')')) {
    name = name.slice(1, -1).trim();
  }
  if (name.includes(',')) {
    const parts = splitCsvRow(name).map(cleanQuote);
    if (parts.length >= 2) {
      name = parts[1] || parts[0];
    } else {
      name = parts[0];
    }
  }
  name = cleanQuote(name);
  return name || `Agent ${fallbackId}`;
};

/**
 * Sanitizes agent id to clean identifiers.
 */
export const sanitizeAgentId = (rawId: any, fallbackIdx: number): string => {
  let idStr = String(rawId !== undefined && rawId !== null ? rawId : '').trim();
  if (idStr.includes('Agent(') || idStr.includes('agent_id=') || idStr.includes('id=')) {
    const m = idStr.match(/(?:agent_)?id\s*=\s*(?:['"]([^'"]+)['"]|([^,)]+))/i);
    if (m) idStr = (m[1] || m[2]).trim();
  }
  if (idStr.startsWith('(') && idStr.endsWith(')')) {
    idStr = idStr.slice(1, -1).trim();
  }
  if (idStr.includes(',')) {
    const parts = splitCsvRow(idStr).map(cleanQuote);
    idStr = parts[0] || String(fallbackIdx);
  }
  idStr = cleanQuote(idStr).replace(/^agent-/, '').trim();
  return idStr || String(fallbackIdx);
};

/**
 * Normalizes any backend response into a clean, strongly-typed array of RCAAgent entities.
 */
export const normalizeAgentList = (rawData: any): RCAAgent[] => {
  if (!rawData) return [];

  const rawList = extractItems(rawData);
  if (!rawList || rawList.length === 0) return [];

  const seenIds = new Set<string>();

  const mapped: RCAAgent[] = rawList.map((a: any, idx: number): RCAAgent | null => {
    if (!a) return null;

    if (Array.isArray(a)) {
      // Check if items are key-value formatted strings: ['id=1', 'name=Agent 1', ...]
      if (a.some(item => typeof item === 'string' && item.includes('='))) {
        const obj: Record<string, any> = {};
        for (const item of a) {
          const s = String(item).trim();
          if (s.includes('=')) {
            const parts = s.split('=');
            const k = parts.shift()?.trim() || '';
            const v = parts.join('=').trim();
            obj[k] = cleanQuote(v);
          }
        }
        if (Object.keys(obj).length > 0) {
          a = obj;
        }
      }
    }

    if (Array.isArray(a)) {
      // Positional tuple from database/backend
      const rawIdVal = parseField(a[0]);
      let id = sanitizeAgentId(rawIdVal, idx + 1);
      if (seenIds.has(id)) {
        id = `${id}-${idx + 1}`;
      }
      seenIds.add(id);

      const rawNameVal = parseField(a[1]);
      const name = sanitizeAgentName(rawNameVal, id);

      const modelVal = parseField(a[2]);

      let backendUrl = '';
      let apiKeyVal = '';
      let rawPrimaryVal: any = undefined;
      let rawActiveVal: any = undefined;

      const isFloatTemp = (val: any) => {
        if (val === undefined || val === null) return false;
        const s = String(val).trim();
        const n = Number(s);
        return !isNaN(n) && (s.includes('.') || s === '0' || s === '1' || s === '2') && n >= 0 && n <= 2.0;
      };

      if (a.length >= 8) {
        // Schema: [id, name, llm_model, temperature, conn_url, api_key, is_primary, is_active]
        const rawUrl = parseField(a[4]);
        backendUrl = (rawUrl && !isFloatTemp(rawUrl)) ? rawUrl : '';
        apiKeyVal = parseField(a[5]);
        rawPrimaryVal = a[6];
        rawActiveVal = a[7];
      } else if (a.length === 7) {
        if (isFloatTemp(a[3])) {
          // Schema: [id, name, llm_model, temperature, conn_url, is_primary, is_active]
          const rawUrl = parseField(a[4]);
          backendUrl = (rawUrl && !isFloatTemp(rawUrl)) ? rawUrl : '';
          rawPrimaryVal = a[5];
          rawActiveVal = a[6];
        } else {
          // Schema: [id, name, llm_model, conn_url, api_key, is_primary, is_active]
          const rawUrl = parseField(a[3]);
          backendUrl = (rawUrl && !isFloatTemp(rawUrl)) ? rawUrl : '';
          apiKeyVal = parseField(a[4]);
          rawPrimaryVal = a[5];
          rawActiveVal = a[6];
        }
      } else if (a.length === 6) {
        // Schema: [id, name, llm_model, conn_url, is_primary, is_active]
        const rawUrl = parseField(a[3]);
        backendUrl = (rawUrl && !isFloatTemp(rawUrl)) ? rawUrl : '';
        rawPrimaryVal = a[4];
        rawActiveVal = a[5];
      } else if (a.length === 5) {
        const rawUrl = parseField(a[3]);
        backendUrl = (rawUrl && !isFloatTemp(rawUrl)) ? rawUrl : '';
        rawActiveVal = a[4];
      } else {
        const rawUrl = a[3] ? parseField(a[3]) : '';
        backendUrl = (rawUrl && !isFloatTemp(rawUrl)) ? rawUrl : '';
      }

      const isPrimary = parseIsPrimary(rawPrimaryVal);
      const isActive = parseIsActive(rawActiveVal, false);

      return {
        id,
        name,
        status: isActive ? 'idle' : 'complete',
        isActive,
        backendUrl,
        model: modelVal || '',
        apiKey: apiKeyVal || '',
        isDefault: isPrimary,
        is_primary: isPrimary,
        findings: []
      };
    } else if (typeof a === 'object') {
      const rawId = a.id !== undefined && a.id !== null ? a.id :
                    (a.agent_id !== undefined && a.agent_id !== null ? a.agent_id :
                    (a.agentId !== undefined && a.agentId !== null ? a.agentId :
                    (a._id !== undefined && a._id !== null ? a._id : '')));
      let strId = sanitizeAgentId(rawId, idx + 1);
      if (seenIds.has(strId)) {
        strId = `${strId}-${idx + 1}`;
      }
      seenIds.add(strId);

      const rawName = a.name || a.agent_name || a.agentName || a.title;
      const name = sanitizeAgentName(rawName, strId);

      const model = cleanQuote(String(a.llm_model || a.model || a.llmModel || a.engine_llm_model || '').trim());
      const rawBackendUrl = cleanQuote(String(a.conn_url || a.backendUrl || a.backend_url || a.connUrl || a.url || '').trim());
      const backendUrl = (rawBackendUrl && rawBackendUrl !== '0.2' && isNaN(Number(rawBackendUrl))) ? rawBackendUrl : '';
      const apiKey = cleanQuote(String(a.api_key || a.apiKey || a.key || '').trim());

      const rawPrimary = a.is_primary !== undefined ? a.is_primary :
                         (a.isPrimary !== undefined ? a.isPrimary :
                         (a.is_default !== undefined ? a.is_default :
                         (a.isDefault !== undefined ? a.isDefault :
                         (a.primary !== undefined ? a.primary :
                         (a.default !== undefined ? a.default : undefined)))));
      const isPrimary = parseIsPrimary(rawPrimary);

      const rawActive = a.is_active !== undefined ? a.is_active :
                        (a.isActive !== undefined ? a.isActive :
                        (a.active !== undefined ? a.active :
                        (a.is_enabled !== undefined ? a.is_enabled :
                        (a.enabled !== undefined ? a.enabled : undefined))));
      let isActive = false;
      if (rawActive !== undefined && rawActive !== null && rawActive !== '') {
        isActive = parseIsActive(rawActive, false);
      } else if (a.status) {
        const s = String(a.status).trim().toLowerCase();
        isActive = s !== 'inactive' && s !== 'deactivated' && s !== 'disabled' && s !== 'stopped' && s !== 'complete';
      } else {
        // Only if neither is_active nor status is provided at all
        isActive = true;
      }

      const findings = Array.isArray(a.findings) ? a.findings : (Array.isArray(a.findings?.finding) ? a.findings.finding : []);

      return {
        id: strId,
        name,
        status: a.status || (isActive ? 'idle' : 'complete'),
        isActive,
        backendUrl,
        model,
        apiKey,
        isDefault: isPrimary,
        is_primary: isPrimary,
        findings
      };
    } else if (typeof a === 'string') {
      let id = String(idx + 1);
      if (seenIds.has(id)) id = `${id}-${idx + 1}`;
      seenIds.add(id);
      const name = sanitizeAgentName(a, id);
      return {
        id,
        name,
        status: 'idle',
        isActive: true,
        isDefault: false,
        is_primary: false,
        findings: []
      };
    }
    return null;
  }).filter((item): item is RCAAgent => item !== null);

  return mapped;
};
