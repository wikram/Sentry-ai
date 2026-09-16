import express from 'express';
import {
  getRealHosts,
  getRealManifests,
  saveManifest,
  getRealSecrets,
  addOrUpdateSecret,
  getRealCisAudit,
  loadExecutionRuns,
  executePlaybookRun,
  getAnsibleConfig,
  saveAnsibleConfig,
  testAnsibleSetup,
  getInventoryRawContent,
  saveInventoryRawContent,
  inspectAnsibleDirectories,
  scaffoldAnsibleDirectories,
  getAnsibleCfgContent
} from './configMgmtService';

export function createConfigMgmtRouter(): express.Router {
  const router = express.Router();

  // 1. Overview API
  router.get('/overview', (req, res) => {
    try {
      const hosts = getRealHosts();
      const manifests = getRealManifests();
      const secrets = getRealSecrets();
      const compliance = getRealCisAudit();
      const runs = loadExecutionRuns();

      res.json({
        success: true,
        summary: {
          totalHosts: hosts.length,
          syncedHosts: hosts.filter(h => h.status === 'synced').length,
          driftedHosts: hosts.filter(h => h.status === 'drifted').length,
          totalManifests: manifests.length,
          totalSecrets: secrets.length,
          cisScore: compliance.overallScore,
          totalRuns: runs.length
        }
      });
    } catch (err: any) {
      console.error('Error in /api/config-mgmt/overview:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Host Inventory API
  router.get('/hosts', (req, res) => {
    try {
      const hosts = getRealHosts();
      res.json({ success: true, hosts });
    } catch (err: any) {
      console.error('Error in /api/config-mgmt/hosts:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/drift-scan', (req, res) => {
    try {
      const hosts = getRealHosts();
      res.json({
        success: true,
        message: `Drift scan complete. ${hosts.length} active hosts verified.`,
        hosts
      });
    } catch (err: any) {
      console.error('Error in /api/config-mgmt/drift-scan:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Manifests API
  router.get('/manifests', (req, res) => {
    try {
      const manifests = getRealManifests();
      res.json({ success: true, manifests });
    } catch (err: any) {
      console.error('Error in /api/config-mgmt/manifests:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/manifests', (req, res) => {
    try {
      const { path: filePath, content } = req.body;
      if (!filePath || typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'File path and content are required' });
      }

      const ok = saveManifest(filePath, content);
      if (ok) {
        res.json({ success: true, message: `Manifest saved to ${filePath}` });
      } else {
        res.status(500).json({ success: false, error: 'Failed to write file' });
      }
    } catch (err: any) {
      console.error('Error writing manifest:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Secrets Vault API
  router.get('/secrets', (req, res) => {
    try {
      const secrets = getRealSecrets();
      res.json({ success: true, secrets });
    } catch (err: any) {
      console.error('Error in /api/config-mgmt/secrets:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/secrets', (req, res) => {
    try {
      const { key, value, environment, scope } = req.body;
      if (!key || !value) {
        return res.status(400).json({ success: false, error: 'Key and value are required' });
      }

      addOrUpdateSecret(key, value, environment, scope);
      const updatedSecrets = getRealSecrets();
      res.json({ success: true, message: `Secret ${key} persisted successfully`, secrets: updatedSecrets });
    } catch (err: any) {
      console.error('Error saving secret:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. CIS Compliance API
  router.get('/compliance', (req, res) => {
    try {
      const audit = getRealCisAudit();
      res.json({ success: true, ...audit });
    } catch (err: any) {
      console.error('Error in /api/config-mgmt/compliance:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/compliance/run', (req, res) => {
    try {
      const audit = getRealCisAudit();
      res.json({
        success: true,
        message: 'Live CIS benchmark audit completed',
        ...audit
      });
    } catch (err: any) {
      console.error('Error in /api/config-mgmt/compliance/run:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Execution Runs API
  router.get('/runs', (req, res) => {
    try {
      const runs = loadExecutionRuns();
      res.json({ success: true, runs });
    } catch (err: any) {
      console.error('Error in /api/config-mgmt/runs:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/execute', async (req, res) => {
    try {
      const { playbookName, playbookFile, targetGroup, mode } = req.body;
      if (!playbookName) {
        return res.status(400).json({ success: false, error: 'Playbook name is required' });
      }

      const runResult = await executePlaybookRun({
        playbookName,
        playbookFile,
        targetGroup,
        mode
      });

      res.json({ success: true, run: runResult });
    } catch (err: any) {
      console.error('Error executing playbook:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Ansible Configuration & Environment API
  router.get('/ansible-config', (req, res) => {
    try {
      const config = getAnsibleConfig();
      res.json({ success: true, config });
    } catch (err: any) {
      console.error('Error in GET /api/config-mgmt/ansible-config:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/ansible-config', (req, res) => {
    try {
      const savedConfig = saveAnsibleConfig(req.body);
      res.json({
        success: true,
        message: 'Ansible configuration saved and synced to ansible.cfg',
        config: savedConfig
      });
    } catch (err: any) {
      console.error('Error in POST /api/config-mgmt/ansible-config:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/ansible-config/test', (req, res) => {
    try {
      const testResult = testAnsibleSetup(req.body);
      res.json({ success: true, ...testResult });
    } catch (err: any) {
      console.error('Error in POST /api/config-mgmt/ansible-config/test:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/inventory-file', (req, res) => {
    try {
      const customPath = typeof req.query.path === 'string' ? req.query.path : undefined;
      const data = getInventoryRawContent(customPath);
      res.json({ success: true, ...data });
    } catch (err: any) {
      console.error('Error in GET /api/config-mgmt/inventory-file:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/inventory-file', (req, res) => {
    try {
      const { content, path: filePath } = req.body;
      if (typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'Content string is required' });
      }
      const result = saveInventoryRawContent(content, filePath);
      res.json(result);
    } catch (err: any) {
      console.error('Error in POST /api/config-mgmt/inventory-file:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/ansible-directories', (req, res) => {
    try {
      const inspection = inspectAnsibleDirectories();
      res.json({ success: true, ...inspection });
    } catch (err: any) {
      console.error('Error in GET /api/config-mgmt/ansible-directories:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/ansible-directories/scaffold', (req, res) => {
    try {
      const result = scaffoldAnsibleDirectories(req.body);
      const inspection = inspectAnsibleDirectories();
      res.json({ success: result.success, ...result, inspection });
    } catch (err: any) {
      console.error('Error in POST /api/config-mgmt/ansible-directories/scaffold:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/ansible-cfg', (req, res) => {
    try {
      const data = getAnsibleCfgContent();
      res.json({ success: true, ...data });
    } catch (err: any) {
      console.error('Error in GET /api/config-mgmt/ansible-cfg:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
