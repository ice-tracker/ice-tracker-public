import { NextApiRequest, NextApiResponse } from "next";
import axios, { AxiosResponse, AxiosError } from "axios";

// Define the expected structure of the Google Maps Geocoding API response
interface GeocodingResponse {
  results: {
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    // Add other properties if needed, e.g., address_components, formatted_address
  }[];
  status: string; // e.g., "OK", "ZERO_RESULTS", "INVALID_REQUEST"
  error_message?: string; // Present if status is not "OK"
}

/**
 * Handles geocoding requests to convert an address into geographical coordinates (latitude and longitude).
 * This API route acts as a proxy to the Google Maps Geocoding API.
 *
 * @param {NextApiRequest} req - The Next.js API request object. Expected to have a 'GET' method and an 'address' query parameter.
 * @param {NextApiResponse} res - The Next.js API response object.
 * @returns {Promise<void>} A JSON response with geocoding data or an error message.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeocodingResponse | { error: string }>
): Promise<void> {
  // Ensure the request method is GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Extract the 'address' query parameter
  const { address } = req.query;

  // Validate that the address is provided
  if (!address || typeof address !== "string") {
    return res
      .status(400)
      .json({ error: "Address is required and must be a string" });
  }

  // Retrieve the Google Maps API key from environment variables
  const API_KEY: string | undefined = process.env.GMAPS_API_KEY;

  // Validate that the API key is set
  if (!API_KEY) {
    console.error("Google Maps API Key (GMAPS_API_KEY) is missing!");
    return res
      .status(500)
      .json({ error: "Server configuration error: API key missing" });
  }

  // Construct the URL for the Google Maps Geocoding API
  const url: string = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${API_KEY}`;

  try {
    // Make the request to the Google Maps Geocoding API
    const response: AxiosResponse<GeocodingResponse> = await axios.get(url);

    // Return the data received from the Google Maps API
    res.status(200).json(response.data);
  } catch (error: unknown) {
    // Use 'unknown' for caught errors
    // Log the error for debugging purposes
    console.error("Error fetching geocode:", error);

    // Determine the error message based on the type of error
    let errorMessage = "Failed to fetch geocode";
    if (axios.isAxiosError(error)) {
      // If it's an Axios error, check for a response from the API
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = `Geocoding API error: ${error.response.status} - ${
          error.response.statusText || JSON.stringify(error.response.data)
        }`;
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = "No response received from geocoding API.";
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = `Error setting up geocoding request: ${error.message}`;
      }
    } else if (error instanceof Error) {
      // General JavaScript error
      errorMessage = `An unexpected error occurred: ${error.message}`;
    }

    // Send a 500 Internal Server Error response
    res.status(500).json({ error: errorMessage });
  }
}
