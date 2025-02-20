const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the root directory (no 'public' folder now)
app.use(express.static(path.join(__dirname)));  // Now we serve from the root

// Serve index.html at root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to fetch elevation data
app.get('/get-elevation', async (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  try {
    // Fetch elevation data from OpenTopoData API
    const response = await axios.get(
      `https://api.opentopodata.org/v1/test-dataset?locations=${latitude},${longitude}`
    );

    // Extract elevation from the response
    const elevation = response.data.results[0].elevation;
    res.json({ elevation });
  } catch (error) {
    console.error('Error fetching elevation data:', error);
    res.status(500).json({ error: 'Failed to fetch elevation data' });
  }
});

// Start the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});