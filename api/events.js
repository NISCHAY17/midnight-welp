module.exports = async (req, res) => {
  try {
    // Get deployment info from Vercel environment variables
    const deploymentUrl = process.env.VERCEL_URL || 'unknown';
    const region = process.env.VERCEL_REGION || 'unknown';
    const env = process.env.VERCEL_ENV || 'unknown';
    const gitCommit = process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown';
    
    // Fetch runtime logs from this deployment only
    const projectId = process.env.VERCEL_PROJECT_ID;
    const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
    const token = process.env.VERCEL_TOKEN;

    let logsHtml = '<p>No logs available. Set VERCEL_TOKEN to view runtime logs.</p>';

    if (token && deploymentId) {
      try {
        const response = await fetch(
          `https://api.vercel.com/v2/deployments/${deploymentId}/events`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (response.ok) {
          const logs = await response.json();
          logsHtml = `<pre style="background: #f5f5f5; padding: 1rem; overflow: auto; max-height: 500px;">${JSON.stringify(logs, null, 2)}</pre>`;
        } else {
          logsHtml = `<p>Error fetching logs: ${response.status} ${response.statusText}</p>`;
        }
      } catch (err) {
        logsHtml = `<p>Error: ${err.message}</p>`;
      }
    }
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Events - midnight-welp</title>
  <style>
    body { font-family: sans-serif; margin: 2rem; max-width: 1000px; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    td { padding: 0.5rem; border-bottom: 1px solid #ddd; }
    td:first-child { font-weight: bold; width: 150px; }
    pre { background: #f5f5f5; padding: 0.5rem; overflow: auto; }
  </style>
</head>
<body>
  <h1>Deployment Events</h1>
  <p><a href="/api/slack">← Back</a> | <a href="/api/events.json">JSON</a></p>
  
  <h2>Current Deployment</h2>
  <table>
    <tr><td>URL</td><td>${deploymentUrl}</td></tr>
    <tr><td>Environment</td><td>${env}</td></tr>
    <tr><td>Region</td><td>${region}</td></tr>
    <tr><td>Commit</td><td>${gitCommit}</td></tr>
    <tr><td>Deployment ID</td><td>${deploymentId || 'unknown'}</td></tr>
  </table>

  <h2>Runtime Logs</h2>
  ${logsHtml}
</body>
</html>`);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send('Error fetching events');
  }
};
