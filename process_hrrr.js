const { exec } = require('child_process');
const fs = require('fs');

// Function to parse HRRR GRIB2 file and extract 2m temperature
async function parseHRRR(gribFile) {
  return new Promise((resolve, reject) => {
    // Run wgrib2 to extract temperature data at 2m above ground
    exec(`wgrib2 ${gribFile} -match ":TMP:2 m above ground:" -csv hrrr_temp.csv`, (error, stdout, stderr) => {
      if (error) {
        console.error('HRRR parsing failed:', stderr);
        return reject(error);
      }
      console.log('HRRR data extracted.');

      // Read the extracted CSV file
      fs.readFile('hrrr_temp.csv', 'utf8', (err, data) => {
        if (err) return reject(err);

        // Split the CSV into lines and extract the temperature from the second line
        const lines = data.split('\n');
        if (lines.length > 1) {
          // Assuming the temperature is in the third column of the CSV (index 2)
          const tempData = lines[1].split(',')[2];
          return resolve({ temperature: parseFloat(tempData) });
        }

        // If no valid data is found, resolve with null
        resolve(null);
      });
    });
  });
}

module.exports = { parseHRRR };

