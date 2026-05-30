exports.handler = async function(event, context) {
  const path = event.path || event.rawPath;
  const method = event.httpMethod;
  
  // Debug: log what we receive
  console.log('Received:', method, path);
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  // Route handling - normalize path
  let normalizedPath = path;
  if (normalizedPath.startsWith('/api')) {
    normalizedPath = normalizedPath;
  }
  
  let response = { error: 'Not found', path: normalizedPath };
  let statusCode = 404;
  
  // Health endpoints
  if (normalizedPath === '/api/health' || normalizedPath === '/health') {
    response = { status: 'ok', timestamp: new Date().toISOString(), path: normalizedPath };
    statusCode = 200;
  }
  // Auth routes
  else if (normalizedPath === '/api/auth/login' && method === 'POST') {
    response = { message: 'Auth routes need real implementation' };
    statusCode = 200;
  }
  else if (normalizedPath === '/api/auth/register' && method === 'POST') {
    response = { message: 'Auth routes need real implementation' };
    statusCode = 200;
  }
  // Dashboard routes
  else if (normalizedPath === '/api/dashboard/stats' && method === 'GET') {
    response = { message: 'Dashboard routes need real implementation' };
    statusCode = 200;
  }
  // Entity routes
  else if (normalizedPath.startsWith('/api/entities/')) {
    const entity = normalizedPath.split('/')[3];
    response = { message: `${entity} routes - working!`, path: normalizedPath };
    statusCode = 200;
  }
  // Agent routes
  else if (normalizedPath === '/api/agents/super' && method === 'POST') {
    response = { message: 'Agent routes need real implementation' };
    statusCode = 200;
  }
  
  return {
    statusCode,
    headers,
    body: JSON.stringify(response)
  };
};
