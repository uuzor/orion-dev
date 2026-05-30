exports.handler = async function(event, context) {
  // Get the path from the raw URL
  const rawUrl = event.rawPath || event.path || '/';
  const method = event.httpMethod || 'GET';
  
  console.log('RAW URL:', rawUrl);
  console.log('Method:', method);
  
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
  
  // Default path (when called directly, not via redirect)
  let path = rawUrl;
  
  // Route handling
  let response = { error: 'Not found', path, rawUrl, method };
  let statusCode = 404;
  
  // Health endpoints
  if (path === '/api/health' || path === '/health') {
    response = { status: 'ok', timestamp: new Date().toISOString(), from: 'netlify-function' };
    statusCode = 200;
  }
  // Auth routes
  else if (path === '/api/auth/login' && method === 'POST') {
    response = { message: 'Auth routes need real implementation' };
    statusCode = 200;
  }
  else if (path === '/api/auth/register' && method === 'POST') {
    response = { message: 'Auth routes need real implementation' };
    statusCode = 200;
  }
  // Dashboard routes
  else if (path === '/api/dashboard/stats' && method === 'GET') {
    response = { message: 'Dashboard routes need real implementation' };
    statusCode = 200;
  }
  // Entity routes
  else if (path.startsWith('/api/entities/')) {
    const entity = path.split('/')[3];
    response = { message: `${entity} routes - working!`, path, rawUrl };
    statusCode = 200;
  }
  // Agent routes
  else if (path === '/api/agents/super' && method === 'POST') {
    response = { message: 'Agent routes need real implementation' };
    statusCode = 200;
  }
  
  return {
    statusCode,
    headers,
    body: JSON.stringify(response)
  };
};
