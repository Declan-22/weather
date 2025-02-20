const IPINFO_API_KEY = 'c559f66759d881';
const WEATHER_API_KEY = 'f2ad7e9739454afa911223159251402';

const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const cityName = document.getElementById('city-name');
const temperature = document.getElementById('temperature');
const weatherCondition = document.getElementById('weather-condition');
const uvIndex = document.getElementById('uv-index');
const weatherAlerts = document.getElementById('weather-alerts');
const loadingSpinner = document.getElementById('loading-spinner');

let temperatureChart, precipitationChart, forecastChart;

// Function to get elevation from OpenTopoData API
async function getElevation(latitude, longitude) {
  try {
    const response = await fetch(`https://wynd.onrender.com/get-elevation?latitude=${latitude}&longitude=${longitude}`);
    const data = await response.json();

    if (data.elevation) {
      console.log('Elevation:', data.elevation);  // Log the elevation value
      return data.elevation; // Elevation in meters
    } else {
      console.error("Failed to fetch elevation data");
      return null;
    }
  } catch (error) {
    console.error("Error fetching elevation data:", error);
    return null;
  }
}

// Function to fetch weather station coordinates from NOAA API
async function getWeatherStations(latitude, longitude) {
  try {
    const url = `https://api.weather.gov/points/${latitude},${longitude}/stations`;
    const response = await fetch(url);
    const data = await response.json();

    if (data?.features) {
      console.log('Weather stations found:', data.features.length);  // Log the number of stations found
      return data.features.map(station => ({
        lat: station.geometry.coordinates[1],
        lon: station.geometry.coordinates[0]
      }));
    } else {
      throw new Error('Weather stations data is missing or in the wrong format');
    }
  } catch (error) {
    console.error("Error fetching weather stations:", error);
    throw new Error("Failed to fetch weather stations data.");
  }
}

async function fetchWeather(city) {
  try {
    loadingSpinner.classList.remove('hidden');

    let locationResponse = await fetch(`https://ipinfo.io/json?token=${IPINFO_API_KEY}`);
    let locationData = await locationResponse.json();
    if (!city) {
      city = locationData.city;
    }

    const currentWeatherData = await fetchWeatherAPI(city);
    const { latitude, longitude } = await fetchCityCoordinates(city); // Fetch city coordinates

    const elevation = await getElevation(latitude, longitude); // Get elevation
    console.log('Elevation:', elevation);

    const forecastWeatherData = await fetchNASAWeatherData(latitude, longitude);

    const stations = await getWeatherStations(latitude, longitude); // Get nearby weather stations
    console.log('Nearby stations:', stations);

    if (stations.length > 0) {
      // Use the closest station for interpolation
      const nearestStation = stations[0];
      console.log('Using nearest station:', nearestStation);

      // Pass city coordinates to interpolateWeatherData
      const interpolatedData = interpolateWeatherData(currentWeatherData, forecastWeatherData, elevation, nearestStation, latitude, longitude);

      console.log('Interpolated weather data:', interpolatedData); // Log the interpolated data

      cityName.textContent = city;
      temperature.textContent = `Temperature: ${interpolatedData.currentTemp}°F`; // Already rounded to 2 decimal places
      weatherCondition.textContent = `Condition: ${interpolatedData.condition}`;
      uvIndex.textContent = `UV Index: ${interpolatedData.uvIndex}`;
      weatherAlerts.textContent = interpolatedData.alerts.length ? interpolatedData.alerts[0].headline : 'No severe weather alerts.';

      displayTemperatureGraph(interpolatedData);
      displayForecastGraph(interpolatedData);
      displayPrecipitationGraph(forecastWeatherData);
    } else {
      console.error('No nearby weather stations found.');
    }
  } catch (error) {
    console.error('Error fetching weather data:', error);
    cityName.textContent = 'Error';
    temperature.textContent = '';
    weatherCondition.textContent = '';
    uvIndex.textContent = '';
    weatherAlerts.textContent = error.message || 'Failed to fetch weather data.';
  } finally {
    loadingSpinner.classList.add('hidden');
  }
}

