// Main JavaScript file for Ukraine Map application

// Global variables
const sourcePath = './'; // Set to the relative path from the root of the application

// Initialize the map centered on Ukraine
const ukraineMap = L.map('map').setView([49.8397, 31.7604], 6);

// Add tile layers
const darkMap = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
    attribution: 'CartoDB',
    name: 'Dark Map'
});

const googleHybrid = L.tileLayer('http://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    attribution: 'Google',
    name: 'Google Hybrid'
}).addTo(ukraineMap);

//Create a base layers object for the layer control
const baseLayers = {
    "Dark Map": darkMap,
    "Google Hybrid": googleHybrid
};

// Create an overlay layers object for the layer control
const overlays = {};

// Layer control removed as per requirement
// L.control.layers(overlays).addTo(ukraineMap);

// Function to parse CSV data
async function parseCSV(csvPath) {
    try {
        const response = await fetch(csvPath);
        const csvText = await response.text();

        // Simple CSV parser
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(header => header.trim());

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;

            const values = lines[i].split(',');
            const row = {};

            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = values[j] ? values[j].trim() : '';
            }

            data.push(row);
        }

        return data;
    } catch (error) {
        console.error('Error parsing CSV:', error);
        return [];
    }
}

// Function to add marker group from CSV with popup
async function addMarkersFromCSV(mapObj, csvPath, labelColumn = 'sub_event_type') {
    try {
        const data = await parseCSV(csvPath);

        // Create a feature group for the markers
        const markerGroup = L.featureGroup().addTo(mapObj);

        // Add to overlays for layer control
        overlays['EO incidents'] = markerGroup;

        // Create custom icon
        let customIcon;
        try {
            customIcon = L.icon({
                iconUrl: sourcePath + 'img/Exclamation_point.png', // Path to the icon image
                iconSize: [8, 8], // Size of the icon
                iconAnchor: [4, 4], // Point of the icon which corresponds to marker's location
                popupAnchor: [0, -4] // Point from which the popup should open relative to the iconAnchor
            });
        } catch (error) {
            console.warn('Custom icon not found, using default icon');
            customIcon = new L.Icon.Default();
        }

        // Add markers for each row in the CSV
        data.forEach(row => {
            const lat = parseFloat(row.latitude);
            const lon = parseFloat(row.longitude);

            if (isNaN(lat) || isNaN(lon)) return;

            const label = row[labelColumn] || 'Unknown';

            // Create popup content
            const popupContent = `
                <b>${label}</b><br>
                <b>Event Date:</b> ${row.event_date || 'N/A'}<br>
                <b>Oblast:</b> ${row.admin1 || 'N/A'}<br>
                <b>Location:</b> ${row.location || 'N/A'}<br>
                <b>Fatalities:</b> ${row.fatalities || 'N/A'}<br>
                <b>Notes:</b> ${row.notes || 'N/A'}<br>
                <b>Actor 1:</b> ${row.actor1 || 'N/A'}<br>
                <b>Actor 2:</b> ${row.actor2 || 'N/A'}<br>
                <b>Source:</b> ${row.source || 'N/A'}<br>
            `;

            // Create marker with popup
            L.marker([lat, lon], { icon: customIcon })
                .bindPopup(popupContent, { maxWidth: 300 })
                .addTo(markerGroup);
        });

        return markerGroup;
    } catch (error) {
        console.error('Error adding markers from CSV:', error);
        return null;
    }
}

// Function to add heatmap from CSV with legend
async function addHeatmapFromCSV(mapObj, csvPath, legendTitle = 'Density of incidents related to ERW') {
    try {
        // Check if the heatmap plugin is available
        if (!L.heatLayer) {
            console.error('Leaflet.heat plugin is not loaded. Please include leaflet-heat.js');
            return null;
        }

        const data = await parseCSV(csvPath);

        // Prepare heat data
        const heatData = data
            .map(row => {
                const lat = parseFloat(row.latitude);
                const lon = parseFloat(row.longitude);
                return isNaN(lat) || isNaN(lon) ? null : [lat, lon];
            })
            .filter(point => point !== null);

        // Create heatmap layer
        const heatmap = L.heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
        }).addTo(mapObj);

        // Add to overlays for layer control
        overlays['EO Density'] = heatmap;

        // Add a simple legend
        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = `
                <h4>${legendTitle}</h4>
                <div class="legend-gradient"></div>
                <div class="legend-labels">
                    <span>Low</span>
                    <span>High</span>
                </div>
            `;
            return div;
        };

        legend.addTo(mapObj);

        return heatmap;
    } catch (error) {
        console.error('Error adding heatmap from CSV:', error);
        return null;
    }
}

