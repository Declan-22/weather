/*=============== UTILITY FUNCTIONS ===============*/
function isContinent(input) {
  const continents = ['africa', 'asia', 'europe', 'north america', 'south america', 'antarctica', 'australia'];
  return continents.includes(input.toLowerCase());
}

async function getCountryInContinent(continent) {
  const continentToCountries = {
    africa: ['Nigeria', 'Kenya', 'South Africa'],
    asia: ['China', 'India', 'Japan'],
    europe: ['France', 'Germany', 'Italy'],
    'north america': ['USA', 'Canada', 'Mexico'],
    'south america': ['Brazil', 'Argentina', 'Chile'],
    antarctica: ['Antarctica'],
    australia: ['Australia'],
  };

  const countries = continentToCountries[continent.toLowerCase()];
  if (!countries) throw new Error(`Invalid continent: ${continent}`);

  // Return a random country from the continent for simplicity
  return countries[Math.floor(Math.random() * countries.length)];
}

/*=============== SHOW SIDEBAR ===============*/
const showSidebar = (toggleId, sidebarId, headerId, mainId, weatherInfoId, weatherCardsId) => {
  const toggle = document.getElementById(toggleId),
        sidebar = document.getElementById(sidebarId),
        header = document.getElementById(headerId),
        main = document.getElementById(mainId),
        weatherInfo = document.getElementById(weatherInfoId),
        weatherCards = document.getElementById(weatherCardsId);

  if (toggle && sidebar && header && main && weatherInfo && weatherCards) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('show-sidebar');
      if (window.innerWidth > 1150) {
        header.classList.toggle('left-pd');
        main.classList.toggle('left-pd');
        weatherInfo.classList.toggle('left-pd');
        weatherCards.classList.toggle('left-pd');
      }
    });
  }
};

/*=============== AUTHENTICATION ===============*/
const CLIENT_ID = '32805499266-aode8pdvh1t1mqt430d9uiutt8lo0t31.apps.googleusercontent.com';
const REDIRECT_URI = 'https://wynd.onrender.com';
const SCOPE = 'https://www.googleapis.com/auth/userinfo.profile+https://www.googleapis.com/auth/userinfo.email';

function updateSidebar() {
  const sidebarUser = document.getElementById('sidebar-user');
  const sidebarActions = document.getElementById('sidebar-actions');
  const token = localStorage.getItem('access_token');

  if (token) {
    // Logged in state
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => response.json())
      .then(data => {
        sidebarUser.innerHTML = `
          <div class="sidebar-img">
            <img src="${data.picture}" alt="Profile">
          </div>
          <div class="sidebar-info">
            <h3>${data.name}</h3>
            <span>${data.email}</span>
          </div>
        `;
        sidebarActions.innerHTML = `
          <button>
            <i class="ri-moon-clear-fill sidebar-link sidebar-theme" id="theme-button">
              <span>Theme</span>
            </i>
          </button>
          <button id="logout-btn" class="sidebar-link">
            <i class="ri-logout-box-r-line"></i>
            <span>Log Out</span>
          </button>
        `;
        // Reattach event listeners
        document.getElementById('logout-btn').addEventListener('click', logout);
        document.getElementById('theme-button').addEventListener('click', toggleTheme);
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        updateSidebar(); // Reset to logged out on error
      });
  } else {
    // Logged out state
    sidebarUser.innerHTML = `
      <button id="login-btn" class="sidebar-link">
        <i class="ri-login-box-line"></i>
        <span>Sign In</span>
      </button>
    `;
    sidebarActions.innerHTML = `
      <button>
        <i class="ri-moon-clear-fill sidebar-link sidebar-theme" id="theme-button">
          <span>Theme</span>
        </i>
      </button>
    `;
    // Reattach event listeners
    document.getElementById('login-btn').addEventListener('click', showLoginPopup);
    document.getElementById('theme-button').addEventListener('click', toggleTheme);
  }
}

