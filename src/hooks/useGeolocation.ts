import { useState, useEffect } from 'react';

interface GeolocationState {
  location: [number, number] | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        location: null,
        error: 'Geolocation is not supported by this browser.',
        loading: false,
      });
      return;
    }

    const success = (position: GeolocationPosition) => {
      setState({
        location: [position.coords.latitude, position.coords.longitude],
        error: null,
        loading: false,
      });
    };

    const error = (error: GeolocationPositionError) => {
      setState({
        location: null,
        error: error.message,
        loading: false,
      });
    };

    navigator.geolocation.getCurrentPosition(success, error, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });
  }, []);

  return state;
};