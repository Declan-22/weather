const express = require('express');
const axios = require('axios'); // For making HTTP requests
const app = express();

// Serve static files from the "public" directory
app.use(express.static('public'));

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
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});