function showLoginPopup() {
  const modal = document.getElementById('login-modal');
  modal.classList.add('show');
}

function hideLoginPopup() {
  const modal = document.getElementById('login-modal');
  modal.classList.remove('show');
}


function login() {
  console.log('Redirect URI:', REDIRECT_URI);
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${SCOPE}`;
  console.log('OAuth URL:', authUrl);
  window.location.href = authUrl;
}

function logout() {
  localStorage.removeItem('access_token');
  updateSidebar();
}

function handleOAuthCallback() {
  const hash = window.location.hash;
  console.log('Hash received:', hash);
  if (hash) {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    console.log('Token:', token);
    if (token) {
      localStorage.setItem('access_token', token);
      window.location.hash = '';
      updateSidebar();
    }
  }
}

function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  const themeButton = document.getElementById('theme-button');
  themeButton.classList.toggle('ri-sun-fill');
  localStorage.setItem('selected-theme', getCurrentTheme());
  localStorage.setItem('selected-icon', getCurrentIcon());
}

const getCurrentTheme = () => document.body.classList.contains('dark-theme') ? 'dark' : 'light';
const getCurrentIcon = () => document.getElementById('theme-button').classList.contains('ri-sun-fill') ? 'ri-moon-clear-fill' : 'ri-sun-fill';

/*=============== INITIALIZATION ===============*/
document.addEventListener('DOMContentLoaded', () => {
  // Initialize sidebar toggle
  showSidebar('header-toggle', 'sidebar', 'header', 'main', 'weatherinfo', 'weatherCards');
  
  // Update sidebar based on auth state
  updateSidebar();
  handleOAuthCallback();

  // Attach popup event listeners
  document.getElementById('google-login-btn').addEventListener('click', login);
  document.getElementById('close-modal').addEventListener('click', hideLoginPopup); // Close button event listener
});

/*=============== WEATHER FUNCTIONS ===============*/
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

// Function to fetch weather station coordinates globally
async function getWeatherStations(latitude, longitude) {
  try {
    // First try the US-specific API
    try {
      const usUrl = `https://api.weather.gov/points/${latitude},${longitude}/stations`;
      const usResponse = await fetch(usUrl);
      const usData = await usResponse.json(); // This was using 'response' instead of 'usResponse'
      
      if (usData?.features && usData.features.length > 0) {
        console.log('US Weather stations found:', usData.features.length);
        return usData.features.map(station => ({
          lat: station.geometry.coordinates[1],
          lon: station.geometry.coordinates[0],
          id: station.properties.stationIdentifier,
          name: station.properties.name
        }));
      }
    } catch (error) {
      console.log("Location outside US or US API unavailable, trying global sources.");
    }
    
    // If US API fails or returns no results, use NOAA's GHCN global data
    const radius = 50; // Search radius in kilometers
    const ghcnUrl = `https://www.ncei.noaa.gov/cdo-web/api/v2/stations?extent=${latitude-0.5},${longitude-0.5},${latitude+0.5},${longitude+0.5}&limit=25`;
    
    const response = await fetch(ghcnUrl, {
      headers: {
        'token': 'nNWyvEMEtIlOoghgiVwpWmvVsRrQyrCh'
      }
    });
    
    const data = await response.json();
    
    if (data?.results && data.results.length > 0) {
      console.log('Global weather stations found:', data.results.length);
      return data.results.map(station => ({
        lat: parseFloat(station.latitude),
        lon: parseFloat(station.longitude),
        id: station.id,
        name: station.name
      }));
    }
    
    // Fallback to OpenWeatherMap free API if NOAA fails
    const owmUrl = `https://api.openweathermap.org/data/2.5/find?lat=${latitude}&lon=${longitude}&cnt=10&appid=YOUR_OWM_API_KEY`; // Replace with your OpenWeatherMap API key
    
    const owmResponse = await fetch(owmUrl);
    const owmData = await owmResponse.json();
    
    if (owmData?.list && owmData.list.length > 0) {
      console.log('OpenWeatherMap stations found:', owmData.list.length);
      return owmData.list.map(station => ({
        lat: station.coord.lat,
        lon: station.coord.lon,
        id: station.id.toString(),
        name: station.name
      }));
    }
    
    // If no stations found from any source
    return [];
  } catch (error) {
    console.error("Error fetching weather stations:", error);
    return []; // Return empty array instead of throwing to prevent breaking the flow
  }
}

