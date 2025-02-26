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
      console.log(`Day ${index + 2}: Precipitation = ${precip}`); // Log precipitation data
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
    const weatherResponse = await fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&aqi=no`);
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
    uvIndex.textContent = `UV Index: ${interpolatedData.uvIndex}`;
    weatherAlerts.textContent = interpolatedData.alerts.length ? interpolatedData.alerts[0].headline : 'No severe weather alerts.';

    displayTemperatureGraph(interpolatedData);
    displayForecastGraph(interpolatedData);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    cityName.textContent = 'Error - Using adblockers (Switch to an incognito window)'
    temperature.textContent = '';
    weatherCondition.textContent = '';
    uvIndex.textContent = '';
    weatherAlerts.textContent = error.message || 'Failed to fetch weather data.';
  } finally {
    loadingSpinner.classList.add('hidden');
  }
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