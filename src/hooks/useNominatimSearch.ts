import { useState } from 'react';

interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

interface NominatimState {
  results: SearchResult[];
  loading: boolean;
  error: string | null;
}

export const useNominatimSearch = () => {
  const [state, setState] = useState<NominatimState>({
    results: [],
    loading: false,
    error: null,
  });

  const searchPlaces = async (query: string, countryCode?: string) => {
    if (!query.trim()) {
      setState({ results: [], loading: false, error: null });
      return;
    }

    setState({ results: [], loading: true, error: null });

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '10',
        countrycodes: countryCode || 'IN', // Default to India
        addressdetails: '1',
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to search places');
      }

      const data: SearchResult[] = await response.json();
      
      setState({
        results: data,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState({
        results: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Search failed',
      });
    }
  };

  return { ...state, searchPlaces };
};