const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the main page
app.get('/', (req, res) => {
  console.log('Serving index.html...');
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      console.error('Error loading index.html:', err);
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
    console.log(`Fetching elevation for lat: ${latitude}, lon: ${longitude}`);

    // Fetch elevation data from OpenTopoData API
    const response = await axios.get(
      `https://api.opentopodata.org/v1/test-dataset?locations=${latitude},${longitude}`
    );

    if (response.data.results && response.data.results.length > 0) {
      const elevation = response.data.results[0].elevation;
      console.log('Elevation:', elevation);
      return res.json({ elevation });
    } else {
      console.error('Invalid API response:', response.data);
      return res.status(500).json({ error: 'Failed to fetch valid elevation data' });
    }
  } catch (error) {
    console.error('Error fetching elevation data:', error.message);
    res.status(500).json({ error: 'Failed to fetch elevation data' });
  }
});

// Start the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
