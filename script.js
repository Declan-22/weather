// Replace IPGeolocation with IPinfo
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

async function fetchWeather(city) {
  try {
    loadingSpinner.classList.remove('hidden');

    let locationResponse = await fetch(`https://ipinfo.io/json?token=${IPINFO_API_KEY}`);
    let locationData = await locationResponse.json();
    if (!city) {
      city = locationData.city;
    }

    const currentWeatherData = await fetchWeatherAPI(city);
    const { latitude, longitude } = await fetchCityCoordinates(city);

    const elevation = await getElevation(latitude, longitude); // Get elevation
    const forecastWeatherData = await fetchNASAWeatherData(latitude, longitude);

    const interpolatedData = interpolateWeatherData(currentWeatherData, forecastWeatherData, elevation);

    cityName.textContent = city;
    temperature.textContent = `Temperature: ${interpolatedData.currentTemp}°F`;
    weatherCondition.textContent = `Condition: ${interpolatedData.condition}`;
    uvIndex.textContent = `UV Index: ${interpolatedData.uvIndex}`;
    weatherAlerts.textContent = interpolatedData.alerts.length ? interpolatedData.alerts[0].headline : 'No severe weather alerts.';

    displayTemperatureGraph(forecastWeatherData);
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
  return data.current;
}

// Fetch city coordinates
async function fetchCityCoordinates(city) {
  const response = await fetch(`https://api.weatherapi.com/v1/search.json?key=${WEATHER_API_KEY}&q=${city}`);
  const data = await response.json();

  if (data.length > 0) {
    const { lat, lon } = data[0]; // Extract lat/lon for the city
    console.log(`Coordinates for ${city}:`, lat, lon);
    return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
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
  return temp - temperatureAdjustment;
}

// Interpolate data between WeatherAPI and NASA POWER
function interpolateWeatherData(currentData, forecastData, elevation) {
  const baseTemperature = currentData.temp_f;
  const adjustedBaseTemperature = adjustTemperatureForElevation(baseTemperature, elevation); // Apply elevation adjustment
  const interpolatedTemps = forecastData.map(temp => {
    const adjustedTemp = adjustTemperatureForElevation(temp * 1.8 + 32, elevation); // Convert to °F and adjust for elevation
    return (adjustedBaseTemperature + adjustedTemp) / 2; // Average the adjusted base temperature with forecast
  });

  return {
    currentTemp: adjustedBaseTemperature,
    condition: currentData.condition.text,
    uvIndex: currentData.uv,
    alerts: [],
    interpolatedTemps: interpolatedTemps,
  };
}

// Display temperature graph using NASA POWER data
function displayTemperatureGraph(forecastData) {
  const ctx = document.getElementById('temperatureChart').getContext('2d');
  const forecastTemps = forecastData.map((temp, index) => ({
    time: new Date(Date.now() + index * 86400000).toLocaleDateString(),
    temp: temp * 1.8 + 32, // Convert °C to °F
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

searchBtn.addEventListener('click', () => {
  const city = cityInput.value;
  fetchWeather(city);
});



