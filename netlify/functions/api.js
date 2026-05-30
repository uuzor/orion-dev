const serverless = require('aws-serverless-express');
const express = require('express');
const app = express();

app.use(express.json());

// Health routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/login', (req, res) => {
  res.json({ message: 'Auth routes need real implementation' });
});

app.post('/api/auth/register', (req, res) => {
  res.json({ message: 'Auth routes need real implementation' });
});

// Dashboard routes
app.get('/api/dashboard/stats', (req, res) => {
  res.json({ message: 'Dashboard routes need real implementation' });
});

// Entity routes - direct registration
app.get('/api/entities/Business', (req, res) => {
  res.json({ message: 'Business routes need real implementation' });
});
app.post('/api/entities/Business', (req, res) => {
  res.json({ message: 'Business POST routes need real implementation' });
});

app.get('/api/entities/Lead', (req, res) => {
  res.json({ message: 'Lead routes need real implementation' });
});
app.post('/api/entities/Lead', (req, res) => {
  res.json({ message: 'Lead POST routes need real implementation' });
});

app.get('/api/entities/Campaign', (req, res) => {
  res.json({ message: 'Campaign routes need real implementation' });
});
app.post('/api/entities/Campaign', (req, res) => {
  res.json({ message: 'Campaign POST routes need real implementation' });
});

app.get('/api/entities/Opportunity', (req, res) => {
  res.json({ message: 'Opportunity routes need real implementation' });
});

app.get('/api/entities/SocialPost', (req, res) => {
  res.json({ message: 'SocialPost routes need real implementation' });
});

app.get('/api/entities/AgentRun', (req, res) => {
  res.json({ message: 'AgentRun routes need real implementation' });
});

app.get('/api/entities/AgentTask', (req, res) => {
  res.json({ message: 'AgentTask routes need real implementation' });
});

// Agent routes
app.post('/api/agents/super', (req, res) => {
  res.json({ message: 'Agent routes need real implementation' });
});

const server = serverless.createServer(app);
exports.handler = (event, context) => {
  server(event, context);
};
