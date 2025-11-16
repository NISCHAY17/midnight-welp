module.exports = async (req, res) => {
  try {
    // Fetch logs from Vercel API
    const projectId = process.env.VERCEL_PROJECT_ID || 'prj_your_project_id';
    const teamId = process.env.VERCEL_TEAM_ID;
    const token = process.env.VERCEL_TOKEN;

    if (!token) {
      res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Events - midnight-welp</title>
  <style>
    body { font-family: sans-serif; margin: 2rem; }
    .error { color: red; }
  </style>
</head>
<body>
  <h1>Events</h1>
  <p class="error">No VERCEL_TOKEN configured. Cannot fetch logs.</p>
  <p><a href="/api/slack">← Back</a></p>
</body>
</html>`);
      return;
    }

    // Fetch deployment logs from Vercel
    const url = teamId 
      ? `https://api.vercel.com/v2/deployments?projectId=${projectId}&teamId=${teamId}&limit=20`
      : `https://api.vercel.com/v2/deployments?projectId=${projectId}&limit=20`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Events - midnight-welp</title>
  <style>
    body { font-family: sans-serif; margin: 2rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background: #f5f5f5; }
    pre { background: #f5f5f5; padding: 0.5rem; overflow: auto; }
  </style>
</head>
<body>
  <h1>Recent Events</h1>
  <p><a href="/api/slack">← Back</a> | <a href="/api/events.json">JSON</a></p>
  <pre>${JSON.stringify(data, null, 2)}</pre>
</body>
</html>`);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send('Error fetching events');
  }
};
