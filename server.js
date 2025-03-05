const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const { parseHRRR } = require('./process_hrrr');  // Ensure you have this function to process HRRR data

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Function to download the latest HRRR forecast
async function downloadHRRR() {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');

  const url = `https://nomads.ncep.noaa.gov/pub/data/nccf/com/hrrr/prod/hrrr.${year}${month}${day}/conus/hrrr.t${hour}z.wrfsfcf01.grib2`;
  const filename = 'hrrr_latest.grib2';

  console.log(`Downloading HRRR data from ${url}...`);

  return new Promise((resolve, reject) => {
    exec(`wget -O ${filename} ${url} --no-check-certificate`, (error, stdout, stderr) => {
      if (error) {
        console.error('Failed to download HRRR:', stderr);
        return reject(error);
      }
      console.log('HRRR data downloaded successfully.');
      resolve(filename);
    });
  });
}

// API to get weather forecast
app.get('/get-weather', async (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  try {
    // Step 1: Download HRRR data
    await downloadHRRR();

    // Step 2: Parse HRRR and get temperature
    const hrrrData = await parseHRRR('hrrr_latest.grib2');
    
    if (!hrrrData) {
      throw new Error('HRRR processing failed');
    }

    // Step 3: Get elevation
    const elevationResponse = await axios.get(
      `https://api.opentopodata.org/v1/test-dataset?locations=${latitude},${longitude}`
    );
    const elevation = elevationResponse.data.results?.[0]?.elevation || 0;

    // Step 4: Get NASA POWER interpolation if HRRR is unavailable
    let nasaTemp = null;
    if (!hrrrData.temperature) {
      console.log('Fetching NASA POWER temperature due to missing HRRR data...');
      const nasaResponse = await axios.get(
        `https://power.larc.nasa.gov/api/temporal/hourly/point?parameters=T2M&community=RE&longitude=${longitude}&latitude=${latitude}&format=JSON`
      );
      nasaTemp = nasaResponse.data?.properties?.parameter?.T2M?.[0];
    }

    res.json({
      source: hrrrData.temperature ? 'HRRR' : 'NASA POWER',
      temperature: hrrrData.temperature || nasaTemp,
      elevation,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Start the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

