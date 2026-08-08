/**
 * Geocoding service using OpenStreetMap Nominatim API.
 * 
 * Note: Nominatim has a usage limit of 1 request per second.
 * Make sure to debounce calls to these functions in the UI.
 */

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
  area: string; // neighborhood or suburb
};

const USER_AGENT = 'EdumentX-App/1.0';
const BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Forward geocode a place name to coordinates.
 * Appends ', Kathmandu, Nepal' to the query.
 * 
 * @param query The place name to search for
 * @returns Array of matching locations
 */
export async function geocodePlace(query: string): Promise<GeocodeResult[]> {
  const searchQuery = `${query}, Kathmandu, Nepal`;
  const url = `${BASE_URL}/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=5`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });
    
    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }
    
    const data = await response.json();
    
    return data.map((item: any) => ({
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      displayName: item.display_name,
      area: item.address?.suburb || item.address?.neighbourhood || '',
    }));
  } catch (error) {
    console.error('Error during geocoding:', error);
    return [];
  }
}

/**
 * Reverse geocode coordinates to an area name string.
 * 
 * @param lat Latitude
 * @param lng Longitude
 * @returns Area name string (suburb or neighborhood)
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `${BASE_URL}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });
    
    if (!response.ok) {
      throw new Error('Reverse geocoding request failed');
    }
    
    const data = await response.json();
    return data.address?.suburb || data.address?.neighbourhood || data.display_name || 'Unknown Area';
  } catch (error) {
    console.error('Error during reverse geocoding:', error);
    return 'Unknown Area';
  }
}
