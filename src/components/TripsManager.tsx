import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Download, Trash2, Edit, Calendar, MapPin, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

interface Trip {
  id: string;
  user_id: string;
  trip_number: number;
  origin: string;
  destination: string;
  mode: string;
  start_time: string;
  end_time: string;
  additional_notes: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export function TripsManager() {
  const { user, isScientist, isAdmin } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user, isScientist]);

  const fetchTrips = async () => {
    try {
      let query = supabase.from('trips').select('*');

      // If user is not a scientist/admin, only show their own trips
      if (!isScientist()) {
        query = query.eq('user_id', user?.id);
      }

      const { data: tripsData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // If we have trips and user is scientist/admin, fetch user profiles for display
      if (tripsData && tripsData.length > 0 && isScientist()) {
        const userIds = [...new Set(tripsData.map(trip => trip.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        // Merge profile data with trips
        const tripsWithProfiles = tripsData.map(trip => ({
          ...trip,
          profiles: profilesData?.find(profile => profile.user_id === trip.user_id) || null
        }));
        
        setTrips(tripsWithProfiles || []);
      } else {
        setTrips(tripsData || []);
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const tripData = {
      user_id: user?.id,
      trip_number: parseInt(formData.get('trip_number') as string),
      origin: formData.get('origin') as string,
      destination: formData.get('destination') as string,
      mode: formData.get('mode') as string,
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
      additional_notes: formData.get('additional_notes') as string || null,
    };

    try {
      if (editingTrip) {
        const { error } = await supabase
          .from('trips')
          .update(tripData)
          .eq('id', editingTrip.id);
        
        if (error) throw error;
        toast.success('Trip updated successfully');
      } else {
        const { error } = await supabase
          .from('trips')
          .insert(tripData);
        
        if (error) throw error;
        toast.success('Trip added successfully');
      }

      setIsDialogOpen(false);
      setEditingTrip(null);
      fetchTrips();
    } catch (error: any) {
      console.error('Error saving trip:', error);
      toast.error(error.message || 'Failed to save trip');
    }
  };

  const handleDelete = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;
      toast.success('Trip deleted successfully');
      fetchTrips();
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip');
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Trip Number', 'Origin', 'Destination', 'Mode', 'Start Time', 'End Time', 'Notes', 'User Email'].join(','),
      ...trips.map(trip => [
        trip.trip_number,
        trip.origin,
        trip.destination,
        trip.mode,
        trip.start_time,
        trip.end_time,
        trip.additional_notes || '',
        trip.profiles?.email || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trips_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openEditDialog = (trip: Trip) => {
    setEditingTrip(trip);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingTrip(null);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading trips...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Trip Data {isScientist() && '(All Users)'}
            </CardTitle>
            <CardDescription>
              Manage and view trip records
              {isScientist() && ' from all users'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isScientist() && trips.length > 0 && (
              <Button onClick={exportData} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Trip
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingTrip ? 'Edit Trip' : 'Add New Trip'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTrip ? 'Update trip details' : 'Enter the details for your new trip'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="trip_number">Trip Number</Label>
                      <Input
                        id="trip_number"
                        name="trip_number"
                        type="number"
                        required
                        defaultValue={editingTrip?.trip_number}
                      />
                    </div>
                    <div>
                      <Label htmlFor="mode">Mode</Label>
                      <Select name="mode" defaultValue={editingTrip?.mode} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="car">Car</SelectItem>
                          <SelectItem value="bus">Bus</SelectItem>
                          <SelectItem value="train">Train</SelectItem>
                          <SelectItem value="plane">Plane</SelectItem>
                          <SelectItem value="bike">Bike</SelectItem>
                          <SelectItem value="walk">Walk</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="origin">Origin</Label>
                      <Input
                        id="origin"
                        name="origin"
                        required
                        defaultValue={editingTrip?.origin}
                      />
                    </div>
                    <div>
                      <Label htmlFor="destination">Destination</Label>
                      <Input
                        id="destination"
                        name="destination"
                        required
                        defaultValue={editingTrip?.destination}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        name="start_time"
                        type="datetime-local"
                        required
                        defaultValue={editingTrip ? format(new Date(editingTrip.start_time), "yyyy-MM-dd'T'HH:mm") : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        name="end_time"
                        type="datetime-local"
                        required
                        defaultValue={editingTrip ? format(new Date(editingTrip.end_time), "yyyy-MM-dd'T'HH:mm") : ''}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="additional_notes">Additional Notes</Label>
                    <Textarea
                      id="additional_notes"
                      name="additional_notes"
                      placeholder="Optional notes about the trip"
                      defaultValue={editingTrip?.additional_notes || ''}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingTrip ? 'Update' : 'Add'} Trip
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {trips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No trips found</h3>
              <p>Add your first trip to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip #</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    {isScientist() && <TableHead>User</TableHead>}
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell className="font-medium">
                        <Badge variant="secondary">#{trip.trip_number}</Badge>
                      </TableCell>
                      <TableCell>{trip.origin}</TableCell>
                      <TableCell>{trip.destination}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{trip.mode}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {format(new Date(trip.start_time), 'MMM dd, HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {format(new Date(trip.end_time), 'MMM dd, HH:mm')}
                        </div>
                      </TableCell>
                      {isScientist() && (
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <User className="h-3 w-3" />
                            {trip.profiles?.full_name || trip.profiles?.email}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="max-w-[200px] truncate">
                        {trip.additional_notes || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {trip.user_id === user?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(trip)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {(trip.user_id === user?.id || isAdmin()) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(trip.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}