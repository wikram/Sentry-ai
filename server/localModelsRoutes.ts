import express from 'express';
import {
  LocalModelError,
  listProviderStatuses,
  addProvider,
  removeProvider
} from './localModelsService';

export function createLocalModelsRouter(): express.Router {
  const router = express.Router();

  router.get('/providers', async (req, res) => {
    try {
      res.json({ providers: await listProviderStatuses() });
    } catch (error) {
      console.error('Error listing local model providers:', error);
      res.status(500).json({ error: 'Failed to list local model providers' });
    }
  });

  router.post('/providers', async (req, res) => {
    try {
      res.json({ success: true, provider: await addProvider(req.body) });
    } catch (error) {
      if (error instanceof LocalModelError) {
        return res.status(400).json({ error: error.message });
      }
      console.error('Error adding local model provider:', error);
      res.status(500).json({ error: 'Failed to add local model provider' });
    }
  });

  router.delete('/providers/:id', (req, res) => {
    try {
      if (!removeProvider(req.params.id)) {
        return res.status(404).json({ error: 'Provider not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing local model provider:', error);
      res.status(500).json({ error: 'Failed to remove local model provider' });
    }
  });

  return router;
}
