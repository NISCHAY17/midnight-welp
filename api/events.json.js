module.exports = async (req, res) => {
  try {
    // Fetch logs from Vercel API
    const projectId = process.env.VERCEL_PROJECT_ID || 'prj_your_project_id';
    const teamId = process.env.VERCEL_TEAM_ID;
    const token = process.env.VERCEL_TOKEN;

    if (!token) {
      res.status(200).json({ error: 'No VERCEL_TOKEN configured' });
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
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Error fetching events' });
  }
};
