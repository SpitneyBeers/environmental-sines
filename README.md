# Environmental Sines - Web App

A web-based audio synthesizer that generates eight sine waves across different octave ranges, modulated by GPS location, movement speed, weather data, and time of day. Designed to work on iOS devices (iPhone) using Web Audio API.

## Features

- **8 sine wave generators** spanning A1 (55Hz) to A8 (7040Hz)
- **GPS integration** via browser Geolocation API
- **Real-time speed tracking** from GPS velocity
- **Weather data** from OpenWeatherMap API
- **Time-based modulation** using local device time
- **Works on iPhone** in Safari browser
- **No app store needed** - just open in browser

## Frequency Mappings

Each sine wave is centered on an A note and can drift within a range:

1. **A1 (55 Hz)** - Latitude controlled, ±10%
2. **A2 (110 Hz)** - Longitude controlled, ±10%
3. **A3 (220 Hz)** - Speed controlled, ±20%
4. **A4 (440 Hz)** - Temperature controlled, ±15%
5. **A5 (880 Hz)** - Time of day controlled, ±15%
6. **A6 (1760 Hz)** - Latitude + Speed combined, ±25%
7. **A7 (3520 Hz)** - Longitude + Temperature combined, ±25%
8. **A8 (7040 Hz)** - All parameters combined, ±30%

## Setup

### Option 1: Local File (No Server Required)

1. Download all files to a folder
2. Open `index.html` directly in Safari on your iPhone
3. Allow location permissions when prompted
4. Tap "Start" to begin

### Option 2: Web Server (Recommended for full features)

**Using Python:**
```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Using Node.js:**
```bash
npx http-server -p 8000
```

**Using PHP:**
```bash
php -S localhost:8000
```

Then open on your iPhone: `http://YOUR_COMPUTER_IP:8000`

### Option 3: Deploy Online

Deploy to any static hosting service:
- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

Just upload all files and access via the provided URL.

## Weather API Setup (Optional)

To enable temperature-based modulation:

1. Sign up for free at https://openweathermap.org/api
2. Get your API key (free tier allows 1000 calls/day)
3. Open `app.js`
4. Replace `'YOUR_API_KEY_HERE'` with your actual key:
   ```javascript
   const WEATHER_API_KEY = 'your_actual_key_here';
   ```
5. Weather will update every 5 minutes

**Note:** The app works without weather data (uses default 20°C).

## Usage

### On iPhone:

1. Open Safari and navigate to the web app
2. Tap "Start"
3. Grant location permissions when prompted
4. The app will begin generating sound
5. Move around to hear frequency changes
6. Lock screen works - audio continues playing

### Tips:

- **Use headphones** for best experience
- **Walk/drive around** to hear spatial changes
- **Different times of day** affect the A5 oscillator
- **Temperature changes** affect the A4 oscillator
- **Speed changes** are most noticeable in A3

## Technical Details

### Web Audio API
- 8 sine wave oscillators using OscillatorNode
- Smooth frequency transitions (100ms exponential ramp)
- 8% gain per oscillator to prevent clipping
- Automatic context resume for iOS

### Geolocation API
- High accuracy mode enabled
- Continuous position tracking
- Speed calculated from GPS velocity
- Updates trigger frequency recalculation

### Browser Compatibility
- **Safari (iOS)** - Full support ✓
- **Chrome (Android)** - Full support ✓
- **Desktop browsers** - Works but limited GPS

### Performance
- Minimal CPU usage
- Low battery impact
- Works with screen locked
- No data storage/cookies

## Customization

### Modify Frequency Ranges

In `audio-engine.js`, adjust the multiplication factors in `updateFrequencies()`:

```javascript
// Example: Make A3 respond more dramatically to speed
this.currentFrequencies[2] = this.baseFrequencies[2] * (0.6 + speedNorm * 0.8);
// Now drifts ±40% instead of ±20%
```

### Change Base Frequencies

Edit the `baseFrequencies` array:

```javascript
// Use different notes (e.g., C major scale across octaves)
this.baseFrequencies = [65.4, 130.8, 261.6, 523.3, 1046.5, 2093, 4186, 8372];
```

### Adjust Update Rates

In `app.js`:

```javascript
// Weather updates (default: 5 minutes)
weatherFetchInterval = setInterval(fetchWeather, 10 * 60 * 1000); // 10 min

// Time updates (default: 1 second)
updateInterval = setInterval(updateTimeOfDay, 500); // 0.5 sec
```

### Add New Oscillators

1. Add to `baseFrequencies` array in `audio-engine.js`
2. Add frequency calculation in `updateFrequencies()`
3. Add HTML element in `index.html`
4. Adjust gain to maintain overall volume (currently 0.08 per osc)

## Troubleshooting

**No sound:**
- Check volume/mute switch on iPhone
- Try unplugging/replugging headphones
- Refresh page and tap Start again
- Check Safari settings: Settings > Safari > Advanced > Experimental Features

**Location not working:**
- Settings > Safari > Location Services > While Using
- Try in a different physical location (GPS needs clear sky view)
- Check airplane mode is off

**Frequencies not changing:**
- Move more than 5 meters to trigger GPS update
- Wait a few minutes for weather data
- Check console for errors (Safari > Develop > iPhone > Console)

**Battery drain:**
- Normal for GPS + audio apps
- Use Low Power Mode when not actively testing
- Stop the app when not in use

## Files Included

- `index.html` - Main HTML structure
- `styles.css` - Visual styling
- `audio-engine.js` - Web Audio synthesis engine
- `app.js` - Main application logic
- `README.md` - This file

## Browser Requirements

- **iOS Safari 14+** (iOS 14 added better Web Audio support)
- **Android Chrome 90+**
- **Desktop browsers** (limited functionality)

## Privacy

- Location data never leaves your device
- No analytics or tracking
- Weather API only receives lat/lon coordinates
- No data is stored or transmitted

## License

Free to use and modify for your experimental audio projects.

## Credits

Inspired by experimental music practices using environmental data as compositional material.
