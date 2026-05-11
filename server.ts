import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import yaml from 'js-yaml';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const CONFIG_PATH = path.join(process.cwd(), 'config.xml');
  const YAML_CONFIG_PATH = path.join(process.cwd(), 'config.yaml');

  const upload = multer({ dest: 'uploads/' });

  app.use(express.json());

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

  // API Routes
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

      // Trigger external API call if Backend URL is provided
      if (apiBackendUrl && selectedModel) {
        try {
          const externalEndpoint = apiBackendUrl.endsWith('/') 
            ? `${apiBackendUrl}api/v1/config/llm` 
            : `${apiBackendUrl}/api/v1/config/llm`;
            
          console.log(`Forwarding model config to ${externalEndpoint}...`);
          
          const externalResponse = await fetch(externalEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: selectedModel })
          });
          
          if (!externalResponse.ok) {
            console.error(`External API error: ${externalResponse.status} ${externalResponse.statusText}`);
          }
        } catch (extErr) {
          console.error('Failed to call external API backend:', extErr);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error saving config:', error);
      res.status(500).json({ error: 'Failed to save configuration' });
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

          const response = await fetch(apiUrl, { headers });
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