// Function to add frontline from GeoJSON file
async function addFrontlineFromGeoJSON(mapObj, geoJSONPath) {
    try {
        // Fetch the GeoJSON data
        const response = await fetch(geoJSONPath);
        const geoJSONData = await response.json();

        // Extract date from the GeoJSON name property if available
        let frontlineDate = "Unknown";
        if (geoJSONData.name && geoJSONData.name.includes("_")) {
            // Try to extract date from name like "deepstatemap_data_20250613"
            const datePart = geoJSONData.name.split("_").pop();
            if (datePart && datePart.length === 8) {
                // Format from YYYYMMDD to YYYY-MM-DD
                const year = datePart.substring(0, 4);
                const month = datePart.substring(4, 6);
                const day = datePart.substring(6, 8);
                frontlineDate = `${year}-${month}-${day}`;
            }
        }

        // Create a GeoJSON layer with styling and click event
        const frontlineLayer = L.geoJSON(geoJSONData, {
            style: {
                color: 'red',         // Red line color
                weight: 2,            // Line weight
                opacity: 1,           // Line opacity
                fillColor: '#ffcccb', // Light red fill
                fillOpacity: 0.3      // Fill opacity
            },
            onEachFeature: function(feature, layer) {
                // Add click event to show date
                layer.on('click', function(e) {
                    // Create popup with formatted date
                    const formattedDate = formatDate(frontlineDate);
                    L.popup()
                        .setLatLng(e.latlng)
                        .setContent(`<b>Frontline Date:</b> ${formattedDate}`)
                        .openOn(mapObj);
                });
            }
        }).addTo(mapObj);

        // Add to overlays for potential layer control
        overlays['Frontline'] = frontlineLayer;

        return frontlineLayer;
    } catch (error) {
        console.error('Error adding frontline from GeoJSON:', error);
        return null;
    }
}

// Function to add frontline timeline from individual GeoJSON files in a directory
async function addFrontlineTimelineFromDirectory(mapObj, directoryPath) {
    try {
        // Create a layer group to hold the timeline layers
        const timelineLayerGroup = L.layerGroup().addTo(mapObj);

        // Get list of files in the directory
        const response = await fetch(`${directoryPath}/`);
        const files = await listFilesInDirectory(directoryPath);

        // Extract dates from filenames and sort them
        const dates = files
            .filter(file => file.endsWith('.geojson'))
            .map(file => {
                // Extract date from filename (format: deepstatemap_data_YYYYMMDD.geojson)
                const datePart = file.split('_').pop().split('.')[0];
                if (datePart && datePart.length === 8) {
                    // Format from YYYYMMDD to YYYY-MM-DD
                    const year = datePart.substring(0, 4);
                    const month = datePart.substring(4, 6);
                    const day = datePart.substring(6, 8);
                    return `${year}-${month}-${day}`;
                }
                return null;
            })
            .filter(date => date !== null)
            .sort((a, b) => new Date(a) - new Date(b));

        // Create a map to store file paths by date
        const filePathsByDate = {};

        // Map dates to file paths
        dates.forEach(date => {
            // Convert YYYY-MM-DD to YYYYMMDD
            const datePart = date.replace(/-/g, '');
            const filePath = `${directoryPath}/deepstatemap_data_${datePart}.geojson`;
            filePathsByDate[date] = filePath;
        });

        // Create a map to store layers by date (will be populated on-demand)
        const layersByDate = {};

        // Add to overlays for potential layer control
        overlays['Frontline Timeline'] = timelineLayerGroup;

        // Create timeline control with lazy loading
        createFastTimelineControl(mapObj, dates, filePathsByDate, layersByDate, timelineLayerGroup);

        return timelineLayerGroup;
    } catch (error) {
        console.error('Error adding frontline timeline from directory:', error);
        return null;
    }
}

