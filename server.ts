import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import yaml from 'js-yaml';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// --- LOGGING ENGINE INITIALIZATION ---
const logFilePath = process.env.APPLICATION_LOG_PATH || 'logs/app.log';

function ensureLogDir() {
  try {
    const dir = path.dirname(logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    process.stderr.write(`Failed to create log directory: ${err}\n`);
  }
}

function writeToLogFile(level: string, message: string) {
  try {
    ensureLogDir();
    const timestamp = new Date().toISOString();
    // Strip ANSI color characters to keep log file clean
    const cleanMessage = message.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    const formattedMessage = `[${timestamp}] [${level}] ${cleanMessage}\n`;
    fs.appendFileSync(logFilePath, formattedMessage, 'utf-8');
  } catch (err) {
    process.stderr.write(`Failed to write to log file: ${err}\n`);
  }
}

// Preserve original console handles
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  originalLog.apply(console, args);
  writeToLogFile('INFO', message);
};

console.error = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  originalError.apply(console, args);
  writeToLogFile('ERROR', message);
};

console.warn = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  originalWarn.apply(console, args);
  writeToLogFile('WARN', message);
};

// Initial log to confirm system activation
console.log(`System Logging initialized. Target log file: ${logFilePath}`);

async function fetchWithTimeout(resource: string | URL, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 2000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...rest,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const CONFIG_PATH = path.join(process.cwd(), 'config.xml');
  const YAML_CONFIG_PATH = path.join(process.cwd(), 'config.yaml');

  const upload = multer({ dest: 'uploads/' });

  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  // Ensure config.xml exists
  if (!fs.existsSync(CONFIG_PATH)) {
    const initialConfig = {
      configuration: {
        sources: '',
        agents: ''
      }
    };
    const builder = new XMLBuilder({ format: true });
    const xmlContent = builder.build(initialConfig);
    fs.writeFileSync(CONFIG_PATH, xmlContent);
  }

  // Fetch application logs from the configured file
  app.get('/api/logs', (req, res) => {
    try {
      if (!fs.existsSync(logFilePath)) {
        return res.json({ logs: 'No logs have been captured yet.', path: logFilePath });
      }
      const logsContent = fs.readFileSync(logFilePath, 'utf-8');
      // Return the last 300 lines for efficiency
      const lines = logsContent.split('\n');
      const lastLines = lines.slice(-300).join('\n');
      res.json({ logs: lastLines, path: logFilePath });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to retrieve logs: ' + error.message });
    }
  });

  // Diagnostics Proxy to avoid CORS
  app.get('/api/diagnostics', async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: 'No URL provided' });
      }

      console.log(`Proxying diagnostics check to: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const response = await fetch(url, { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'RCA-Agent-Diagnostics/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        const contentType = response.headers.get('content-type');
        let data: any = null;
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = { message: await response.text() };
        }

        res.status(response.status).json(data);
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          return res.status(504).json({ error: 'Request timed out' });
        }
        throw fetchErr;
      }
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: 'Failed to connect to backend system' });
    }
  });

  // API Routes
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ status: 'error', message: 'Username and password are required' });
    }

    const backendUrl = process.env.VITE_BACKEND_URL;
    if (backendUrl) {
      try {
        console.log(`Forwarding login to external backend: ${backendUrl}/api/login`);
        const externalResponse = await fetchWithTimeout(`${backendUrl}/api/login`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ username, password }),
          timeout: 10000
        });

        const contentType = externalResponse.headers.get('content-type');
        let data: any;
        if (contentType && contentType.includes('application/json')) {
          data = await externalResponse.json();
        } else {
          const text = await externalResponse.text();
          try {
            data = JSON.parse(text);
          } catch {
            data = { message: text };
          }
        }

        console.log('Login response from external backend:', data);
        return res.status(externalResponse.status).json(data);
      } catch (fetchErr) {
        console.log('Unable to connect to external backend during login.');
        return res.status(503).json({ 
          status: 'error', 
          message: 'Connection to external backend failed. Please ensure the backend is running.' 
        });
      }
    }

    res.json({
      status: 'success',
      message: `User '${username}' logged in successfully`
    });
  });

  app.get('/api/config', (req, res) => {
    try {
      const xmlData = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parser = new XMLParser();
      const jsonObj = parser.parse(xmlData);
      
      // Normalize data (fast-xml-parser might return single items as objects instead of arrays)
      const sources = jsonObj.configuration.sources?.source 
        ? (Array.isArray(jsonObj.configuration.sources.source) ? jsonObj.configuration.sources.source : [jsonObj.configuration.sources.source])
        : [];
      
      const agents = jsonObj.configuration.agents?.agent
        ? (Array.isArray(jsonObj.configuration.agents.agent) ? jsonObj.configuration.agents.agent : [jsonObj.configuration.agents.agent])
        : [];

      // Further normalize source config
      const normalizedSources = sources.map((s: any) => ({
        ...s,
        isActive: s.isActive === 'true' || s.isActive === true,
        config: s.config || {}
      }));

      const normalizedAgents = agents.map((a: any) => ({
        ...a,
        isActive: a.isActive === 'true' || a.isActive === true,
        isDefault: a.isDefault === 'true' || a.isDefault === true,
        findings: Array.isArray(a.findings?.finding) ? a.findings.finding : (a.findings?.finding ? [a.findings.finding] : [])
      }));

      res.json({ 
        sources: normalizedSources, 
        agents: normalizedAgents,
        selectedModel: jsonObj.configuration.selectedModel || '',
        apiBackendUrl: jsonObj.configuration.apiBackendUrl || ''
      });
    } catch (error) {
      console.error('Error reading config:', error);
      res.status(500).json({ error: 'Failed to read configuration' });
    }
  });

  app.get('/api/llm-model', (req, res) => {
    try {
      let selectedModel = '';
      if (fs.existsSync(CONFIG_PATH)) {
        const xmlData = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const parser = new XMLParser();
        const jsonObj = parser.parse(xmlData);
        selectedModel = jsonObj.configuration?.selectedModel || '';
      }
      res.json({ success: true, model: selectedModel });
    } catch (error) {
      console.error('Error in /api/llm-model:', error);
      res.status(500).json({ error: 'Failed to retrieve LLM model' });
    }
  });

  app.post('/api/config', async (req, res) => {
    try {
      const { sources, agents, selectedModel, apiBackendUrl } = req.body;
      
      const configObj = {
        configuration: {
          sources: {
            source: sources && sources.length > 0 ? sources.map((s: any) => ({
              id: s.id,
              name: s.name,
              type: s.type,
              status: s.status,
              isActive: s.isActive,
              lastSync: s.lastSync,
              config: s.config
            })) : []
          },
          agents: {
            agent: agents && agents.length > 0 ? agents.map((a: any) => ({
              id: a.id,
              name: a.name,
              role: a.role,
              avatar: a.avatar,
              status: a.status,
              isActive: a.isActive,
              backendUrl: a.backendUrl,
              isDefault: a.isDefault,
              model: a.model,
              apiKey: a.apiKey,
              findings: {
                 finding: a.findings || []
              }
            })) : []
          },
          selectedModel: selectedModel || '',
          apiBackendUrl: apiBackendUrl || ''
        }
      };

      // Save to XML
      const builder = new XMLBuilder({ format: true });
      const xmlContent = builder.build(configObj);
      fs.writeFileSync(CONFIG_PATH, xmlContent);

      // Save to YAML
      const yamlContent = yaml.dump(configObj);
      fs.writeFileSync(YAML_CONFIG_PATH, yamlContent);

      res.json({ success: true });
    } catch (error) {
      console.error('Error saving config:', error);
      res.status(500).json({ error: 'Failed to save configuration' });
    }
  });

  app.get('/api/listagents', async (req, res) => {
    try {
      const backendUrl = process.env.VITE_BACKEND_URL;
      
      if (backendUrl) {
        console.log(`Fetching agents from configured backend: ${backendUrl}/api/listagents`);
        try {
          const response = await fetchWithTimeout(`${backendUrl}/api/listagents`, {
            headers: { 'Accept': 'application/json' },
            timeout: 15000
          });
          
          if (response.ok) {
            const data = await response.json();
            const fetchedAgents = Array.isArray(data) ? data : (data?.agents || []);
            
            // Helper functions for robust field value parsing
            const parseAgentField = (val: any): string => {
              if (val === undefined || val === null) return '';
              const str = String(val).trim();
              if (str.includes('=')) {
                const parts = str.split('=');
                parts.shift(); // remove the key part
                let value = parts.join('=').trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                  value = value.substring(1, value.length - 1);
                }
                return value;
              }
              return str;
            };

            const mappedAgents = fetchedAgents.map((a: any) => {
              if (Array.isArray(a)) {
                const id = parseAgentField(a[0]);
                const name = parseAgentField(a[1]);
                const model = parseAgentField(a[2]);
                const agentBackendUrl = parseAgentField(a[3]);
                const apiKey = parseAgentField(a[4]);
                const isPrimaryVal = parseAgentField(a[5]);
                const isActiveVal = parseAgentField(a[6]);

                const isDefault = isPrimaryVal === 'true' || isPrimaryVal === '1' || a[5] === true;
                const isActive = isActiveVal === 'true' || isActiveVal === '1' || a[6] === true || a[6] === undefined;

                return {
                  id: id ? id.replace(/^agent-/, '').trim() : String(Date.now()),
                  name: name || 'SREBOT',
                  role: 'Specialized SRE Bot',
                  avatar: 'Cpu',
                  status: 'idle',
                  isActive,
                  backendUrl: agentBackendUrl || '',
                  model: model || '',
                  apiKey: apiKey || '',
                  isDefault,
                  findings: []
                };
              } else if (a && typeof a === 'object') {
                const id = String(a.id || a.agent_id || '');
                const name = String(a.name || '');
                const model = String(a.llm_model || a.model || '');
                const backendUrl = String(a.conn_url || a.backendUrl || '');
                const apiKey = String(a.api_key || a.apiKey || '');
                const isDefault = a.is_primary === true || a.is_primary === 'true' || a.isDefault === true || a.isDefault === 'true';
                const isActive = a.is_active !== false && a.is_active !== 'false' && a.isActive !== false && a.isActive !== 'false';
                const findings = Array.isArray(a.findings) ? a.findings : (Array.isArray(a.findings?.finding) ? a.findings.finding : []);

                return {
                  id: id ? id.replace(/^agent-/, '').trim() : String(Date.now()),
                  name,
                  role: a.role || 'Specialized SRE Bot',
                  avatar: a.avatar || 'Cpu',
                  status: a.status || 'idle',
                  isActive,
                  backendUrl,
                  model,
                  apiKey,
                  isDefault,
                  findings
                };
              }
              return null;
            }).filter(Boolean);

            if (mappedAgents.length > 0) {
              console.log(`Successfully mapped ${mappedAgents.length} agents from backend.`);
              return res.json(mappedAgents);
            }
          } else {
            console.log(`Backend listagents status: ${response.status}`);
          }
        } catch (fetchErr) {
          console.log(`Unable to fetch listagents from external backend (timed out or unreachable).`);
        }
      }

      // Fallback: Read local config.xml if VITE_BACKEND_URL is not set or external fetch fails
      console.log('Falling back to local config.xml for listagents.');
      let jsonObj: any = { configuration: { sources: '', agents: '', selectedModel: '', apiBackendUrl: '' } };
      if (fs.existsSync(CONFIG_PATH)) {
        try {
          const xmlData = fs.readFileSync(CONFIG_PATH, 'utf-8');
          const parser = new XMLParser();
          jsonObj = parser.parse(xmlData);
        } catch (e) {
          console.error('Error parsing config.xml:', e);
        }
      }

      const agents = jsonObj.configuration?.agents?.agent
        ? (Array.isArray(jsonObj.configuration.agents.agent) ? jsonObj.configuration.agents.agent : [jsonObj.configuration.agents.agent])
        : [];

      const normalizedAgents = agents.map((a: any) => ({
        ...a,
        id: String(a.id || '').replace(/^agent-/, '').trim(),
        isActive: a.isActive === 'true' || a.isActive === true,
        isDefault: a.isDefault === 'true' || a.isDefault === true,
        findings: Array.isArray(a.findings?.finding) ? a.findings.finding : (a.findings?.finding ? [a.findings.finding] : [])
      }));

      res.json(normalizedAgents);
    } catch (error) {
      console.error('Error in /api/listagents:', error);
      res.status(500).json({ error: 'Failed to list agents' });
    }
  });

  app.post('/api/addagent', async (req, res) => {
    try {
      const { name, llm_model, conn_url, api_key, is_primary, is_active } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Agent name is required' });
      }

      const backendUrl = process.env.VITE_BACKEND_URL;
      let externalSuccess = false;
      let externalErrorMsg = '';

      if (backendUrl) {
        console.log(`Forwarding addagent request to external backend: ${backendUrl}/api/addagent`);
        try {
          const externalResponse = await fetchWithTimeout(`${backendUrl}/api/addagent`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name,
              llm_model,
              conn_url,
              api_key,
              is_primary,
              is_active: is_active !== undefined ? is_active : false
            }),
            timeout: 10000
          });

          if (externalResponse.ok) {
            console.log('Successfully added agent to external backend.');
            externalSuccess = true;
          } else {
            const errText = await externalResponse.text().catch(() => '');
            console.log(`External backend returned status ${externalResponse.status}`);
            externalErrorMsg = `External backend response status ${externalResponse.status}`;
          }
        } catch (fetchErr) {
          console.log('Unable to connect to external backend during addagent.');
          externalErrorMsg = `Connection to external backend could not be established.`;
        }
      }

      let jsonObj: any = { configuration: { sources: '', agents: '', selectedModel: '', apiBackendUrl: '' } };
      if (fs.existsSync(CONFIG_PATH)) {
        try {
          const xmlData = fs.readFileSync(CONFIG_PATH, 'utf-8');
          const parser = new XMLParser();
          jsonObj = parser.parse(xmlData);
        } catch (e) {
          console.error('Error parsing config.xml:', e);
        }
      }

      if (!jsonObj.configuration) jsonObj.configuration = {};
      if (!jsonObj.configuration.sources) jsonObj.configuration.sources = '';
      if (!jsonObj.configuration.agents) jsonObj.configuration.agents = '';

      const existingAgentsObj = jsonObj.configuration.agents?.agent;
      let existingAgents: any[] = [];
      if (existingAgentsObj) {
        existingAgents = Array.isArray(existingAgentsObj) ? existingAgentsObj : [existingAgentsObj];
      }

      // If is_primary is true, set all other agents' isDefault to false
      existingAgents = existingAgents.map((a: any) => ({
        ...a,
        isActive: a.isActive === 'true' || a.isActive === true,
        isDefault: is_primary ? false : (a.isDefault === 'true' || a.isDefault === true)
      }));

      let maxIdNum = 0;
      existingAgents.forEach((a: any) => {
        const idStr = String(a.id || '').replace(/^agent-/, '').trim();
        const num = parseInt(idStr, 10);
        if (!isNaN(num) && num > maxIdNum) {
          maxIdNum = num;
        }
      });
      const newAgentId = String(maxIdNum + 1);
      const newAgent = {
        id: newAgentId,
        name: name,
        role: 'Specialized SRE Bot',
        avatar: 'Cpu',
        status: 'idle',
        isActive: is_active !== undefined ? (is_active === true || is_active === 'true') : false,
        backendUrl: conn_url || '',
        model: llm_model || '',
        apiKey: api_key || '',
        isDefault: is_primary ? true : (existingAgents.length === 0),
        findings: {
          finding: []
        }
      };

      existingAgents.push(newAgent);

      const configObj = {
        configuration: {
          sources: jsonObj.configuration.sources || '',
          agents: {
            agent: existingAgents.map((a: any) => ({
              id: a.id,
              name: a.name,
              role: a.role || 'Specialized SRE Bot',
              avatar: a.avatar || 'Cpu',
              status: a.status || 'idle',
              isActive: a.isActive,
              backendUrl: a.backendUrl || '',
              model: a.model || '',
              apiKey: a.apiKey || '',
              isDefault: a.isDefault,
              findings: a.findings || { finding: [] }
            }))
          },
          selectedModel: jsonObj.configuration.selectedModel || '',
          apiBackendUrl: jsonObj.configuration.apiBackendUrl || ''
        }
      };

      // Save to XML
      const builder = new XMLBuilder({ format: true });
      const xmlContent = builder.build(configObj);
      fs.writeFileSync(CONFIG_PATH, xmlContent);

      // Save to YAML
      const yamlContent = yaml.dump(configObj);
      fs.writeFileSync(YAML_CONFIG_PATH, yamlContent);

      if (backendUrl && !externalSuccess) {
        return res.status(502).json({
          error: `Agent saved locally but failed to register on the external backend: ${externalErrorMsg}`,
          agent: newAgent
        });
      }

      res.json({ success: true, message: 'Agent added successfully', agent: newAgent });
    } catch (error) {
      console.error('Error adding agent:', error);
      res.status(500).json({ error: 'Failed to add agent' });
    }
  });

  app.post('/api/updateagent', async (req, res) => {
    try {
      const { agent_id, name, llm_model, conn_url, api_key, is_primary, is_active } = req.body;

      if (!agent_id) {
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      const backendUrl = process.env.VITE_BACKEND_URL;
      let externalSuccess = false;
      let externalErrorMsg = '';

      if (backendUrl) {
        console.log(`Forwarding updateagent request to external backend: ${backendUrl}/api/updateagent`);
        try {
          const externalResponse = await fetchWithTimeout(`${backendUrl}/api/updateagent`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              agent_id,
              name,
              llm_model,
              conn_url,
              api_key,
              is_primary,
              is_active
            }),
            timeout: 10000
          });

          if (externalResponse.ok) {
            console.log('Successfully updated agent on external backend.');
            externalSuccess = true;
          } else {
            const errText = await externalResponse.text().catch(() => '');
            console.log(`External backend updateagent returned status ${externalResponse.status}`);
            externalErrorMsg = `External backend updateagent status ${externalResponse.status}`;
          }
        } catch (fetchErr) {
          console.log('Unable to connect to external backend during updateagent.');
          externalErrorMsg = `Connection to external backend could not be established.`;
        }
      }

      let jsonObj: any = { configuration: { sources: '', agents: '', selectedModel: '', apiBackendUrl: '' } };
      if (fs.existsSync(CONFIG_PATH)) {
        try {
          const xmlData = fs.readFileSync(CONFIG_PATH, 'utf-8');
          const parser = new XMLParser();
          jsonObj = parser.parse(xmlData);
        } catch (e) {
          console.error('Error parsing config.xml:', e);
        }
      }

      if (!jsonObj.configuration) jsonObj.configuration = {};
      if (!jsonObj.configuration.sources) jsonObj.configuration.sources = '';
      if (!jsonObj.configuration.agents) jsonObj.configuration.agents = '';

      const existingAgentsObj = jsonObj.configuration.agents?.agent;
      let existingAgents: any[] = [];
      if (existingAgentsObj) {
        existingAgents = Array.isArray(existingAgentsObj) ? existingAgentsObj : [existingAgentsObj];
      }

      const targetIdStr = String(agent_id).replace(/^agent-/, '').trim();
      let found = false;

      let updatedAgents = existingAgents.map((a: any) => {
        const idStr = String(a.id || '').replace(/^agent-/, '').trim();
        if (idStr === targetIdStr) {
          found = true;
          return {
            ...a,
            name: name !== undefined ? name : a.name,
            model: llm_model !== undefined ? llm_model : a.model,
            backendUrl: conn_url !== undefined ? conn_url : a.backendUrl,
            apiKey: api_key !== undefined ? api_key : a.apiKey,
            isActive: is_active !== undefined ? (is_active === true || is_active === 'true' || is_active === '1') : (a.isActive === true || a.isActive === 'true'),
            isDefault: is_primary !== undefined ? (is_primary === true || is_primary === 'true' || is_primary === '1') : (a.isDefault === true || a.isDefault === 'true'),
          };
        }
        return {
          ...a,
          isActive: a.isActive === 'true' || a.isActive === true,
          isDefault: is_primary ? false : (a.isDefault === 'true' || a.isDefault === true)
        };
      });

      if (is_primary) {
        updatedAgents = updatedAgents.map((a: any) => {
          const idStr = String(a.id || '').replace(/^agent-/, '').trim();
          if (idStr === targetIdStr) {
            return { ...a, isDefault: true };
          }
          return { ...a, isDefault: false };
        });
      }

      const configObj = {
        configuration: {
          sources: jsonObj.configuration.sources || '',
          agents: {
            agent: updatedAgents.map((a: any) => ({
              id: a.id,
              name: a.name,
              role: a.role || 'Specialized SRE Bot',
              avatar: a.avatar || 'Cpu',
              status: a.status || 'idle',
              isActive: a.isActive === true || a.isActive === 'true',
              backendUrl: a.backendUrl || '',
              model: a.model || '',
              apiKey: a.apiKey || '',
              isDefault: a.isDefault === true || a.isDefault === 'true',
              findings: a.findings || { finding: [] }
            }))
          },
          selectedModel: jsonObj.configuration.selectedModel || '',
          apiBackendUrl: jsonObj.configuration.apiBackendUrl || ''
        }
      };

      // Save to XML
      const builder = new XMLBuilder({ format: true });
      const xmlContent = builder.build(configObj);
      fs.writeFileSync(CONFIG_PATH, xmlContent);

      // Save to YAML
      const yamlContent = yaml.dump(configObj);
      fs.writeFileSync(YAML_CONFIG_PATH, yamlContent);

      if (backendUrl && !externalSuccess) {
        return res.status(502).json({
          error: `Agent updated locally but failed on the external backend: ${externalErrorMsg}`,
          success: true,
          agent_id
        });
      }

      res.json({ success: true, message: 'Agent updated successfully', agent_id });
    } catch (error) {
      console.error('Error updating agent:', error);
      res.status(500).json({ error: 'Failed to update agent' });
    }
  });

  app.post('/api/deleteagent', async (req, res) => {
    try {
      const { agent_id, name } = req.body;

      if (!agent_id) {
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      const backendUrl = process.env.VITE_BACKEND_URL;
      let externalSuccess = false;
      let externalErrorMsg = '';

      if (backendUrl) {
        console.log(`Forwarding deleteagent request to external backend: ${backendUrl}/api/deleteagent`);
        try {
          const externalResponse = await fetchWithTimeout(`${backendUrl}/api/deleteagent`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              agent_id,
              name
            }),
            timeout: 10000
          });

          if (externalResponse.ok) {
            console.log('Successfully deleted agent on external backend.');
            externalSuccess = true;
          } else {
            const errText = await externalResponse.text().catch(() => '');
            console.log(`External backend deleteagent returned status ${externalResponse.status}`);
            externalErrorMsg = `External backend deleteagent status ${externalResponse.status}`;
          }
        } catch (fetchErr) {
          console.log('Unable to connect to external backend during deleteagent.');
          externalErrorMsg = `Connection to external backend could not be established.`;
        }
      }

      let jsonObj: any = { configuration: { sources: '', agents: '', selectedModel: '', apiBackendUrl: '' } };
      if (fs.existsSync(CONFIG_PATH)) {
        try {
          const xmlData = fs.readFileSync(CONFIG_PATH, 'utf-8');
          const parser = new XMLParser();
          jsonObj = parser.parse(xmlData);
        } catch (e) {
          console.error('Error parsing config.xml:', e);
        }
      }

      if (!jsonObj.configuration) jsonObj.configuration = {};
      if (!jsonObj.configuration.sources) jsonObj.configuration.sources = '';
      if (!jsonObj.configuration.agents) jsonObj.configuration.agents = '';

      const existingAgentsObj = jsonObj.configuration.agents?.agent;
      let existingAgents: any[] = [];
      if (existingAgentsObj) {
        existingAgents = Array.isArray(existingAgentsObj) ? existingAgentsObj : [existingAgentsObj];
      }

      const targetIdStr = String(agent_id).replace(/^agent-/, '').trim();
      const updatedAgents = existingAgents.filter((a: any) => {
        const idStr = String(a.id || '').replace(/^agent-/, '').trim();
        return idStr !== targetIdStr;
      });

      const configObj = {
        configuration: {
          sources: jsonObj.configuration.sources || '',
          agents: {
            agent: updatedAgents.map((a: any) => ({
              id: a.id,
              name: a.name,
              role: a.role || 'Specialized SRE Bot',
              avatar: a.avatar || 'Cpu',
              status: a.status || 'idle',
              isActive: a.isActive === true || a.isActive === 'true',
              backendUrl: a.backendUrl || '',
              model: a.model || '',
              apiKey: a.apiKey || '',
              isDefault: a.isDefault === true || a.isDefault === 'true',
              findings: a.findings || { finding: [] }
            }))
          },
          selectedModel: jsonObj.configuration.selectedModel || '',
          apiBackendUrl: jsonObj.configuration.apiBackendUrl || ''
        }
      };

      // Save to XML
      const builder = new XMLBuilder({ format: true });
      const xmlContent = builder.build(configObj);
      fs.writeFileSync(CONFIG_PATH, xmlContent);

      // Save to YAML
      const yamlContent = yaml.dump(configObj);
      fs.writeFileSync(YAML_CONFIG_PATH, yamlContent);

      if (backendUrl && !externalSuccess) {
        return res.status(502).json({
          error: `Agent deleted locally but failed on the external backend: ${externalErrorMsg}`,
          success: true,
          agent_id
        });
      }

      res.json({ success: true, message: 'Agent deleted successfully', agent_id });
    } catch (error) {
      console.error('Error deleting agent:', error);
      res.status(500).json({ error: 'Failed to delete agent' });
    }
  });

  app.get('/api/jenkins/failed-jobs', async (req, res) => {
    try {
      const xmlData = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parser = new XMLParser();
      const jsonObj = parser.parse(xmlData);
      
      const sources = jsonObj.configuration.sources?.source 
        ? (Array.isArray(jsonObj.configuration.sources.source) ? jsonObj.configuration.sources.source : [jsonObj.configuration.sources.source])
        : [];
      
      const jenkinsSources = sources.filter((s: any) => s.type === 'jenkins' && (s.isActive === 'true' || s.isActive === true));
      
      const allFailedJobs: any[] = [];

      for (const source of jenkinsSources) {
        const url = source.config?.url;
        const user = source.config?.user;
        const key = source.config?.key;

        if (!url) continue;

        try {
          const apiOverlay = url.endsWith('/') ? 'api/json' : '/api/json';
          const apiUrl = `${url}${apiOverlay}?tree=jobs[name,url,color,lastBuild[result,timestamp,url]]`;
          
          const headers: any = {};
          if (user && key) {
            const auth = Buffer.from(`${user}:${key}`).toString('base64');
            headers['Authorization'] = `Basic ${auth}`;
          }

          const response = await fetchWithTimeout(apiUrl, { headers, timeout: 2500 });
          if (response.ok) {
            const data: any = await response.json();
            const failedJobs = data.jobs?.filter((job: any) => 
              job.color === 'red' || 
              job.lastBuild?.result === 'FAILURE'
            ).map((job: any) => ({
              ...job,
              sourceName: source.name,
              sourceId: source.id
            })) || [];
            allFailedJobs.push(...failedJobs);
          }
        } catch (err) {
          console.error(`Failed to fetch from ${url}:`, err);
        }
      }

      res.json({ jobs: allFailedJobs });
    } catch (error) {
      console.error('Error scraping Jenkins:', error);
      res.status(500).json({ error: 'Failed to scrape Jenkins jobs' });
    }
  });

  app.post('/api/analyze', async (req, res) => {
    try {
      const { logs, description } = req.body;

      if (!logs) {
        return res.status(400).json({ error: 'No logs provided' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback to basic analysis
        const errorCount = (logs.match(/\[ERROR\]|\[FATAL\]/g) || []).length;
        const warnCount = (logs.match(/\[WARN\]/g) || []).length;
        
        let report = `### INTELLIGENT ANALYSIS REPORT (Basic Engine)\n\n`;
        report += `DETECTED ANOMALIES:\n`;
        report += `---------------------\n`;
        report += `• Critical Failures: ${errorCount}\n`;
        report += `• System Warnings:   ${warnCount}\n\n`;
        report += `Note: GEMINI_API_KEY is not set. Using basic heuristic analysis.\n`;
        
        return res.json({ report });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        You are an expert SRE and Log Analysis Agent. 
        Analyze the following system logs and provide a concise, high-impact report.
        
        User Context/Instructions: ${description || "General analysis"}
        
        Logs:
        ${logs.slice(0, 20000)}
        
        Provide the report in Markdown format. 
        Focus on:
        1. Detected Anomalies/Errors
        2. Potential Root Causes
        3. Recommended Actions
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      res.json({ report: response.text });
    } catch (error) {
      console.error('Analysis failed:', error);
      res.status(500).json({ error: 'Log analysis engine failed' });
    }
  });

  app.post('/api/analyze-file', upload.single('file'), async (req, res) => {
    try {
      const description = req.body.description || "General analysis";
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const logs = fs.readFileSync(file.path, 'utf-8');
      
      // Basic cleanup: remove the temporary file
      fs.unlinkSync(file.path);

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback to basic analysis if no API key is provided
        const errorCount = (logs.match(/\[ERROR\]|\[FATAL\]/g) || []).length;
        const warnCount = (logs.match(/\[WARN\]/g) || []).length;
        
        let report = `### INTELLIGENT ANALYSIS REPORT (Basic Engine - File Mode)\n\n`;
        report += `FILE ANALYZED: ${file.originalname}\n`;
        report += `DETECTED ANOMALIES:\n`;
        report += `---------------------\n`;
        report += `• Critical Failures: ${errorCount}\n`;
        report += `• System Warnings:   ${warnCount}\n\n`;
        report += `Note: GEMINI_API_KEY is not set. Using basic heuristic analysis.\n`;
        
        return res.json({ report });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        You are an expert SRE and Log Analysis Agent. 
        Analyze the following system logs from the file "${file.originalname}" and provide a concise, high-impact report.
        
        User Context/Instructions: ${description}
        
        Logs:
        ${logs.slice(0, 20000)}
        
        Provide the report in Markdown format. 
        Focus on:
        1. Detected Anomalies/Errors
        2. Potential Root Causes
        3. Recommended Actions
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      res.json({ report: response.text });
    } catch (error) {
      console.error('File analysis failed:', error);
      res.status(500).json({ error: 'Log analysis engine (file mode) failed' });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
