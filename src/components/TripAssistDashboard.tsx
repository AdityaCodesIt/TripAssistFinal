import React, { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNominatimSearch } from '@/hooks/useNominatimSearch';
import { MapComponent } from '@/components/MapComponent';
import { MapErrorBoundary } from '@/components/MapErrorBoundary';
import ChatbotInterface from '@/components/ChatbotInterface';
import { MapPin, Clock, Car, Plane, Train, Bus, Trash2, MessageCircle, Star, PlusCircle, Bot, Calendar, Users, DollarSign, Search } from 'lucide-react';

interface Trip {
  id: string;
  tripNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  travelMode: 'car' | 'plane' | 'train' | 'bus';
  purpose: string;
  cost: number;
  companions: number;
  notes?: string;
  createdAt: string;
}

interface Feedback {
  id: string;
  tripId: string;
  problems: string;
  comments: string;
  rating: number;
  createdAt: string;
}

interface TouristSpot {
  id: string;
  name: string;
  description: string;
  cost_level: 'low' | 'medium' | 'high';
  category: string;
  latitude: number;
  longitude: number;
  location: string;
  rating?: number;
}

const TripAssistDashboard: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Partial<Trip>>({});
  const [currentFeedback, setCurrentFeedback] = useState<Partial<Feedback>>({});
  const [touristSpots, setTouristSpots] = useState<TouristSpot[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchRadius, setSearchRadius] = useState<number>(50); // km
  const [spotSearchQuery, setSpotSearchQuery] = useState<string>('');
  const [spotsLoading, setSpotsLoading] = useState<boolean>(false);

  // Fixed tourist spots data for Bhayander Station
  const bhayaderSpots = [
    { 
      name: 'Uttan Beach', 
      cost: 'medium', 
      distance: '10.1 km',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100&h=80&fit=crop&crop=center'
    },
    { 
      name: 'Ghodbunder Fort', 
      cost: 'free', 
      distance: '14.5 km',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=100&h=80&fit=crop&crop=center'
    },
    { 
      name: 'Gorai Beach', 
      cost: 'low', 
      distance: '13.7 km',
      image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=100&h=80&fit=crop&crop=center'
    },
    { 
      name: 'Water Kingdom', 
      cost: 'medium', 
      distance: '16.4 km',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=100&h=80&fit=crop&crop=center'
    },
    { 
      name: 'Khadi Sunset Point', 
      cost: 'free', 
      distance: '950 m',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=80&fit=crop&crop=center'
    },
    { 
      name: 'Global Vipassana Pagoda', 
      cost: 'free', 
      distance: '16.4 km',
      image: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=100&h=80&fit=crop&crop=center'
    },
    { 
      name: 'Maxus Mall', 
      cost: 'medium', 
      distance: '2.4 km',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=80&fit=crop&crop=center'
    },
    { 
      name: 'Sanjay Gandhi National Park', 
      cost: 'low', 
      distance: '10.8 km',
      image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=100&h=80&fit=crop&crop=center'
    },
    { 
      name: 'Shri Radhagiridhari Temple, ISKCON', 
      cost: 'free', 
      distance: '5.9 km',
      image: 'https://images.unsplash.com/photo-1580619305218-8423a7ef79b4?w=100&h=80&fit=crop&crop=center'
    },
    { 
      name: 'Our Lady of Velankanni Shrine, Bhatebunder (Uttan)', 
      cost: 'free', 
      distance: '11.4 km',
      image: 'https://images.unsplash.com/photo-1520637836862-4d197d17c9a4?w=100&h=80&fit=crop&crop=center'
    },
    { 
      name: 'Gaimukh Chowpatty', 
      cost: 'low', 
      distance: '14.5 km',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100&h=80&fit=crop&crop=center'
    },
    { 
      name: 'Shree L R Tiwari College of Engineering', 
      cost: 'free', 
      distance: '3.6 km',
      image: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=100&h=80&fit=crop&crop=center'
    }
  ];
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Use the geolocation hook
  const { location: userLocation, error: locationError, loading: locationLoading } = useGeolocation();
  const { results: searchResults, searchPlaces, loading: searchLoading } = useNominatimSearch();

  // Fetch tourist spots from database
  useEffect(() => {
    const fetchTouristSpots = async () => {
      try {
        const { data, error } = await supabase
          .from('tourist_spots')
          .select('*')
          .order('rating', { ascending: false });

        if (error) {
          console.error('Error fetching tourist spots:', error);
          return;
        }

        setTouristSpots((data || []).map(spot => ({
          ...spot,
          cost_level: spot.cost_level as 'low' | 'medium' | 'high'
        })));
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchTouristSpots();
  }, []);

  // Fetch user's trips from database
  useEffect(() => {
    const fetchTrips = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching trips:', error);
          return;
        }

        // Convert database trips to local Trip format
        const formattedTrips: Trip[] = (data || []).map(trip => ({
          id: trip.id,
          tripNumber: `TR${trip.trip_number}`,
          origin: trip.origin,
          destination: trip.destination,
          departureTime: new Date(trip.start_time).toISOString().slice(0, 16),
          arrivalTime: new Date(trip.end_time).toISOString().slice(0, 16),
          travelMode: trip.mode as 'car' | 'plane' | 'train' | 'bus',
          purpose: trip.additional_notes?.split('\n')[0]?.replace('Purpose: ', '') || '',
          cost: 0, // Extract from notes if needed
          companions: 1, // Extract from notes if needed
          notes: trip.additional_notes || '',
          createdAt: trip.created_at,
        }));

        setTrips(formattedTrips);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchTrips();
  }, [user]);

  // Show location-related toasts
  useEffect(() => {
    if (userLocation) {
      toast({
        title: "Location detected",
        description: "Your current location has been detected for better recommendations.",
      });
    }
    if (locationError) {
      toast({
        title: "Location access denied",
        description: "Please enable location access for better travel recommendations.",
        variant: "destructive",
      });
    }
  }, [userLocation, locationError, toast]);

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  };

  // Filter tourist spots based on user location and search
  const getFilteredTouristSpots = (): TouristSpot[] => {
    let filtered = touristSpots;

    // Filter by distance if user location is available
    if (userLocation) {
      filtered = filtered.filter(spot => {
        const distance = calculateDistance(
          userLocation[0], userLocation[1],
          spot.latitude, spot.longitude
        );
        return distance <= searchRadius;
      });
    }

    // Filter by search query if provided
    if (searchQuery.trim()) {
      filtered = filtered.filter(spot =>
        spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  // Filter Bhayander spots based on search - only show results for "Bhayander station"
  const getFilteredBhayaderSpots = () => {
    if (!spotSearchQuery.trim()) return [];
    
    const query = spotSearchQuery.toLowerCase();
    
    // Only show results if searching for "bhayander station"
    if (query.includes('bhayander') && query.includes('station')) {
      return bhayaderSpots;
    }
    
    // Return empty array for any other search
    return [];
  };

  // Handle spot search with loading
  const handleSpotSearch = (value: string) => {
    setSpotSearchQuery(value);
    
    const query = value.toLowerCase();
    if (query.includes('bhayander') && query.includes('station')) {
      setSpotsLoading(true);
      // Simulate loading for 1.5 seconds
      setTimeout(() => {
        setSpotsLoading(false);
      }, 1500);
    } else {
      setSpotsLoading(false);
    }
  };

  const handlePlaceSearch = () => {
    if (searchQuery.trim()) {
      searchPlaces(searchQuery, 'IN');
    }
  };

  const handleSubmitTrip = async () => {
    console.log('Current trip data:', currentTrip);
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit trips.",
        variant: "destructive",
      });
      return;
    }
    
    // Check required fields
    if (!currentTrip.origin?.trim() || 
        !currentTrip.destination?.trim() || 
        !currentTrip.travelMode ||
        !currentTrip.departureTime ||
        !currentTrip.arrivalTime ||
        !currentTrip.purpose?.trim()) {
      
      const missingFields = [];
      if (!currentTrip.origin?.trim()) missingFields.push('Origin');
      if (!currentTrip.destination?.trim()) missingFields.push('Destination');
      if (!currentTrip.travelMode) missingFields.push('Travel Mode');
      if (!currentTrip.departureTime) missingFields.push('Departure Time');
      if (!currentTrip.arrivalTime) missingFields.push('Arrival Time');
      if (!currentTrip.purpose?.trim()) missingFields.push('Purpose');
      
      console.log('Missing fields:', missingFields);
      
      toast({
        title: "Missing information",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the next trip number from database
      const { data: existingTrips, error: countError } = await supabase
        .from('trips')
        .select('trip_number')
        .eq('user_id', user.id)
        .order('trip_number', { ascending: false })
        .limit(1);

      if (countError) {
        console.error('Error getting trip count:', countError);
        toast({
          title: "Error",
          description: "Could not determine trip number.",
          variant: "destructive",
        });
        return;
      }

      const nextTripNumber = existingTrips && existingTrips.length > 0 
        ? existingTrips[0].trip_number + 1 
        : 1;

      // Convert datetime-local format to ISO string
      const startTime = new Date(currentTrip.departureTime!).toISOString();
      const endTime = new Date(currentTrip.arrivalTime!).toISOString();
      
      const tripData = {
        user_id: user.id,
        trip_number: nextTripNumber,
        origin: currentTrip.origin!.trim(),
        destination: currentTrip.destination!.trim(),
        mode: currentTrip.travelMode!,
        start_time: startTime,
        end_time: endTime,
        additional_notes: `Purpose: ${currentTrip.purpose}${currentTrip.notes ? `\nNotes: ${currentTrip.notes}` : ''}${currentTrip.cost ? `\nCost: ₹${currentTrip.cost}` : ''}${currentTrip.companions ? `\nCompanions: ${currentTrip.companions}` : ''}`
      };

      console.log('Submitting trip data:', tripData);

      const { data, error } = await supabase
        .from('trips')
        .insert([tripData])
        .select();

      if (error) {
        console.error('Error saving trip:', error);
        toast({
          title: "Error saving trip",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('Trip saved successfully:', data);
      
      // Update local state with the new trip
      if (data && data[0]) {
        const newTrip: Trip = {
          id: data[0].id,
          tripNumber: `TR${data[0].trip_number}`,
          origin: data[0].origin,
          destination: data[0].destination,
          departureTime: new Date(data[0].start_time).toISOString().slice(0, 16),
          arrivalTime: new Date(data[0].end_time).toISOString().slice(0, 16),
          travelMode: data[0].mode as 'car' | 'plane' | 'train' | 'bus',
          purpose: currentTrip.purpose || '',
          cost: currentTrip.cost || 0,
          companions: currentTrip.companions || 1,
          notes: currentTrip.notes || '',
          createdAt: data[0].created_at,
        };
        
        setTrips([...trips, newTrip]);
      }
      
      setCurrentTrip({});
      
      toast({
        title: "Trip submitted successfully!",
        description: "Your trip has been saved to the database.",
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving the trip.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTrip = (tripId: string) => {
    setTrips(trips.filter(trip => trip.id !== tripId));
    toast({
      title: "Trip deleted",
      description: "The trip has been removed from your records.",
    });
  };

  const handleSubmitFeedback = () => {
    if (!currentFeedback.problems || !currentFeedback.rating) {
      toast({
        title: "Missing information",
        description: "Please provide feedback and rating.",
        variant: "destructive",
      });
      return;
    }

    const newFeedback: Feedback = {
      id: Date.now().toString(),
      tripId: currentFeedback.tripId || '',
      problems: currentFeedback.problems || '',
      comments: currentFeedback.comments || '',
      rating: currentFeedback.rating || 1,
      createdAt: new Date().toISOString(),
    };

    setFeedback([...feedback, newFeedback]);
    setCurrentFeedback({});
    
    toast({
      title: "Feedback submitted!",
      description: "Thank you for your valuable feedback.",
    });
  };


  const getTravelModeIcon = (mode: string) => {
    switch (mode) {
      case 'plane': return <Plane className="h-4 w-4" />;
      case 'train': return <Train className="h-4 w-4" />;
      case 'bus': return <Bus className="h-4 w-4" />;
      default: return <Car className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 sm:space-y-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-travel bg-clip-text text-transparent">
            TripAssist Dashboard
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg px-2">
            Your complete travel data collection and assistance platform
          </p>
          {userLocation && (
            <Badge variant="secondary" className="gap-2 text-xs sm:text-sm">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              Location detected: {userLocation[0].toFixed(2)}, {userLocation[1].toFixed(2)}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="trips" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 bg-card shadow-card h-auto p-1">
            <TabsTrigger value="trips" className="text-xs sm:text-sm">Trip Entry</TabsTrigger>
            <TabsTrigger value="records" className="text-xs sm:text-sm">Records</TabsTrigger>
            <TabsTrigger value="feedback" className="text-xs sm:text-sm">Feedback</TabsTrigger>
            <TabsTrigger value="spots" className="text-xs sm:text-sm">Spots</TabsTrigger>
            <TabsTrigger value="chatbot" className="text-xs sm:text-sm">AI Assistant</TabsTrigger>
          </TabsList>

          {/* Trip Entry Tab */}
          <TabsContent value="trips">
            <Card className="shadow-card">
              <CardHeader className="bg-gradient-sky text-primary-foreground rounded-t-lg p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  Submit New Trip
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                {/* Essential Fields Section */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="origin" className="text-sm font-medium">Origin *</Label>
                      <Input
                        id="origin"
                        placeholder="Starting location"
                        value={currentTrip.origin || ''}
                        onChange={(e) => setCurrentTrip({ ...currentTrip, origin: e.target.value })}
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destination" className="text-sm font-medium">Destination *</Label>
                      <Input
                        id="destination"
                        placeholder="Destination location"
                        value={currentTrip.destination || ''}
                        onChange={(e) => setCurrentTrip({ ...currentTrip, destination: e.target.value })}
                        className="h-10 sm:h-11"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="departure" className="text-sm font-medium">Departure Time *</Label>
                      <Input
                        id="departure"
                        type="datetime-local"
                        value={currentTrip.departureTime || ''}
                        onChange={(e) => setCurrentTrip({ ...currentTrip, departureTime: e.target.value })}
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="arrival" className="text-sm font-medium">Arrival Time *</Label>
                      <Input
                        id="arrival"
                        type="datetime-local"
                        value={currentTrip.arrivalTime || ''}
                        onChange={(e) => setCurrentTrip({ ...currentTrip, arrivalTime: e.target.value })}
                        className="h-10 sm:h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="travelMode" className="text-sm font-medium">Travel Mode *</Label>
                      <select
                        id="travelMode"
                        className="w-full h-10 sm:h-11 p-2 border border-input rounded-md bg-background text-sm"
                        value={currentTrip.travelMode || 'car'}
                        onChange={(e) => setCurrentTrip({ ...currentTrip, travelMode: e.target.value as any })}
                      >
                        <option value="car">🚗 Car</option>
                        <option value="plane">✈️ Plane</option>
                        <option value="train">🚆 Train</option>
                        <option value="bus">🚌 Bus</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purpose" className="text-sm font-medium">Purpose *</Label>
                      <Input
                        id="purpose"
                        placeholder="Business, Leisure, etc."
                        value={currentTrip.purpose || ''}
                        onChange={(e) => setCurrentTrip({ ...currentTrip, purpose: e.target.value })}
                        className="h-10 sm:h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Fields - Collapsible on Mobile */}
                <details className="sm:block">
                  <summary className="sm:hidden cursor-pointer text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    Additional Details (Optional)
                    <span className="text-xs">▼</span>
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cost" className="text-sm font-medium">Cost (₹)</Label>
                      <Input
                        id="cost"
                        type="number"
                        placeholder="0"
                        value={currentTrip.cost || ''}
                        onChange={(e) => setCurrentTrip({ ...currentTrip, cost: Number(e.target.value) })}
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companions" className="text-sm font-medium">Number of Companions</Label>
                      <Input
                        id="companions"
                        type="number"
                        placeholder="1"
                        value={currentTrip.companions || ''}
                        onChange={(e) => setCurrentTrip({ ...currentTrip, companions: Number(e.target.value) })}
                        className="h-10 sm:h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-3 sm:mt-4">
                    <Label htmlFor="notes" className="text-sm font-medium">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any additional information about the trip"
                      value={currentTrip.notes || ''}
                      onChange={(e) => setCurrentTrip({ ...currentTrip, notes: e.target.value })}
                      className="min-h-20 sm:min-h-24"
                    />
                  </div>
                </details>

                <Button 
                  onClick={handleSubmitTrip}
                  className="w-full bg-gradient-sky hover:opacity-90 shadow-travel h-11 sm:h-12 text-sm sm:text-base font-medium"
                >
                  Submit Trip
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trip Records Tab */}
          <TabsContent value="records">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Trip Records ({trips.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Trip #</th>
                        <th className="text-left p-2">Route</th>
                        <th className="text-left p-2">Mode</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Cost</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trips.map((trip) => (
                        <tr key={trip.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <Badge variant="outline">{trip.tripNumber}</Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {trip.origin} → {trip.destination}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {getTravelModeIcon(trip.travelMode)}
                              {trip.travelMode}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {new Date(trip.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              ₹{trip.cost}
                            </div>
                          </td>
                          <td className="p-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Trip</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete trip {trip.tripNumber}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteTrip(trip.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {trips.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No trips recorded yet. Submit your first trip to get started!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback">
            <Card className="shadow-card">
              <CardHeader className="bg-gradient-sunset text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Travel Feedback & Problems
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="problems">What problems did you face during your travels?</Label>
                    <Textarea
                      id="problems"
                      placeholder="Describe any issues, delays, or challenges you encountered..."
                      value={currentFeedback.problems || ''}
                      onChange={(e) => setCurrentFeedback({ ...currentFeedback, problems: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comments">Additional Comments</Label>
                    <Textarea
                      id="comments"
                      placeholder="Any other feedback or suggestions..."
                      value={currentFeedback.comments || ''}
                      onChange={(e) => setCurrentFeedback({ ...currentFeedback, comments: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overall Experience Rating</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Button
                          key={rating}
                          variant={currentFeedback.rating === rating ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentFeedback({ ...currentFeedback, rating })}
                          className="gap-2"
                        >
                          <Star className="h-4 w-4" />
                          {rating}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button 
                    onClick={handleSubmitFeedback}
                    className="w-full bg-gradient-sunset hover:opacity-90"
                  >
                    Submit Feedback
                  </Button>
                </div>

                {/* Feedback History */}
                {feedback.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h3 className="text-lg font-semibold">Previous Feedback</h3>
                    {feedback.map((fb) => (
                      <div key={fb.id} className="border rounded-lg p-4 bg-muted/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">
                            {Array.from({ length: fb.rating }, (_, i) => (
                              <Star key={i} className="h-3 w-3 fill-current" />
                            ))}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(fb.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm mb-2"><strong>Problems:</strong> {fb.problems}</p>
                        {fb.comments && <p className="text-sm"><strong>Comments:</strong> {fb.comments}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tourist Spots Tab */}
          <TabsContent value="spots">
            <Card className="shadow-card">
              <CardHeader className="bg-gradient-sunset text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Top Tourist Spots
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tourist spots..."
                    value={spotSearchQuery}
                    onChange={(e) => handleSpotSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Loading State */}
                {spotsLoading && (
                  <div className="flex items-center justify-center py-8 space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">Finding famous tourist spots near your location...</p>
                  </div>
                )}

                {/* Tourist Spots List */}
                {!spotsLoading && (
                  <>
                    <div className="space-y-3">
                      {getFilteredBhayaderSpots().map((spot, index) => (
                        <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card">
                          <div className="flex items-center gap-3">
                            <img 
                              src={spot.image} 
                              alt={spot.name}
                              className="w-16 h-12 object-cover rounded-md flex-shrink-0"
                              loading="lazy"
                            />
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">{spot.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {spot.cost === 'free' ? 'Free cost' : spot.cost ? `${spot.cost.charAt(0).toUpperCase() + spot.cost.slice(1)} cost` : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium text-primary">{spot.distance}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {getFilteredBhayaderSpots().length === 0 && spotSearchQuery.trim() && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          {spotSearchQuery.toLowerCase().includes('bhayander') && spotSearchQuery.toLowerCase().includes('station') 
                            ? 'No tourist spots found matching your search.' 
                            : 'No information available for this location. Try searching for "Bhayander Station".'}
                        </p>
                      </div>
                    )}
                    
                    {!spotSearchQuery.trim() && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Search for "Bhayander Station" to see tourist spots.</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Chatbot Tab */}
          <TabsContent value="chatbot">
            <Card className="shadow-card">
              <CardHeader className="bg-gradient-sky text-primary-foreground rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Travel Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[600px]">
                  <ChatbotInterface />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TripAssistDashboard;