module.exports = async (req, res) => {
  try {
    // Get deployment info from Vercel environment variables
    const deploymentInfo = {
      url: process.env.VERCEL_URL || 'unknown',
      region: process.env.VERCEL_REGION || 'unknown',
      env: process.env.VERCEL_ENV || 'unknown',
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown',
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'unknown',
    };

    const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
    const token = process.env.VERCEL_TOKEN;

    let logs = null;

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
          logs = await response.json();
        } else {
          logs = { error: `${response.status} ${response.statusText}` };
        }
      } catch (err) {
        logs = { error: err.message };
      }
    }

    res.status(200).json({
      deployment: deploymentInfo,
      logs: logs || { message: 'Set VERCEL_TOKEN to view runtime logs' }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Error fetching events' });
  }
};
