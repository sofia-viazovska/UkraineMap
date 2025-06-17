# Ukraine Map

An interactive web application for visualizing conflict data in Ukraine, including landmines, explosive remnants of war (ERW), and frontline positions.

## Overview

This application uses Leaflet.js to create an interactive map of Ukraine that displays various conflict-related data layers:

- Locations of landmine and ERW incidents with detailed information
- Heatmap showing the density of incidents
- Current frontline positions
- Historical frontline timeline with animation capabilities
- Land use changes showing damaged farmland, urban areas, and other land classifications
- City search functionality

## Installation

### Prerequisites

- Web server (local or remote)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/UkraineMap.git
   ```

2. If you want to use npm for development:
   ```
   npm install
   ```

3. For development with webpack:
   ```
   npm run dev
   ```

4. For production build:
   ```
   npm run build
   ```

5. Alternatively, you can simply open the `index.html` file in a web browser or serve the files using any web server.

## Usage

### Basic Navigation

- **Pan**: Click and drag the map
- **Zoom**: Use the mouse wheel or the zoom controls in the top-left corner
- **Switch Base Maps**: Use the layer control in the top-right corner to switch between "Dark Map" and "Google Hybrid" views

### Data Layers

The map includes several data layers that can be toggled using the layer control in the top-right corner:

- **EO incidents**: Markers showing individual explosive ordnance incidents
- **EO Density**: Heatmap showing the concentration of incidents
- **Frontline**: Current frontline position
- **Frontline Timeline**: Historical frontline positions that can be animated
- **Land Use Changes**: Polygons showing changes in land use due to the war

### Viewing Incident Details

Click on any incident marker to view detailed information about the event, including:
- Event type
- Date
- Location
- Fatalities
- Notes
- Source

### Viewing Land Use Details

Click on any land use polygon to view detailed information about the area, including:
- Land use type and status
- Location (Oblast)
- Area in hectares
- Damage percentage
- Cause of damage
- Previous and current use
- Additional notes

### Using the Timeline

The timeline control at the bottom of the screen allows you to view historical frontline positions:

1. Use the slider to manually select a date
2. Click the "Play" button to animate the frontline changes over time
3. Click "Pause" to stop the animation

### Searching for Cities

1. Click on the search icon in the top-left corner
2. Enter a city name in Ukraine
3. Select from the search results to zoom to that location

## Data Sources

- **Landmine/ERW Data**: Compiled from various sources including national media, international organizations, and local reports
- **Frontline Data**: Based on deepstatemap data, updated regularly
- **Land Use Data**: Compiled from satellite imagery analysis, field reports, and government assessments of war-affected areas
- **Base Maps**: CartoDB Dark Map and Google Hybrid

## Dependencies

- [Leaflet.js](https://leafletjs.com/) - Main mapping library
- [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat) - Heatmap plugin
- [Leaflet Control Geocoder](https://github.com/perliedman/leaflet-control-geocoder) - City search functionality

## License

This project is licensed under the terms specified in the LICENSE.txt file.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