// Fetch current weather data from WeatherAPI
async function fetchWeatherAPI(city) {
  const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${city}&aqi=no`);
  const data = await response.json();
  console.log('Current weather data:', data.current); // Log current weather data
  return data.current;
}

// Fetch city coordinates
async function fetchCityCoordinates(city) {
  const response = await fetch(`https://api.weatherapi.com/v1/search.json?key=${WEATHER_API_KEY}&q=${city}`);
  const data = await response.json();

  if (data.length > 0) {
    const { lat, lon } = data[0]; // Extract lat/lon for the city
    console.log(`Coordinates for ${city}:`, lat, lon); // Log the coordinates
    return { latitude: parseFloat(lat), longitude: parseFloat(lon) }; // Ensure they are numbers
  } else {
    throw new Error(`Failed to get coordinates for ${city}`);
  }
}

// Fetch NASA weather data
async function fetchNASAWeatherData(latitude, longitude) {
  const year = new Date().getFullYear();

  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M&community=RE&longitude=${longitude}&latitude=${latitude}&start=${year}&end=${year}&format=JSON`;

  console.log(`Fetching NASA POWER data for: ${latitude}, ${longitude}`);
  console.log(`NASA POWER API Request:`, url);

  const response = await fetch(url);

  if (!response.ok) {
    console.error('Failed to fetch NASA data:', response.statusText);
    throw new Error(`Failed to fetch NASA data: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data?.properties?.parameter?.T2M) {
    console.log(`NASA POWER Data for (${latitude}, ${longitude}):`, data.properties.parameter.T2M);
    return Object.values(data.properties.parameter.T2M);
  } else {
    throw new Error('No forecast data found from NASA POWER.');
  }
}

// Adjust temperatures based on elevation (use lapse rate)
function adjustTemperatureForElevation(temp, elevation) {
  const lapseRate = 11.7 / 3280.8; // 11.7°F per 1000m
  const temperatureAdjustment = lapseRate * elevation;
  console.log('Adjusted temperature for elevation:', temp - temperatureAdjustment); // Log adjusted temperature
  return temp - temperatureAdjustment;
}

// Interpolate data between WeatherAPI and NASA POWER, adjusted by station coordinates
function interpolateWeatherData(currentData, forecastData, elevation, station, cityLat, cityLon) {
  console.log("City Coordinates:", cityLat, cityLon); // Log city coordinates
  console.log("Station Coordinates:", station.lat, station.lon); // Log station coordinates

  const baseTemperature = currentData.temp_f;

  // Adjust temperature based on station distance
  const adjustedBaseTemperature = adjustTemperatureBasedOnDistance(cityLat, cityLon, station.lat, station.lon, baseTemperature);

  // Interpolate between forecast data and adjusted temperature
  const interpolatedTemps = forecastData.map(temp => {
    const adjustedTemp = adjustTemperatureForElevation(temp * 1.8 + 32, elevation); // Convert °C to °F and adjust for elevation
    return ((adjustedBaseTemperature + adjustedTemp) / 2).toFixed(2); // Round to 2 decimal places
  });

  return {
    currentTemp: adjustedBaseTemperature.toFixed(2), // Round to 2 decimal places
    condition: currentData.condition.text,
    uvIndex: currentData.uv,
    alerts: [],
    interpolatedTemps: interpolatedTemps,
  };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Validate coordinates
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    console.error("Invalid coordinates:", lat1, lon1, lat2, lon2);
    return NaN;
  }

  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90 || lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    console.error("Coordinates out of valid range:", lat1, lon1, lat2, lon2);
    return NaN;
  }

  const R = 6371; // Earth radius in kilometers
  const toRad = (deg) => deg * (Math.PI / 180); // Convert degrees to radians

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c * 1000; // Return distance in meters
  console.log("Calculated Distance:", distance); // Log the calculated distance
  return distance;
}

function adjustTemperatureBasedOnDistance(cityLat, cityLon, stationLat, stationLon, currentTemperature) {
  // Calculate the distance in meters
  const distance = calculateDistance(cityLat, cityLon, stationLat, stationLon);

  // Define the distance threshold in meters (e.g., 10km)
  const threshold = 10000; // 10 kilometers (you can adjust this value)

  // If the distance is small, the temperature adjustment is minimal
  const adjustmentFactor = Math.min(1, (distance / threshold));  // Apply a factor based on the distance

  // Adjust the temperature (a small correction based on the distance)
  const adjustedTemperature = currentTemperature * (1 + adjustmentFactor * 0.05);  // Small adjustment factor (5%)

  console.log(`Distance: ${distance} meters, Adjusted Temperature: ${adjustedTemperature}`);
  return adjustedTemperature;
}

