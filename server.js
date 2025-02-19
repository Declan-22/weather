const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// Serve static files from the "public" directory
app.use(express.static('public'));

// Route to serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      res.status(500).send('Error loading the index.html file');
    }
  });
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
const port = process.env.PORT || 4000;  // Use PORT from environment variable or fallback to 4000
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});