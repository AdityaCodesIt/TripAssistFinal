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
  const { toast } = useToast();
  
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

  const handlePlaceSearch = () => {
    if (searchQuery.trim()) {
      searchPlaces(searchQuery, 'IN');
    }
  };

  const handleSubmitTrip = () => {
    console.log('Current trip data:', currentTrip);
    
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

    const newTrip: Trip = {
      id: Date.now().toString(),
      tripNumber: `TR${trips.length + 1}`,
      origin: currentTrip.origin || '',
      destination: currentTrip.destination || '',
      departureTime: currentTrip.departureTime || '',
      arrivalTime: currentTrip.arrivalTime || '',
      travelMode: currentTrip.travelMode || 'car',
      purpose: currentTrip.purpose || '',
      cost: currentTrip.cost || 0,
      companions: currentTrip.companions || 1,
      notes: currentTrip.notes || '',
      createdAt: new Date().toISOString(),
    };

    setTrips([...trips, newTrip]);
    setCurrentTrip({});
    
    toast({
      title: "Trip submitted successfully!",
      description: `Trip ${newTrip.tripNumber} has been recorded.`,
    });
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
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-travel bg-clip-text text-transparent">
            TripAssist Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Your complete travel data collection and assistance platform
          </p>
          {userLocation && (
            <Badge variant="secondary" className="gap-2">
              <MapPin className="h-4 w-4" />
              Location detected: {userLocation[0].toFixed(2)}, {userLocation[1].toFixed(2)}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="trips" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-card shadow-card">
            <TabsTrigger value="trips">Trip Entry</TabsTrigger>
            <TabsTrigger value="records">Trip Records</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="spots">Tourist Spots</TabsTrigger>
            <TabsTrigger value="chatbot">AI Assistant</TabsTrigger>
          </TabsList>

          {/* Trip Entry Tab */}
          <TabsContent value="trips">
            <Card className="shadow-card">
              <CardHeader className="bg-gradient-sky text-primary-foreground rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5" />
                  Submit New Trip
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origin">Origin</Label>
                    <Input
                      id="origin"
                      placeholder="Starting location"
                      value={currentTrip.origin || ''}
                      onChange={(e) => setCurrentTrip({ ...currentTrip, origin: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <Input
                      id="destination"
                      placeholder="Destination location"
                      value={currentTrip.destination || ''}
                      onChange={(e) => setCurrentTrip({ ...currentTrip, destination: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departure">Departure Time</Label>
                    <Input
                      id="departure"
                      type="datetime-local"
                      value={currentTrip.departureTime || ''}
                      onChange={(e) => setCurrentTrip({ ...currentTrip, departureTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arrival">Arrival Time</Label>
                    <Input
                      id="arrival"
                      type="datetime-local"
                      value={currentTrip.arrivalTime || ''}
                      onChange={(e) => setCurrentTrip({ ...currentTrip, arrivalTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travelMode">Travel Mode</Label>
                    <select
                      id="travelMode"
                      className="w-full p-2 border rounded-md"
                      value={currentTrip.travelMode || 'car'}
                      onChange={(e) => setCurrentTrip({ ...currentTrip, travelMode: e.target.value as any })}
                    >
                      <option value="car">Car</option>
                      <option value="plane">Plane</option>
                      <option value="train">Train</option>
                      <option value="bus">Bus</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose</Label>
                    <Input
                      id="purpose"
                      placeholder="Business, Leisure, etc."
                      value={currentTrip.purpose || ''}
                      onChange={(e) => setCurrentTrip({ ...currentTrip, purpose: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost ($)</Label>
                    <Input
                      id="cost"
                      type="number"
                      placeholder="0"
                      value={currentTrip.cost || ''}
                      onChange={(e) => setCurrentTrip({ ...currentTrip, cost: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companions">Number of Companions</Label>
                    <Input
                      id="companions"
                      type="number"
                      placeholder="1"
                      value={currentTrip.companions || ''}
                      onChange={(e) => setCurrentTrip({ ...currentTrip, companions: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information about the trip"
                    value={currentTrip.notes || ''}
                    onChange={(e) => setCurrentTrip({ ...currentTrip, notes: e.target.value })}
                  />
                </div>
                <Button 
                  onClick={handleSubmitTrip}
                  className="w-full bg-gradient-sky hover:opacity-90 shadow-travel"
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
                              ${trip.cost}
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
            <div className="space-y-6">
              {/* Search and Filters */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Find Tourist Spots Near You
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search tourist spots..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        placeholder="Radius (km)"
                        value={searchRadius}
                        onChange={(e) => setSearchRadius(Number(e.target.value))}
                      />
                    </div>
                    <Button onClick={handlePlaceSearch} disabled={searchLoading}>
                      {searchLoading ? 'Searching...' : 'Search'}
                    </Button>
                  </div>
                  
                  {locationLoading && (
                    <p className="text-sm text-muted-foreground">Getting your location...</p>
                  )}
                  
                  {locationError && (
                    <p className="text-sm text-destructive">Location access denied. Enable location for better results.</p>
                  )}
                </CardContent>
              </Card>

              {/* Map View - Temporarily disabled to fix render error */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Map View</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96 w-full rounded-lg bg-muted/20 grid place-items-center text-sm text-muted-foreground">
                    Map temporarily disabled - working on fix
                  </div>
                </CardContent>
              </Card>

              {/* Tourist Spots List */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Tourist Spots ({getFilteredTouristSpots().length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getFilteredTouristSpots().map((spot) => (
                      <div key={spot.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{spot.name}</h3>
                          <Badge 
                            variant={spot.cost_level === 'low' ? 'secondary' : spot.cost_level === 'medium' ? 'default' : 'destructive'}
                          >
                            {spot.cost_level} cost
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{spot.description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Badge variant="outline">{spot.category}</Badge>
                            {spot.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-current text-yellow-500" />
                                <span className="text-sm">{spot.rating}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{spot.location}</p>
                          {userLocation && (
                            <p className="text-xs text-muted-foreground">
                              Distance: {calculateDistance(
                                userLocation[0], userLocation[1],
                                spot.latitude, spot.longitude
                              ).toFixed(1)} km
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {getFilteredTouristSpots().length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No tourist spots found in your area.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Try increasing the search radius or adjusting your search terms.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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