// Helper function to list files in a directory
async function listFilesInDirectory(directoryPath) {
    try {
        // In a real environment, we would use a server-side API to list files
        // For this implementation, we'll manually return the list of files
        // based on the pattern we observed in the datatimeline folder

        // Generate a list of filenames based on the pattern deepstatemap_data_YYYYMMDD.geojson
        const files = [];

        // Start date: 2024-07-08
        // End date: 2025-06-17
        const startDate = new Date('2024-07-08');
        const endDate = new Date('2025-06-17');

        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            files.push(`deepstatemap_data_${year}${month}${day}.geojson`);
        }

        return files;
    } catch (error) {
        console.error('Error listing files in directory:', error);
        return [];
    }
}

// Function to create timeline control
function createTimelineControl(mapObj, dates, layersByDate, layerGroup) {
    // Create timeline container
    const timelineContainer = L.DomUtil.create('div', 'timeline-container');
    timelineContainer.id = 'timeline-container';
    document.body.appendChild(timelineContainer);

    // Create timeline control
    const timelineControl = L.DomUtil.create('div', 'timeline-control', timelineContainer);
    timelineControl.id = 'timeline-control';

    // Create play button
    const playButton = L.DomUtil.create('button', '', timelineControl);
    playButton.id = 'play-button';
    playButton.textContent = 'Play';

    // Create timeline slider
    const timelineSlider = L.DomUtil.create('input', '', timelineControl);
    timelineSlider.id = 'timeline-slider';
    timelineSlider.type = 'range';
    timelineSlider.min = 0;
    timelineSlider.max = dates.length - 1;
    timelineSlider.value = 0;

    // Create date display
    const dateDisplay = L.DomUtil.create('div', '', timelineControl);
    dateDisplay.id = 'date-display';
    dateDisplay.textContent = formatDate(dates[0]);

    // Function to update the displayed layer
    function updateLayer(index) {
        // Clear the layer group
        layerGroup.clearLayers();

        // Add the selected layer to the group
        const date = dates[index];
        layersByDate[date].addTo(layerGroup);

        // Update the date display
        dateDisplay.textContent = formatDate(date);
    }

    // Initialize with the first date
    updateLayer(0);

    // Add event listener for slider change
    timelineSlider.addEventListener('input', function() {
        const index = parseInt(this.value);
        updateLayer(index);
    });

    // Play functionality
    let isPlaying = false;
    let playInterval;

    playButton.addEventListener('click', function() {
        if (isPlaying) {
            // Stop playing
            clearInterval(playInterval);
            playButton.textContent = 'Play';
            isPlaying = false;
        } else {
            // Start playing
            playButton.textContent = 'Pause';
            isPlaying = true;

            let currentIndex = parseInt(timelineSlider.value);

            playInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % dates.length;
                timelineSlider.value = currentIndex;
                updateLayer(currentIndex);

                // If we've reached the end, stop playing
                if (currentIndex === dates.length - 1) {
                    clearInterval(playInterval);
                    playButton.textContent = 'Play';
                    isPlaying = false;
                }
            }, 1000); // Change every second
        }
    });

    return timelineControl;
}

