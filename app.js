// Main application
const audioEngine = new EnvironmentalAudioEngine();

let isRunning = false;
let locationWatchId = null;
let updateInterval = null;
let weatherFetchInterval = null;

// OpenWeatherMap API key - get your free key at https://openweathermap.org/api
const WEATHER_API_KEY = 'f021a3fc34dd1d322df919d299a246c6';

// Current environmental data
let currentData = {
    latitude: 0,
    longitude: 0,
    speed: 0,
    temperature: 20,
    weatherDescription: '',
    timeOfDay: 0.5
};

// DOM elements
const toggleBtn = document.getElementById('toggleBtn');
const statusEl = document.getElementById('status');
const latEl = document.getElementById('lat');
const lonEl = document.getElementById('lon');
const speedEl = document.getElementById('speed');
const tempEl = document.getElementById('temp');
const weatherEl = document.getElementById('weather');
const timeEl = document.getElementById('time');

// Initialize
toggleBtn.addEventListener('click', toggleAudio);

audioEngine.onFrequencyUpdate = (frequencies) => {
    frequencies.forEach((freq, i) => {
        const freqEl = document.getElementById(`freq${i}`);
        if (freqEl) {
            freqEl.textContent = `${freq.toFixed(1)} Hz`;
        }
    });
};

async function toggleAudio() {
    if (!isRunning) {
        await startAudio();
    } else {
        stopAudio();
    }
}

async function startAudio() {
    try {
        // Start audio engine FIRST (iOS requires this from direct user tap)
        statusEl.textContent = 'Starting audio...';
        statusEl.classList.add('active');
        await audioEngine.start();
        
        // Request location permission AFTER audio is initialized
        if (!navigator.geolocation) {
            alert('Geolocation not supported by your browser');
            audioEngine.stop();
            statusEl.classList.remove('active');
            return;
        }
        
        statusEl.textContent = 'Getting location...';
        
        // Start location tracking
        locationWatchId = navigator.geolocation.watchPosition(
            onLocationUpdate,
            onLocationError,
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            }
        );
        
        // Update time of day every second
        updateInterval = setInterval(updateTimeOfDay, 1000);
        
        // Fetch weather every 5 minutes
        fetchWeather();
        weatherFetchInterval = setInterval(fetchWeather, 5 * 60 * 1000);
        
        // Update UI
        toggleBtn.textContent = 'Stop';
        toggleBtn.classList.remove('btn-start');
        toggleBtn.classList.add('btn-stop');
        statusEl.textContent = 'Running';
        
        isRunning = true;
        
    } catch (error) {
        console.error('Error starting audio:', error);
        statusEl.textContent = 'Error: ' + error.message;
        statusEl.classList.remove('active');
    }
}

function stopAudio() {
    // Stop audio
    audioEngine.stop();
    
    // Stop location tracking
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }
    
    // Stop intervals
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
    
    if (weatherFetchInterval) {
        clearInterval(weatherFetchInterval);
        weatherFetchInterval = null;
    }
    
    // Update UI
    toggleBtn.textContent = 'Start';
    toggleBtn.classList.remove('btn-stop');
    toggleBtn.classList.add('btn-start');
    statusEl.textContent = 'Stopped';
    statusEl.classList.remove('active');
    
    isRunning = false;
}

function onLocationUpdate(position) {
    currentData.latitude = position.coords.latitude;
    currentData.longitude = position.coords.longitude;
    currentData.speed = position.coords.speed || 0;
    
    // Update UI
    latEl.textContent = `${currentData.latitude.toFixed(4)}°`;
    lonEl.textContent = `${currentData.longitude.toFixed(4)}°`;
    
    // Convert speed from m/s to mph
    const speedMph = currentData.speed * 2.237;
    speedEl.textContent = `${speedMph.toFixed(1)} mph`;
    
    // Update audio engine
    updateAudioEngine();
}

function onLocationError(error) {
    console.error('Location error:', error);
    statusEl.textContent = 'Location error: ' + error.message;
    
    // Use default location if permission denied
    if (error.code === error.PERMISSION_DENIED) {
        statusEl.textContent = 'Location permission denied - using defaults';
    }
}

function updateTimeOfDay() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    // Convert to 0.0-1.0 scale (0 = midnight, 0.5 = noon)
    currentData.timeOfDay = (hours + minutes / 60 + seconds / 3600) / 24;
    
    // Update UI
    timeEl.textContent = now.toLocaleTimeString();
    
    // Update audio engine
    updateAudioEngine();
}

async function fetchWeather() {
    if (WEATHER_API_KEY === 'YOUR_API_KEY_HERE') {
        console.log('Weather API key not set');
        weatherEl.textContent = 'API key needed';
        return;
    }
    
    if (!currentData.latitude || !currentData.longitude) {
        return;
    }
    
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${currentData.latitude}&lon=${currentData.longitude}&appid=${WEATHER_API_KEY}&units=metric`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Weather fetch failed');
        }
        
        const data = await response.json();
        currentData.temperature = data.main.temp;
        currentData.weatherDescription = data.weather[0].description;
        
        // Update UI
        tempEl.textContent = `${currentData.temperature.toFixed(1)}°C`;
        weatherEl.textContent = currentData.weatherDescription.charAt(0).toUpperCase() + 
                               currentData.weatherDescription.slice(1);
        
        // Update audio engine
        updateAudioEngine();
        
    } catch (error) {
        console.error('Weather fetch error:', error);
        weatherEl.textContent = 'Weather unavailable';
    }
}

function updateAudioEngine() {
    audioEngine.setEnvironmentalData(
        currentData.latitude,
        currentData.longitude,
        currentData.speed,
        currentData.temperature,
        currentData.timeOfDay
    );
}

// Wake lock for iOS to keep audio running
let wakeLock = null;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.log('Wake lock not supported:', err);
    }
}

// Request wake lock when starting
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

// Prevent iOS from sleeping during audio playback
document.addEventListener('touchstart', () => {
    if (isRunning && audioEngine.audioContext) {
        audioEngine.audioContext.resume();
    }
}, { passive: true });

// Initialize time display
updateTimeOfDay();