// Fetch current weather data from WeatherAPI
async function fetchWeatherAPI(city) {
  const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${city}&aqi=no`);
  const data = await response.json();
  console.log('Full API response:', data); // Log entire response for debugging
  return data.current;
}

// Fetch city coordinates
async function fetchCityCoordinates(city, state = '', country = '') {
  let query = city;
  if (state) query += `, ${state}`;
  if (country) query += `, ${country}`;

  console.log('Fetching coordinates for:', query);

  try {
    // First, try the WeatherAPI search endpoint
    const searchResponse = await fetch(`https://api.weatherapi.com/v1/search.json?key=${WEATHER_API_KEY}&q=${query}`);
    const searchData = await searchResponse.json();

    console.log('WeatherAPI Search Response:', searchData);

    if (searchData.length > 0) {
      // Filter results by country if provided
      const filteredData = country ? searchData.filter(loc => loc.country.toLowerCase().includes(country.toLowerCase())) : searchData;

      if (filteredData.length > 0) {
        const { lat, lon } = filteredData[0]; // Get the most relevant result
        console.log(`Coordinates for ${query}:`, lat, lon);
        return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
      }
    }

    // If search endpoint fails, try the current weather endpoint
    const currentResponse = await fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${query}&aqi=no`);
    const currentData = await currentResponse.json();

    console.log('WeatherAPI Current Response:', currentData);

    if (currentData.location) {
      const { lat, lon } = currentData.location;
      console.log(`Coordinates for ${query}:`, lat, lon);
      return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    }

    // If no coordinates found, throw an error
    throw new Error(`No coordinates found for ${query}`);
  } catch (error) {
    console.error('Error fetching coordinates:', error);
    throw new Error(`Failed to get accurate coordinates for ${query}`);
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

  const baseTemperature = currentData.temp_f;
  let adjustedBaseTemperature;

  if (station) {
      console.log("Station Coordinates:", station.lat, station.lon); // Log station coordinates
      // Adjust temperature based on station distance
      adjustedBaseTemperature = adjustTemperatureBasedOnDistance(cityLat, cityLon, station.lat, station.lon, baseTemperature);
  } else {
      console.warn("No station data available. Using base temperature without distance adjustment.");
      adjustedBaseTemperature = baseTemperature;
  }

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
  
  // Make sure we're using the exact same temperature data that's displayed elsewhere
  // This ensures consistency between the graph and your current temperature display
  const forecastTemps = interpolatedData.interpolatedTemps.slice(0, 24).map((temp, index) => ({
      time: new Date(Date.now() + index * 3600000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
      temp: parseFloat(temp).toFixed(1) // Convert to float and keep 1 decimal place for consistency
  }));

  if (temperatureChart) {
      temperatureChart.destroy();
  }

  // IMPORTANT: Make sure the data source is synchronized with your current temperature display
  // Check if we need to get the temperature from the same API call or variable used for current temp display
  // For hour 9:06pm specifically, ensure we're showing 29.9 instead of 32.3
  
  // This function finds the index of the time closest to the specified hour:minute
  const findTimeIndex = (timeStr) => {
    const [hour, minute] = timeStr.split(':');
    return forecastTemps.findIndex(item => {
      const itemTime = item.time.replace(/\s[AP]M$/, '');
      return itemTime.startsWith(hour.padStart(2, '0'));
    });
  };
  


  temperatureChart = new Chart(ctx, {
      type: 'bar',
      data: {
          labels: forecastTemps.map(item => item.time),
          datasets: [{
              label: 'Temperature (°F)',
              data: forecastTemps.map(item => item.temp),
              backgroundColor: forecastTemps.map(item => {
                  // Dynamically determine color based on temperature
                  const temp = parseFloat(item.temp);
                  if (temp <= 32) {
                      // Cold temperatures - blue gradient
                      const intensity = Math.max(0, (32 - temp) / 32);
                      return `rgb(0, ${Math.floor(150 * (1 - intensity))}, 255)`;
                  } else if (temp <= 60) {
                      // Cool temperatures - light blue to green
                      const ratio = (temp - 32) / (60 - 32);
                      return `rgb(0, ${Math.floor(150 + 105 * ratio)}, ${Math.floor(255 * (1 - ratio))})`;
                  } else if (temp <= 80) {
                      // Moderate temperatures - green to yellow to orange
                      const ratio = (temp - 60) / (80 - 60);
                      return `rgb(${Math.floor(255 * ratio)}, ${Math.floor(255)}, ${Math.floor(50 * (1 - ratio))})`;
                  } else {
                      // Hot temperatures - orange to red
                      const ratio = Math.min(1, (temp - 80) / 20);
                      return `rgb(255, ${Math.floor(255 * (1 - ratio))}, 0)`;
                  }
              }),
              borderColor: 'transparent',
              borderWidth: 1,
              borderRadius: 5,
          }],
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
              x: { 
                  title: { display: true, text: 'Time' },
                  ticks: { 
                      autoSkip: false,
                      maxRotation: 0,
                      callback: function(value, index) {
                          return index % 6 === 0 ? forecastTemps[index].time : '';
                      }
                  }
              },
              y: { 
                  title: { display: true, text: 'Temperature (°F)' },
                  // Adding this to ensure consistent display format
                  ticks: {
                      callback: function(value) {
                          return parseFloat(value).toFixed(1);
                      }
                  }
              }
          },
          plugins: {
              tooltip: {
                  callbacks: {
                      label: function(context) {
                          return `Temperature: ${parseFloat(context.raw).toFixed(1)}°F`;
                      }
                  }
              }
          }
      }
  });
}

// For a more complete solution, you'll need to ensure the data source is the same
// Add this function to synchronize with your current temperature display
function synchronizeTemperatureData() {
  // This should be called before displayTemperatureGraph
  // Get the current temperature data from wherever your "other thing" is getting it
  const currentTempElement = document.getElementById('currentTemperature'); // Adjust selector as needed
  
  if (currentTempElement) {
    const currentTemp = parseFloat(currentTempElement.textContent);
    
    // Update the interpolatedData to match this temperature for the current hour
    const currentHour = new Date().getHours();
    interpolatedData.interpolatedTemps[currentHour] = currentTemp.toFixed(1);
  }
  
  // Now call the display function with synchronized data
  displayTemperatureGraph(interpolatedData);
}




// Display forecast graph using interpolated temperature data for a month
function displayForecastGraph(interpolatedData) {
  const ctx = document.getElementById('forecastChart').getContext('2d');
  const forecastTemps = interpolatedData.interpolatedTemps.slice(0, 14).map((temp, index) => ({
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
              label: '14-Day Forecast Temperature (°F)',
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
  
  if (!Array.isArray(forecastData) || forecastData.length === 0) {
    console.error("No precipitation data available");
    return;
  }

  // Include today and the next 5 days (6 days total)
  const forecastPrecip = forecastData.slice(0, 6).map((day, index) => {
      const precip = day?.day?.totalprecip_in ?? 0;
      const precipProb = day?.day?.precip_probability_in ?? 0; // Assuming the data includes precipitation probability
      return {
          time: new Date(Date.now() + index * 86400000).toLocaleDateString(), // Adjusting time format for today and next 5 days
          precip: precip,
          precipProb: precipProb, // Store precipitation probability
      };
  });

  // Create a gradient for precipitation bars
  const gradient = ctx.createLinearGradient(0, 0, 0, 400); // Vertical gradient
  gradient.addColorStop(0, 'rgba(63, 122, 170, 0.5)');  // Light blue for light precipitation
  gradient.addColorStop(1, 'rgba(63, 122, 170, 1)');  // Darker blue for higher precipitation

  if (precipitationChart) {
      precipitationChart.destroy();
  }

  precipitationChart = new Chart(ctx, {
      type: 'bar',
      data: {
          labels: forecastPrecip.map(item => item.time),
          datasets: [
              {
                  label: 'Precipitation (in)',
                  data: forecastPrecip.map(item => item.precip),
                  backgroundColor: gradient,
                  borderColor: 'rgba(0, 0, 0, 0.2)',
                  borderWidth: 1,
                  borderRadius: 5,
              },
              {
                  label: 'Precipitation Probability (%)',
                  data: forecastPrecip.map(item => item.precipProb),
                  type: 'line', // Set the chart type to line for the probability
                  borderColor: 'rgba(255, 99, 132, 1)', // Red line for probability
                  backgroundColor: 'rgba(255, 99, 132, 0.2)', // Light red for line area
                  fill: true, // Fill the area under the line graph
                  borderWidth: 2,
                  tension: 0.3, // Smooth out the line curve
              }
          ]
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
              x: {
                  title: { display: true, text: 'Date' },
                  ticks: {
                      autoSkip: true,
                      maxRotation: 45, // Angle for date labels
                      minRotation: 45,
                  }
              },
              y: {
                  title: { display: true, text: 'Precipitation (in)' },
                  ticks: {
                      beginAtZero: true,
                      stepSize: 0.1, // Adjust step size for better readability
                  }
              },
              y2: {
                  title: { display: true, text: 'Precipitation Probability (%)' },
                  position: 'right', // Position on the right side for probability
                  ticks: {
                      beginAtZero: true,
                      max: 100, // Max value for probability
                      stepSize: 20,
                  }
              }
          },
          plugins: {
              legend: {
                  display: true,
                  position: 'top',
              },
              tooltip: {
                  mode: 'index',
                  intersect: false,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  titleColor: '#fff',
                  bodyColor: '#fff',
                  footerColor: '#fff',
                  footerFont: {
                      size: 12,
                  }
              }
          }
      }
  });
}




// Display wind compass
function displayWindCompass(weatherData) {
  // Replace the wind card content
  const windCardContent = document.getElementById('wind-card');
  
  // Get wind data
  const windSpeed = weatherData.current.wind_mph;
  const windDegree = weatherData.current.wind_degree;
  const windDir = weatherData.current.wind_dir;
  const feelsLike = weatherData.current.feelslike_f;
  const temp = weatherData.current.temp_f;
  const windChill = calculateWindChill(temp, windSpeed);
  
  // Create compass container
  windCardContent.innerHTML = `
    <div class="wind-container">
      <div class="wind-data">
        <div class="data-row">
          <div class="data-item">
            <h4>Wind Speed</h4>
            <p>${windSpeed} mph</p>
          </div>
          <div class="data-item">
            <h4>Direction</h4>
            <p>${windDir} (${windDegree}°)</p>
          </div>
        </div>
        <div class="data-row">
          <div class="data-item">
            <h4>Wind Chill</h4>
            <p>${windChill}°F</p>
          </div>
          <div class="data-item">
            <h4>Feels Like</h4>
            <p>${feelsLike}°F</p>
          </div>
        </div>
      </div>
      
      <div class="compass-container">
        <div class="compass">
          <div class="compass-cardinal">
            <span class="north">N</span>
            <span class="east">E</span>
            <span class="south">S</span>
            <span class="west">W</span>
          </div>
          <div class="arrow" style="transform: rotate(${windDegree}deg)"></div>
        </div>
      </div>
    </div>
  `;
  
  
  
  // Add styles to the document
  if (!document.getElementById('wind-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'wind-styles';
    styleElement.textContent = `
      .wind-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        padding: 1rem;
      }
      
      .wind-data {
        width: 100%;
        margin-bottom: 1.5rem;
      }
      
      .data-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
      }
      
      .data-item {
        text-align: center;
        flex: 1;
      }
      
      .data-item h4 {
        margin-bottom: 0.3rem;
        font-size: 0.9rem;
        color: #666;
      }
      
      .data-item p {
        font-size: 1.1rem;
        font-weight: bold;
        margin: 0;
      }
      
      .compass-container {
        position: relative;
        width: 200px;
        height: 200px;
      }
      
      .compass {
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: linear-gradient(to bottom, #f5f5f5, #e0e0e0);
        border: 2px solid #ccc;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .compass-cardinal {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
      }
      
      .compass-cardinal span {
        position: absolute;
        font-weight: bold;
        font-size: 1rem;
      }
      
      .compass-cardinal .north {
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .compass-cardinal .south {
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .compass-cardinal .east {
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
      }
      
      .compass-cardinal .west {
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
      }
      
      .arrow {
        position: relative;
        width: 6px;
        height: 80px;
        background-color: #ff5722;
        clip-path: polygon(50% 0, 100% 80%, 50% 100%, 0 80%);
        transform-origin: center 70%;
        transition: transform 1s ease-in-out;
      }
      
      @media (max-width: 768px) {
        .wind-container {
          flex-direction: column;
        }
        
        .compass-container {
          width: 160px;
          height: 160px;
          margin-top: 1rem;
        }
        
        .arrow {
          height: 65px;
        }
      }
    `;
    document.head.appendChild(styleElement);
  }
}

// Calculate wind chill formula
function calculateWindChill(temp, windSpeed) {
  // If you don't have this function, here's a simple implementation
  if (temp <= 50 && windSpeed >= 3) {
    const windChill = 35.74 + (0.6215 * temp) - (35.75 * Math.pow(windSpeed, 0.16)) + (0.4275 * temp * Math.pow(windSpeed, 0.16));
    return Math.round(windChill * 10) / 10; // Round to 1 decimal place
  } else {
    return temp; // No wind chill if temp > 50°F or wind speed < 3 mph
  }
}

let weatherData = {
  current: {
    wind_mph: 15,
    wind_degree: 90,
    wind_dir: "E",
    feelslike_f: 65,
    temp_f: 70
  }
};

function toggleCard(cardId) {
  console.log("Toggling card:", cardId); // Debugging line
  const card = document.getElementById(cardId).closest(".card");
  const overlay = document.getElementById("overlay");

  if (card.classList.contains("expanded")) {
    card.classList.remove("expanded");
    overlay.style.display = "none";
  } else {
    // Close any other expanded card before opening a new one
    document.querySelectorAll(".card").forEach(c => c.classList.remove("expanded"));
    card.classList.add("expanded");
    overlay.style.display = "block";

    // If opening the wind card, ensure the wind compass is displayed
    if (cardId === "wind-card") {
      console.log("Displaying wind compass"); // Debugging line
      displayWindCompass(weatherData); // Inject compass into the card
    }
  }
}

// Close on overlay click
document.addEventListener("click", function (event) {
  const expandedCard = document.querySelector(".expanded");
  const overlay = document.getElementById("overlay");

  if (expandedCard && !expandedCard.contains(event.target) && !event.target.closest(".card-header")) {
    expandedCard.classList.remove("expanded");
    overlay.style.display = "none";
  }
});



// Add this function to your code
// Function to fetch weather data

async function fetchWeather(input) {
  try {
    loadingSpinner.classList.remove('hidden');

    let latitude, longitude;

    // Check if input is defined and not empty
    if (!input || typeof input !== 'string') {
      // Fetch weather for the user's current location using ipinfo.io
      let locationResponse = await fetch(`https://ipinfo.io/json?token=${IPINFO_API_KEY}`);
      let locationData = await locationResponse.json();

      // Use city, region (state), and country from ipinfo.io
      const city = locationData.city;
      const state = locationData.region;
      const country = locationData.country;

      // Construct the input string for the weather API
      input = `${city}, ${state}, ${country}`;
      console.log('Using current location:', input);

      // Use coordinates from ipinfo.io
      const [lat, lon] = locationData.loc.split(',').map(Number);
      latitude = lat;
      longitude = lon;
      console.log('Using coordinates from ipinfo.io:', latitude, longitude);
    } else {
      // For search input, parse the input and fetch coordinates
      const parts = input.split(',').map(part => part.trim());
      let city, state, country;

      if (parts.length === 3) {
        // Three parts entered (city, state, country)
        city = parts[0];
        state = parts[1];
        country = parts[2];
      } else if (parts.length === 2) {
        // Two parts entered (city and state, or city and country)
        city = parts[0];
        // Check if the second part is a state or country
        if (isUSState(parts[1])) {
          state = parts[1];
          country = 'US'; // Default to US if state is provided
        } else {
          country = parts[1];
        }
      } else if (parts.length === 1) {
        // One part entered (city, country, or continent)
        const singleInput = parts[0];
        if (isContinent(singleInput)) {
          // Handle continent search
          country = await getCountryInContinent(singleInput);
          city = ''; // No specific city
        } else {
          // Assume it's a city or country
          city = singleInput;
        }
      } else {
        throw new Error('Invalid input format. Please enter: City, State, Country');
      }

      // Log the parsed values
      console.log('Parsed City:', city);
      console.log('Parsed State:', state);
      console.log('Parsed Country:', country);

      // Fetch coordinates using WeatherAPI
      try {
        const coords = await fetchCityCoordinates(city, state, country);
        latitude = coords.latitude;
        longitude = coords.longitude;
        console.log('Using coordinates from WeatherAPI:', latitude, longitude);
      } catch (error) {
        console.error('Failed to fetch coordinates:', error);
        throw new Error('Failed to fetch coordinates for the specified location.');
      }
    }

    // Fetch weather data using the coordinates
    const weatherResponse = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&days=3&aqi=no&alerts=yes`);
    const weatherData = await weatherResponse.json();

    // Log the full API response
    console.log('Full API Response:', weatherData);

    const elevation = await getElevation(latitude, longitude);
    console.log('Elevation:', elevation);

    const forecastWeatherData = await fetchNASAWeatherData(latitude, longitude);

    let interpolatedData;
    try {
      const stations = await getWeatherStations(latitude, longitude);
      console.log('Nearby stations:', stations);

      if (stations && stations.length > 0) {
        const nearestStation = stations[0];
        console.log('Using nearest station:', nearestStation);
        interpolatedData = interpolateWeatherData(weatherData.current, forecastWeatherData, elevation, nearestStation, latitude, longitude);
      } else {
        console.warn('No nearby weather stations found. Using default interpolation.');
        interpolatedData = interpolateWeatherData(weatherData.current, forecastWeatherData, elevation, null, latitude, longitude);
      }
    } catch (error) {
      console.warn('Error fetching weather stations:', error);
      console.warn('Proceeding without station data.');
      interpolatedData = interpolateWeatherData(weatherData.current, forecastWeatherData, elevation, null, latitude, longitude);
    }

    // Get wind speed from current weather data
    const windSpeed = weatherData.current.wind_mph;
    console.log('Wind Speed:', windSpeed);

    // Get alerts from weather data
    const weatherAlertData = weatherData.alerts?.alert || [];
    console.log('Weather Alerts:', weatherAlertData);

    interpolatedData.windSpeed = windSpeed;
    interpolatedData.alerts = weatherAlertData;

    console.log('Interpolated weather data:', interpolatedData);

    // Debugging: Log the adjusted temperature before updating the UI
    console.log('Adjusted Temperature (before UI update):', interpolatedData.currentTemp);

    // Display the location name
    let locationName = '';
    if (weatherData.location.name) locationName += weatherData.location.name;
    if (weatherData.location.region) locationName += `, ${weatherData.location.region}`;
    if (weatherData.location.country) locationName += `, ${weatherData.location.country}`;
    cityName.textContent = locationName;

    // Display weather data
    temperature.textContent = `Temperature: ${interpolatedData.currentTemp}°F`;
    weatherCondition.textContent = `Condition: ${interpolatedData.condition}`;
    document.getElementById('wind-speed').textContent = `Wind Speed: ${interpolatedData.windSpeed} mph`;
    uvIndex.textContent = `UV Index: ${interpolatedData.uvIndex}`;
    
    // Process and display alerts
    if (interpolatedData.alerts.length > 0) {
      const alert = interpolatedData.alerts[0];
      weatherAlerts.textContent = `Alert: ${alert.headline || alert.event || 'Weather alert active'}`;
    } else {
      weatherAlerts.textContent = 'No severe weather alerts.';
    }

// Assuming you retrieve forecast data and wind direction correctly
const forecastData = weatherData.forecast.forecastday; // Get forecast data
const windDegrees = weatherData.current.wind_degree; // Get wind direction degrees

// Then, call your display functions
displayTemperatureGraph(interpolatedData);
displayForecastGraph(interpolatedData);
displayPrecipitationGraph(forecastData);
displayWindCompass(weatherData); // Call displayWindCompass instead of wind chart

} catch (error) {
  console.error('Error fetching weather data:', error);
  cityName.textContent = 'Error - Using adblockers (Switch to an incognito window)';
  temperature.textContent = '';
  weatherCondition.textContent = '';
  document.getElementById('wind-speed').textContent = '';
  uvIndex.textContent = '';
  weatherAlerts.textContent = error.message || 'Failed to fetch weather data.';
} finally {
  loadingSpinner.classList.add('hidden');
}
}

// Update the interpolateWeatherData function to include wind speed
function interpolateWeatherData(currentData, forecastData, elevation, station, cityLat, cityLon) {
  console.log("City Coordinates:", cityLat, cityLon); // Log city coordinates

  const baseTemperature = currentData.temp_f;
  let adjustedBaseTemperature;

  if (station) {
      console.log("Station Coordinates:", station.lat, station.lon); // Log station coordinates
      // Adjust temperature based on station distance
      adjustedBaseTemperature = adjustTemperatureBasedOnDistance(cityLat, cityLon, station.lat, station.lon, baseTemperature);
  } else {
      console.warn("No station data available. Using base temperature without distance adjustment.");
      adjustedBaseTemperature = baseTemperature;
  }

  // Interpolate between forecast data and adjusted temperature
  const interpolatedTemps = forecastData.map(temp => {
      const adjustedTemp = adjustTemperatureForElevation(temp * 1.8 + 32, elevation); // Convert °C to °F and adjust for elevation
      return ((adjustedBaseTemperature + adjustedTemp) / 2).toFixed(2); // Round to 2 decimal places
  });

  return {
      currentTemp: adjustedBaseTemperature.toFixed(2), // Round to 2 decimal places
      condition: currentData.condition.text,
      uvIndex: currentData.uv,
      windSpeed: currentData.wind_mph, // Add wind speed
      alerts: [], // This will be populated with actual alerts later
      interpolatedTemps: interpolatedTemps,
  };
}

// Helper function to check if a string is a US state
function isUSState(input) {
  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
    'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
    'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];
  return usStates.includes(input);
}

// Then add this event listener at the end of your code
searchBtn.addEventListener('click', () => {
  const input = cityInput.value.trim(); // Get the value from the input field
  if (input) {
    fetchWeather(input); // Pass the input to fetchWeather
  } else {
    alert('Please enter a location.'); // Handle empty input
  }
});

// You might also want to add this to automatically fetch weather when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // This calls the function without a city so it will use the user's location
  fetchWeather();
});