// Function to create a faster timeline control with lazy loading
async function createFastTimelineControl(mapObj, dates, filePathsByDate, layersByDate, layerGroup) {
    // Create timeline container
    const timelineContainer = L.DomUtil.create('div', 'timeline-container');
    timelineContainer.id = 'timeline-container';
    document.body.appendChild(timelineContainer);

    // Create timeline control
    const timelineControl = L.DomUtil.create('div', 'timeline-control', timelineContainer);
    timelineControl.id = 'timeline-control';

    // Create play button
    const playButton = L.DomUtil.create('button', '', timelineControl);
    playButton.id = 'play-button';
    playButton.textContent = 'Play';

    // Create timeline slider
    const timelineSlider = L.DomUtil.create('input', '', timelineControl);
    timelineSlider.id = 'timeline-slider';
    timelineSlider.type = 'range';
    timelineSlider.min = 0;
    timelineSlider.max = dates.length - 1;
    timelineSlider.value = 0;

    // Create date display
    const dateDisplay = L.DomUtil.create('div', '', timelineControl);
    dateDisplay.id = 'date-display';
    dateDisplay.textContent = formatDate(dates[0]);

    // Function to load a layer for a specific date
    async function loadLayer(date) {
        // If the layer is already loaded, return it
        if (layersByDate[date]) {
            return layersByDate[date];
        }

        try {
            // Fetch the GeoJSON data for this date
            const filePath = filePathsByDate[date];
            const response = await fetch(filePath);
            const geoJSONData = await response.json();

            // Create a GeoJSON layer with green styling and click event
            const layer = L.geoJSON(geoJSONData, {
                style: {
                    color: 'green',       // Green line color
                    weight: 2,            // Line weight
                    opacity: 1,           // Line opacity
                    fillColor: '#90EE90', // Light green fill
                    fillOpacity: 0.3      // Fill opacity
                },
                onEachFeature: function(feature, layerItem) {
                    // Add click event to show date
                    layerItem.on('click', function(e) {
                        // Create popup with formatted date
                        const formattedDate = formatDate(date);
                        L.popup()
                            .setLatLng(e.latlng)
                            .setContent(`<b>Frontline Date:</b> ${formattedDate}`)
                            .openOn(mapObj);
                    });
                }
            });

            // Cache the layer
            layersByDate[date] = layer;
            return layer;
        } catch (error) {
            console.error(`Error loading layer for date ${date}:`, error);
            return null;
        }
    }

    // Function to update the displayed layer
    async function updateLayer(index) {
        // Show loading indicator
        dateDisplay.textContent = 'Loading...';

        // Clear the layer group
        layerGroup.clearLayers();

        // Get the date for this index
        const date = dates[index];

        // Load the layer if needed
        const layer = await loadLayer(date);

        if (layer) {
            // Add the layer to the group
            layer.addTo(layerGroup);
        }

        // Update the date display
        dateDisplay.textContent = formatDate(date);
    }

    // Initialize with the first date
    await updateLayer(0);

    // Preload the next few layers for smoother experience
    for (let i = 1; i < Math.min(5, dates.length); i++) {
        loadLayer(dates[i]);
    }

    // Add event listener for slider change
    timelineSlider.addEventListener('input', function() {
        const index = parseInt(this.value);
        updateLayer(index);
    });

    // Play functionality with faster animation
    let isPlaying = false;
    let playInterval;
    const playSpeed = 100; // milliseconds between frames (twice faster)

    playButton.addEventListener('click', function() {
        if (isPlaying) {
            // Stop playing
            clearInterval(playInterval);
            playButton.textContent = 'Play';
            isPlaying = false;
        } else {
            // Start playing
            playButton.textContent = 'Pause';
            isPlaying = true;

            let currentIndex = parseInt(timelineSlider.value);

            // Preload the next several frames for smoother playback
            const preloadCount = 10;
            for (let i = 1; i <= preloadCount; i++) {
                const preloadIndex = (currentIndex + i) % dates.length;
                loadLayer(dates[preloadIndex]);
            }

            playInterval = setInterval(async () => {
                currentIndex = (currentIndex + 1) % dates.length;
                timelineSlider.value = currentIndex;
                await updateLayer(currentIndex);

                // Preload the next frame
                const nextIndex = (currentIndex + preloadCount) % dates.length;
                loadLayer(dates[nextIndex]);

                // If we've reached the end, stop playing
                if (currentIndex === dates.length - 1) {
                    clearInterval(playInterval);
                    playButton.textContent = 'Play';
                    isPlaying = false;
                }
            }, playSpeed);
        }
    });

    return timelineControl;
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Function to add city search control
function addCitySearchControl(mapObj) {
    try {
        // Create a geocoder control
        const geocoder = L.Control.geocoder({
            defaultMarkGeocode: false,
            position: 'topleft',
            placeholder: 'Search for a city...',
            errorMessage: 'Nothing found.',
            geocoder: L.Control.Geocoder.nominatim({
                geocodingQueryParams: {
                    countrycodes: 'ua', // Limit search to Ukraine
                    viewbox: '22.0,44.0,40.0,52.5', // Bounding box for Ukraine
                    bounded: 1
                }
            })
        }).addTo(mapObj);

        // Handle the geocoding result
        geocoder.on('markgeocode', function(e) {
            const bbox = e.geocode.bbox;
            const poly = L.polygon([
                bbox.getSouthEast(),
                bbox.getNorthEast(),
                bbox.getNorthWest(),
                bbox.getSouthWest()
            ]);

            // Fit the map to the bounds of the result
            mapObj.fitBounds(poly.getBounds());

            // Add a marker at the result location
            L.marker(e.geocode.center)
                .addTo(mapObj)
                .bindPopup(e.geocode.name)
                .openPopup();
        });

        return geocoder;
    } catch (error) {
        console.error('Error adding city search control:', error);
        return null;
    }
}

// Function to add land use data from GeoJSON
async function addLandUseFromGeoJSON(mapObj, geoJSONPath) {
    try {
        // Fetch the GeoJSON data
        const response = await fetch(geoJSONPath);
        const geoJSONData = await response.json();

        // Define color mapping for different land use types
        const landUseColors = {
            'farmland': '#E8D06D',      // Light yellow
            'urban': '#C0C0C0',         // Silver
            'forest': '#228B22',         // Forest green
            'industrial': '#8B4513',     // Brown
            'wetland': '#6495ED',        // Cornflower blue
            'orchard': '#98FB98',        // Pale green
            'infrastructure': '#708090', // Slate gray
            'grassland': '#7CFC00',      // Lawn green
            'vineyard': '#9370DB',       // Medium purple
            'water body': '#1E90FF'      // Dodger blue
        };

        // Define color mapping for different statuses
        const statusOpacity = {
            'damaged': 0.6,
            'severely damaged': 0.7,
            'destroyed': 0.8,
            'contaminated': 0.5,
            'mined': 0.4,
            'partially damaged': 0.5,
            'recovering': 0.3,
            'abandoned': 0.2,
            'rebuilding': 0.4,
            'repurposed': 0.5,
            'heavily damaged': 0.7,
            'reconstructed': 0.3
        };

        // Create a GeoJSON layer with styling based on land use type and status
        const landUseLayer = L.geoJSON(geoJSONData, {
            style: function(feature) {
                const landUseType = feature.properties.landuse_type;
                const status = feature.properties.status;
                const color = landUseColors[landUseType] || '#808080'; // Default gray
                const opacity = statusOpacity[status] || 0.5; // Default opacity

                return {
                    color: '#000',       // Black border
                    weight: 1,           // Border weight
                    opacity: 0.8,        // Border opacity
                    fillColor: color,    // Fill color based on land use type
                    fillOpacity: opacity // Fill opacity based on status
                };
            },
            onEachFeature: function(feature, layer) {
                // Create popup content with detailed information
                const props = feature.properties;
                const popupContent = `
                    <div class="land-use-popup">
                        <h3>${props.landuse_type.toUpperCase()} - ${props.status}</h3>
                        <p><strong>Location:</strong> ${props.oblast} Oblast</p>
                        <p><strong>Area:</strong> ${props.area_hectares} hectares</p>
                        <p><strong>Damage:</strong> ${props.damage_percent}%</p>
                        <p><strong>Cause:</strong> ${props.damage_cause}</p>
                        <p><strong>Previous use:</strong> ${props.previous_use}</p>
                        <p><strong>Current use:</strong> ${props.current_use}</p>
                        <p><strong>Notes:</strong> ${props.notes}</p>
                    </div>
                `;

                // Add click event to show popup
                layer.bindPopup(popupContent, { maxWidth: 300 });
            }
        }).addTo(mapObj);

        // Add to overlays for layer control
        overlays['Land Use Changes'] = landUseLayer;

        // Add a legend for land use types
        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'info legend land-use-legend');
            div.innerHTML = '<h4>Land Use Types</h4>';

            // Add legend items for each land use type
            for (const [type, color] of Object.entries(landUseColors)) {
                div.innerHTML += `
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: ${color}"></span>
                        <span class="legend-label">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                    </div>
                `;
            }

            return div;
        };

        legend.addTo(mapObj);

        return landUseLayer;
    } catch (error) {
        console.error('Error adding land use data from GeoJSON:', error);
        return null;
    }
}

// Load data when the page is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Add marker group from CSV
    await addMarkersFromCSV(ukraineMap, sourcePath + 'data/Ukraine_landmine_ERW_only.csv', 'sub_event_type');

    // Add heatmap from CSV
    await addHeatmapFromCSV(ukraineMap, sourcePath + 'data/Ukraine_landmine_ERW_only.csv');

    // Add frontline from GeoJSON
    await addFrontlineFromGeoJSON(ukraineMap, sourcePath + 'data/frontline.json');

    // Add land use data from GeoJSON
    await addLandUseFromGeoJSON(ukraineMap, sourcePath + 'data/landuse.json');

    // Add frontline timeline from directory of individual GeoJSON files
    await addFrontlineTimelineFromDirectory(ukraineMap, sourcePath + 'datatimeline');

    // Add city search control
    addCitySearchControl(ukraineMap);

    // Layer control removed as per requirement
    L.control.layers(baseLayers, overlays).addTo(ukraineMap);
});


//deploy