// Display temperature graph using interpolated temperature data for 7 days
function displayTemperatureGraph(interpolatedData) {
  const ctx = document.getElementById('temperatureChart').getContext('2d');
  const forecastTemps = interpolatedData.interpolatedTemps.slice(0, 7).map((temp, index) => ({
      time: new Date(Date.now() + index * 86400000).toLocaleDateString(),
      temp: parseFloat(temp) // Convert to float for graphing
  }));

  if (temperatureChart) {
      temperatureChart.destroy();
  }

  temperatureChart = new Chart(ctx, {
      type: 'bar',
      data: {
          labels: forecastTemps.map(item => item.time),
          datasets: [{
              label: 'Temperature (°F)',
              data: forecastTemps.map(item => item.temp),
              backgroundColor: forecastTemps.map(item => {
                  const temp = item.temp;
                  return temp <= 32 ? 'blue' : temp >= 90 ? 'red' : 'purple';
              }),
              borderColor: 'rgba(0, 0, 0, 0.2)',
              borderWidth: 1,
              borderRadius: 5,
          }],
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
              x: { title: { display: true, text: 'Date' } },
              y: { title: { display: true, text: 'Temperature (°F)' } }
          }
      }
  });
}

// Display forecast graph using interpolated temperature data for a month
function displayForecastGraph(interpolatedData) {
  const ctx = document.getElementById('forecastChart').getContext('2d');
  const forecastTemps = interpolatedData.interpolatedTemps.slice(0, 30).map((temp, index) => ({
      time: new Date(Date.now() + index * 86400000).toLocaleDateString(),
      temp: parseFloat(temp) // Convert to float for graphing
  }));

  if (forecastChart) {
      forecastChart.destroy();
  }

  forecastChart = new Chart(ctx, {
      type: 'line',
      data: {
          labels: forecastTemps.map(item => item.time),
          datasets: [{
              label: 'Forecast Temperature (°F)',
              data: forecastTemps.map(item => item.temp),
              borderColor: 'green',
              borderWidth: 2,
              fill: false,
          }],
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
              x: { title: { display: true, text: 'Date' } },
              y: { title: { display: true, text: 'Temperature (°F)' } }
          }
      }
  });
}

// Display precipitation graph for 3-7 days
function displayPrecipitationGraph(forecastData) {
  const ctx = document.getElementById('precipitationChart').getContext('2d');
  
  // Ensure forecastData is an array and has the expected structure
  const forecastPrecip = forecastData.slice(2, 7).map((day, index) => {
      // Check if day and day.day.totalprecip_in are defined
      const precip = day?.day?.totalprecip_in ?? 0; // Default to 0 if undefined
      return {
          time: new Date(Date.now() + (index + 2) * 86400000).toLocaleDateString(),
          precip: precip,
      };
  });

  if (precipitationChart) {
      precipitationChart.destroy();
  }

  precipitationChart = new Chart(ctx, {
      type: 'bar',
      data: {
          labels: forecastPrecip.map(item => item.time),
          datasets: [{
              label: 'Precipitation (in)',
              data: forecastPrecip.map(item => item.precip),
              backgroundColor: '#3f7aaa',
              borderColor: 'rgba(0, 0, 0, 0.2)',
              borderWidth: 1,
              borderRadius: 5,
          }],
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
              x: { title: { display: true, text: 'Date' } },
              y: { title: { display: true, text: 'Precipitation (in)' } }
          }
      }
  });
}

function toggleCard(cardId) {
  const cardContent = document.getElementById(cardId);
  const icon = cardContent.previousElementSibling.querySelector('.toggle-icon');

  cardContent.classList.toggle('open');
  icon.classList.toggle('flip');
  icon.innerHTML = cardContent.classList.contains('open') 
    ? '<i class="ri-arrow-drop-up-line"></i>' 
    : '<i class="ri-arrow-drop-down-line"></i>';
}

document.addEventListener("DOMContentLoaded", function () {
  const links = document.querySelectorAll(".nav-links a");
  links.forEach(link => {
    if (window.location.pathname.includes(link.getAttribute("href"))) {
      link.classList.add("active");
    }
  });
});

searchBtn.addEventListener('click', () => fetchWeather(cityInput.value));