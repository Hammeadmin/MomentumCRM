import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Filter,
  Grid3X3,
  List,
  Clock,
  User,
  MapPin,
  FileText,
  Briefcase,
  X,
  Edit,
  Trash2,
  AlertCircle,
  RefreshCw,
  Copy,
  Bell,
  GripVertical,
  Users,
  TrendingUp,
  Eye,
  Package,
  CheckCircle,
  Mail,
  Link2 as LinkIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  createRecurringEvents,
  checkEventConflict,
  formatSwedishDate,
  formatSwedishTime,
  formatSwedishDateTime,
  getWeekNumber,
  getMonthDays,
  getWeekDays,
  getTimeSlots,
  isToday,
  isSameMonth,
  isSameDay,
  getEventsForDay,
  getEventsForWeek,
  SWEDISH_MONTHS,
  SWEDISH_DAYS_SHORT,
  SWEDISH_DAYS_LONG,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  type CalendarEventWithRelations,
  type CalendarFilters,
  canUserViewCalendar,
  canUserCreateEventFor,
  getCalendarPermissionMessage,
  syncEventToGoogle,
  checkGoogleCalendarEnabled
} from '../lib/calendar';
import { getTeamMembers, getLeads, getCustomerCities, getUserProfiles } from '../lib/database';
import { getOrders } from '../lib/orders';
import { updateOrder } from '../lib/orders';
import { updateLead } from '../lib/leads';
import { getTeams, getUserTeams, type TeamWithRelations } from '../lib/teams';
import { sendEmail } from '../lib/email';
import type { UserProfile, Lead, Order, EventType } from '../types/database';
import CalendarFilters from './CalendarFilters';
import CalendarLegend from './CalendarLegend';
import CalendarQuickActions from './CalendarQuickActions';
import TimeTrackingWidget from './TimeTrackingWidget';
import CalendarEventCard from './CalendarEventCard';
import { RegionTabs, type Region } from './calendar/RegionTabs';
import { Button } from './ui';
import EmptyState from './EmptyState';
import { Loader2 } from 'lucide-react';
import InvitationPreviewModal from './InvitationPreviewModal';
import QuoteCreationModal from './QuoteCreationModal';
import { Video } from 'lucide-react';
import { useToast } from '../hooks/useToast';

type ViewMode = 'month' | 'week' | 'day' | 'agenda';
type CalendarMode = 'main' | 'sales' | 'delivery';

interface DragData {
  type: 'event' | 'order';
  id: string;
  title: string;
  eventData?: CalendarEventWithRelations;
  orderData?: Order;
  [key: string]: any;
}

interface EventFormData {
  title: string;
  type: EventType;
  start_time: string;
  end_time: string;
  description: string;
  assigned_to_user_id: string;
  assigned_to_team_id: string;
  related_order_id: string;
  related_lead_id: string;
  assigned_to_team_id: string;
  related_order_id: string;
  related_lead_id: string;
  location: string;
  meeting_link: string; // Added meeting_link
  is_recurring: boolean;
  recurrence_type: 'daily' | 'weekly' | 'monthly';
  recurrence_interval: number;
  recurrence_end_date: string;
}

const getUserInitials = (name: string) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getRoleColor = (role?: string) => {
  const colors = {
    admin: 'bg-red-500',
    sales: 'bg-blue-500',
    worker: 'bg-green-500'
  };
  return colors[role as keyof typeof colors] || 'bg-gray-500';
};

function CalendarView() {
  const { user, session } = useAuth();
  const location = useLocation();
  const { success, error: showToastError, warning } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('main');
  const [events, setEvents] = useState<CalendarEventWithRelations[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEventWithRelations[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggableSidebarOpen, setIsDraggableSidebarOpen] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [showAssigned, setShowAssigned] = useState(false);
  const [assignedForCity, setAssignedForCity] = useState<{ users: UserProfile[], teams: TeamWithRelations[] }>({ users: [], teams: [] });

  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithRelations | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventWithRelations | null>(null);

  // Drag and drop states
  const [draggedData, setDraggedData] = useState<DragData | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [dragOverTime, setDragOverTime] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [pendingEventData, setPendingEventData] = useState<any>(null);
  const [draggedItemForModal, setDraggedItemForModal] = useState<DragData | null>(null);
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [cityOrderCounts, setCityOrderCounts] = useState<Record<string, number>>({});

  // Add this useEffect hook to calculate the counts
  useEffect(() => {
    const counts: Record<string, number> = {};
    orders.forEach(order => {
      if (order.status === 'öppen_order' && order.customer?.city) {
        const city = order.customer.city;
        counts[city] = (counts[city] || 0) + 1;
      }
    });
    setCityOrderCounts(counts);
  }, [orders]);

  const handleFilterByCityAssignments = () => {
    if (!selectedCity) return;

    // This is the correct logic that directly uses the 'cities' array on your objects
    const usersInCity = users.filter(u => u.cities?.includes(selectedCity));
    const teamsInCity = teams.filter(t => t.cities?.includes(selectedCity));

    // Store the found users/teams to show in the dropdown
    setAssignedForCity({ users: usersInCity, teams: teamsInCity });

    // Toggle the dropdown's visibility
    setShowAssigned(prev => !prev);

    // CRITICAL FIX: Also update the main calendar filters to only show these found users/teams
    setSelectedUsers(usersInCity.map(u => u.id));
    setSelectedTeams(teamsInCity.map(t => t.id));
  };

  const handleUserToggle = (userId: string) => {
    const newSelection = selectedUsers.includes(userId)
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId];
    setSelectedUsers(newSelection);
  };

  const handleTeamToggle = (teamId: string) => {
    const newSelection = selectedTeams.includes(teamId)
      ? selectedTeams.filter(id => id !== teamId)
      : [...selectedTeams, teamId];
    setSelectedTeams(newSelection);
  };

  // Add state for time selection modal
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [showInvitationPreview, setShowInvitationPreview] = useState(false);
  const [invitationData, setInvitationData] = useState<{
    event: CalendarEventWithRelations | null;
    order?: Order;
    content: string;
    recipientEmail: string;
    recipientPhone: string;
    subject: string;
    meetingLink: string;
  }>({
    event: null,
    order: undefined,
    content: '',
    recipientEmail: '',
    recipientPhone: '',
    subject: '',
    meetingLink: ''
  });

  // State for quote creation modal
  const [showQuoteCreationModal, setShowQuoteCreationModal] = useState(false);
  const [leadForQuote, setLeadForQuote] = useState<Lead | null>(null);

  const handleInitiateInvitation = (event: CalendarEventWithRelations, order?: Order) => {
    try {
      if (!currentUserProfile) {
        warning('Ej inloggad', 'Du måste vara inloggad för att skicka inbjudningar.');
        return;
      }
      setError(null);

      let recipientEmail = '';
      let recipientPhone = '';
      let customerName = '';

      if (order?.customer) {
        recipientEmail = order.customer.email || '';
        recipientPhone = order.customer.phone || '';
        customerName = order.customer.name || 'Kund';
      } else if (event.related_lead?.customer) {
        recipientEmail = event.related_lead.customer.email || '';
        recipientPhone = event.related_lead.customer.phone || '';
        customerName = event.related_lead.customer.name || 'Kund';
      }

      const meetingLink = event.meeting_link || '';
      const startTime = event.start_time ? formatSwedishDateTime(new Date(event.start_time)) : 'TBD';

      const content = `Hej ${customerName || 'Kund'}!

Ni är inbjuden till ett möte angående "${event.title}".

Tid: ${startTime}
Länk till möte: ${meetingLink}

Vänligen bekräfta om tiden passar.

Med vänliga hälsningar,
${currentUserProfile.organisation?.name || 'Oss'}`;

      setInvitationData({
        event,
        order,
        content,
        recipientEmail,
        recipientPhone,
        subject: `Inbjudan: ${event.title}`,
        meetingLink
      });
      setShowInvitationPreview(true);
      setShowDetailModal(false);

    } catch (err: any) {
      console.error('Error initiating invitation:', err);
      setError('Kunde inte förbereda inbjudan.');
    }
  };

  const handleConfirmSendInvitation = async (
    content: string,
    method: 'email' | 'sms',
    recipientEmail: string,
    recipientPhone?: string,
    editedSubject?: string
  ) => {
    if (!invitationData.event || !currentUserProfile) {
      showToastError('Fel', 'Saknar data för att skicka inbjudan');
      return;
    }

    try {
      setIsSendingInvite(true);

      const subjectToUse = editedSubject || invitationData.subject;

      if (method === 'email') {
        const result = await sendEmail({
          to: recipientEmail,
          subject: subjectToUse,
          content: content
        });
        if (!result.success) throw new Error(result.error || 'Kunde inte skicka e-post');
        success('Inbjudan skickad', 'E-postinbjudan har skickats till kunden.');
      } else {
        const { sendSms } = await import('../lib/sms');
        const result = await sendSms(
          currentUserProfile.organisation_id!,
          { to: recipientPhone || '', message: content, orderId: invitationData.event.related_order_id || undefined },
          currentUserProfile.id
        );
        if (!result.success) throw new Error(result.error || 'Kunde inte skicka SMS');
        success('SMS skickat', 'SMS-inbjudan har skickats till kunden.');
      }

      setShowInvitationPreview(false);

    } catch (err: unknown) {
      console.error('Error sending invitation:', err);
      const message = err instanceof Error ? err.message : 'Ett oväntat fel uppstod';
      showToastError('Kunde inte skicka inbjudan', message);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleLeadOutcome = async (lead: Lead | null | undefined, outcome: 'won' | 'lost') => {
    if (!lead) {
      setError('Kunde inte hitta tillhörande lead.');
      return;
    }

    if (outcome === 'won') {
      if (!lead.customer_id) {
        showToastError('Saknad kund', 'Lead måste ha en kopplad kund för att skapa offert.');
        return;
      }
      setLeadForQuote(lead);
      setShowQuoteCreationModal(true);
      setShowDetailModal(false);
      return;
    }

    setIsSubmittingOutcome(true);

    try {
      await updateLead(lead.id, { status: 'lost' });
      setShowDetailModal(false);
      await initializeCalendar();
      await loadEvents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingOutcome(false);
    }
  };

  const handleQuoteCreated = async () => {
    if (leadForQuote) {
      try {
        await updateLead(leadForQuote.id, { status: 'won' });
      } catch (err) {
        console.error('Error updating lead status:', err);
      }
    }
    setShowQuoteCreationModal(false);
    setLeadForQuote(null);
    await initializeCalendar();
    await loadEvents();
  };



  // Filter state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<TeamWithRelations[]>([]);
  const [userTeams, setUserTeams] = useState<TeamWithRelations[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const filteredOrders = useMemo(() => {
    // Start with all orders that are currently 'öppen_order'
    let openOrders = orders.filter(order => order.status === 'öppen_order');

    // If a specific city is selected in the filter, it is the highest priority
    if (selectedCity) {
      return openOrders.filter(order => order.customer?.city === selectedCity);
    }

    // If no city is selected, then check if users or teams are selected
    let relevantCities: string[] = [];
    if (selectedUsers.length > 0) {
      const userCities = users.filter(u => selectedUsers.includes(u.id)).flatMap(u => u.cities || []);
      relevantCities.push(...userCities);
    }
    if (selectedTeams.length > 0) {
      const teamCities = teams.filter(t => selectedTeams.includes(t.id)).flatMap(t => t.cities || []);
      relevantCities.push(...teamCities);
    }

    // If we have cities from user/team selections, filter by those
    const uniqueRelevantCities = [...new Set(relevantCities)];
    if (uniqueRelevantCities.length > 0) {
      return openOrders.filter(order => uniqueRelevantCities.includes(order.customer?.city || ''));
    }

    // If no filters are active at all, return all open orders
    return openOrders;
  }, [orders, selectedCity, selectedUsers, selectedTeams, users, teams]);

  const availableUsersForModal = useMemo(() => {
    // Requirement 1 (Admin Override): If user is admin, show everyone.
    if (currentUserProfile?.role === 'admin') {
      return users;
    }

    const orderCity = draggedItemForModal?.orderData?.customer?.city;
    if (!orderCity) return users; // If no specific order city, show all users

    // Filter users who are explicitly assigned to the order's city.
    return users.filter(user => user.cities?.includes(orderCity));
  }, [users, draggedItemForModal, currentUserProfile]);

  const availableTeamsForModal = useMemo(() => {
    // Requirement 1 (Admin Override): If user is admin, show every team.
    if (currentUserProfile?.role === 'admin') {
      return teams;
    }

    const orderCity = draggedItemForModal?.orderData?.customer?.city;
    if (!orderCity) return teams; // If no specific order city, show all teams

    // Filter teams who are explicitly assigned to the order's city.
    return teams.filter(team => team.cities?.includes(orderCity));
  }, [teams, draggedItemForModal, currentUserProfile]);

  // Mobile state
  const [showMobileFilters, setShowMobileFilters] = useState(false);


  const [selectedEventForTracking, setSelectedEventForTracking] = useState<CalendarEventWithRelations | null>(null);

  // Form state
  const [eventForm, setEventForm] = useState<Partial<EventFormData>>({});

  useEffect(() => {
    initializeCalendar();
  }, [user]);

  // Handle navigation state for creating meeting from customer page
  useEffect(() => {
    const state = location.state as { createMeetingForCustomer?: { id: string; name: string } } | null;
    if (state?.createMeetingForCustomer && currentUserProfile) {
      const customer = state.createMeetingForCustomer;
      // Pre-fill the form with customer info and open modal
      setEventForm({
        title: `Möte med ${customer.name}`,
        type: 'meeting',
        description: `Möte bokat från kundkortet för ${customer.name}`,
        assigned_to_user_id: currentUserProfile.id,
      });
      setShowEventModal(true);
      // Clear the navigation state so it doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state, currentUserProfile]);

  useEffect(() => {
    if (currentUserProfile) {
      loadEvents();
    }
  }, [currentDate, viewMode, calendarMode, selectedUsers, selectedTeams, selectedCity, currentUserProfile]);

  const initializeCalendar = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data: userProfiles, error: userError } = await getUserProfiles('', { userId: user.id });
      if (userError || !userProfiles?.[0]) {
        throw new Error(userError?.message || 'Kunde inte hämta användarprofil.');
      }

      const currentUser = userProfiles[0];
      if (!currentUser?.organisation_id) {
        throw new Error('Ingen organisation hittades för användaren');
      }
      setCurrentUserProfile(currentUser);

      // Fetch all data for the organization in parallel
      const [
        allUsersResult,
        allTeamsResult,
        userTeamsResult,
        leadsResult,
        citiesResult,
        ordersResult
      ] = await Promise.all([
        getUserProfiles(currentUser.organisation_id),
        getTeams(currentUser.organisation_id),
        getUserTeams(currentUser.id),
        getLeads(currentUser.organisation_id),
        getCustomerCities(currentUser.organisation_id),
        getOrders(currentUser.organisation_id) // Fetch orders here
      ]);

      // Error handling
      if (allUsersResult.error) throw allUsersResult.error;
      if (allTeamsResult.error) throw allTeamsResult.error;
      if (userTeamsResult.error) throw userTeamsResult.error;
      if (leadsResult.error) throw leadsResult.error;
      if (citiesResult.error) throw citiesResult.error;
      if (ordersResult.error) throw ordersResult.error;

      const allOrgUsers = allUsersResult.data || [];
      const allOrgTeams = allTeamsResult.data || [];
      const userMemberOfTeams = userTeamsResult.data || [];

      // --- THIS IS YOUR ROLE-BASED FILTERING LOGIC ---
      let visibleUsers: UserProfile[];
      let visibleTeams: TeamWithRelations[];

      if (currentUser.role === 'admin') {
        visibleUsers = allOrgUsers;
        visibleTeams = allOrgTeams;
      } else if (currentUser.role === 'sales') {
        visibleUsers = allOrgUsers.filter(u => u.role === 'admin' || u.role === 'sales' || u.id === currentUser.id);
        visibleTeams = allOrgTeams; // Sales can see all teams
      } else { // 'worker'
        const memberTeamIds = userMemberOfTeams.map(t => t.id);
        const memberUserIds = new Set<string>([currentUser.id]);
        userMemberOfTeams.forEach(team => {
          team.members?.forEach(member => memberUserIds.add(member.user_id));
        });
        visibleUsers = allOrgUsers.filter(u => memberUserIds.has(u.id));
        visibleTeams = allOrgTeams.filter(t => memberTeamIds.includes(t.id));
      }
      // --- END OF ROLE-BASED LOGIC ---

      // Set all state with the complete and correctly filtered data
      setUsers(visibleUsers);
      setTeams(visibleTeams);
      setUserTeams(userMemberOfTeams);
      setLeads(leadsResult.data || []);
      setAvailableCities(citiesResult.data || []);
      setOrders(ordersResult.data || []);

      setSelectedUsers([currentUser.id]); // Default filter to current user

    } catch (err: any) {
      console.error('Error initializing calendar:', err);
      setError(err.message || 'Kunde inte ladda kalenderdata');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!currentUserProfile?.organisation_id) return;

    try {
      setFilterLoading(true);
      setError(null);

      // Calculate date range based on view mode
      let dateFrom: string, dateTo: string;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      switch (viewMode) {
        case 'month':
          dateFrom = new Date(year, month, 1).toISOString();
          dateTo = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
          break;
        case 'week':
          const weekDays = getWeekDays(currentDate);
          dateFrom = weekDays[0].toISOString();
          dateTo = new Date(weekDays[6].getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
          break;
        case 'day':
          dateFrom = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).toISOString();
          dateTo = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59).toISOString();
          break;
        case 'agenda':
          dateFrom = new Date().toISOString();
          dateTo = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Next 30 days
          break;
      }

      const eventFilters: any = {
        dateFrom,
        dateTo,
        city: selectedCity
      };

      if (calendarMode === 'sales') {
        // Säljkalender: Show meetings linked to leads that are new OR have been contacted.
        eventFilters.eventTypes = ['meeting'];
        eventFilters.relatedLeadStatuses = ['new', 'contacted']; // FIX IS HERE
      } else if (calendarMode === 'delivery') {
        // Leveranskalender: Show tasks linked to booked orders.
        eventFilters.eventTypes = ['task'];
        eventFilters.relatedOrderStatuses = ['bokad_bekräftad'];
      }

      // Apply user and team filters (your existing code)
      if (selectedUsers.length > 0) {
        eventFilters.userIds = selectedUsers;
      }
      if (selectedTeams.length > 0) {
        eventFilters.teamIds = selectedTeams;
      }

      // Apply user and team filters
      if (selectedUsers.length > 0) {
        eventFilters.userIds = selectedUsers;
      }

      if (selectedTeams.length > 0) {
        eventFilters.teamIds = selectedTeams;
      }

      const [eventsResult, teamMembersResult, ordersResult] = await Promise.all([
        getCalendarEvents(currentUserProfile.organisation_id, eventFilters),
        getTeamMembers(currentUserProfile.organisation_id),
        getOrders(currentUserProfile.organisation_id) // Fetch orders instead of jobs
      ]);

      if (eventsResult.error) {
        setError(eventsResult.error.message);
        return;
      }

      setEvents(eventsResult.data || []);
      setFilteredEvents(eventsResult.data || []);
      setTeamMembers(teamMembersResult.data || []);
      if (ordersResult.data) {
        setOrders(ordersResult.data);
      }
    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError('Ett oväntat fel inträffade vid hämtning av kalenderdata.');
    } finally {
      setFilterLoading(false);
    }
  };

  const handleUserFilterChange = (userIds: string[]) => {
    setSelectedUsers(userIds);
  };

  const handleTeamFilterChange = (teamIds: string[]) => {
    setSelectedTeams(teamIds);
  };

  const handleClearFilters = () => {
    if (currentUserProfile) {
      setSelectedUsers([currentUserProfile.id]);
    } else {
      setSelectedUsers([]);
    }
    setSelectedTeams([]);
    setSelectedCity('');
  };

  const handleShowMyCalendar = () => {
    if (currentUserProfile) {
      setSelectedUsers([currentUserProfile.id]);
      setSelectedTeams([]);
    }
  };

  const handleShowAllCalendars = () => {
    setSelectedUsers([]);
    setSelectedTeams([]);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUsers([userId]);
    setSelectedTeams([]);
  };

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeams([teamId]);
    setSelectedUsers([]);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, data: DragData) => {
    setDraggedData(data);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(data));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, date?: Date, time?: string) => {
    e.preventDefault();
    if (date) {
      setDragOverDate(date);
    }
    if (time) {
      setDragOverTime(time);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if we're leaving the calendar area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverDate(null);
      setDragOverTime(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, date: Date, time?: string) => {
    e.preventDefault();
    setDragOverDate(null);
    setDragOverTime(null);
    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));

    if (dragData.type === 'event') {
      handleEventDrop(dragData.eventData, date);
    } else if (dragData.type === 'order' || dragData.type === 'lead') { // FIX: Added 'lead' condition
      handleDropFromExternal(dragData, date, time);
    }
  };

  const handleEventDrop = async (eventData: CalendarEventWithRelations, newDate: Date) => {
    const originalStartDate = new Date(eventData.start_time);
    const newStartDate = new Date(newDate);
    newStartDate.setHours(originalStartDate.getHours(), originalStartDate.getMinutes(), 0, 0);
    const duration = new Date(eventData.end_time).getTime() - originalStartDate.getTime();
    const newEndDate = new Date(newStartDate.getTime() + duration);

    // Check for conflicts
    const hasConflict = checkEventConflict(
      {
        start_time: newStartDate.toISOString(),
        end_time: newEndDate.toISOString(),
        assigned_to_user_id: eventData.assigned_to_user_id,
      },
      events,
      eventData.id
    );

    if (hasConflict) {
      setError('Konflikt upptäckt! Det finns redan en händelse på denna tid för den tilldelade personen.');
      return; // Stop if there's a conflict
    }

    // Optimistically update the UI for a snappy feel
    const updatedEvents = events.map(e =>
      e.id === eventData.id
        ? { ...e, start_time: newStartDate.toISOString(), end_time: newEndDate.toISOString() }
        : e
    );
    // Apply the update to BOTH state arrays
    setEvents(updatedEvents);
    setFilteredEvents(updatedEvents);

    // Update the database in the background
    const { data, error } = await updateCalendarEvent(eventData.id, {
      start_time: newStartDate.toISOString(),
      end_time: newEndDate.toISOString(),
    });

    if (error) {
      setError(`Kunde inte flytta händelsen: ${error.message}`);
      // If the database fails, revert the UI
      loadEvents();
    } else if (data) {
      // On success, update the UI with the authoritative data from the server
      const finalUpdatedEvents = events.map(e => (e.id === data.id ? data : e));
      setEvents(finalUpdatedEvents);
      setFilteredEvents(finalUpdatedEvents);
    }
  };

  const handleDropFromExternal = async (dragData: DragData, date: Date, time?: string) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD in local time
    const timeStr = time || '09:00';
    const nextHour = (parseInt(timeStr.split(':')[0]) + 1).toString().padStart(2, '0');

    const { type, title } = dragData;
    let assignedUserId = user?.id || '';

    // Pre-assign the user based on the dragged item
    if (type === 'order' && dragData.orderData) {
      assignedUserId = dragData.orderData.primary_salesperson_id || dragData.orderData.assigned_to_user_id || assignedUserId;
    }
    if (type === 'lead' && dragData.leadData) {
      assignedUserId = dragData.leadData.assigned_to_user_id || assignedUserId;
    }

    // FIX 2: Store the dragged item in state instead of updating status immediately
    setDraggedItemForModal(dragData);

    // Pre-fill the form data for the modal
    setEventForm({
      ...getInitialEventFormState(),
      title: `${type === 'lead' ? 'Säljsamtal' : 'Bokat Jobb'}: ${title}`,
      type: type === 'lead' ? 'meeting' : 'task',
      start_time: `${dateStr}T${timeStr}`,
      end_time: `${dateStr}T${nextHour}:00`,
      assigned_to_user_id: assignedUserId,
      related_order_id: type === 'order' ? dragData.id : '',
      related_lead_id: type === 'lead' ? dragData.id : '',
      description: `Händelse skapad från ${type}: ${title}`
    });

    setShowEventModal(true);
  };

  // Add this helper function inside your component if you don't have it
  const getInitialEventFormState = () => ({
    title: '',
    type: 'meeting' as EventType,
    start_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_date: new Date().toISOString().split('T')[0],
    end_time: '10:00',
    description: '',
    assigned_to_user_id: user?.id || '',
    assigned_to_team_id: '',
    related_order_id: '',
    related_lead_id: '', // Make sure this exists
    location: '',
    is_recurring: false,
    recurrence_type: 'daily' as 'daily' | 'weekly' | 'monthly',
    recurrence_interval: 1,
    recurrence_end_date: '',
    meeting_link: ''
  });



  const createEventFromData = async (eventData: any) => {
    const result = await createCalendarEvent(eventData);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (result.data) {
      setEvents(prev => [...prev, result.data!]);
    }
  };

  const handleAssignEvent = async (assignedUserId: string) => {
    if (!pendingEventData) return;

    const eventData = {
      ...pendingEventData,
      assigned_to_user_id: assignedUserId || null
    };

    await createEventFromData(eventData);
    setShowAssignModal(false);
    setPendingEventData(null);
  };

  const handleCreateEventSubmit = async (formData: any) => {
    try {
      // Directly use the full datetime string from the form.
      // Add a check to ensure it's not empty.
      if (!formData.start_time) {
        setError('Starttid är obligatorisk.');
        return;
      }

      const startDateTime = new Date(formData.start_time);

      // End time can be optional, so handle that case gracefully.
      const endDateTime = formData.end_time ? new Date(formData.end_time) : null;

      // A crucial check to ensure the dates created are valid before proceeding.
      if (isNaN(startDateTime.getTime())) {
        setError('Ogiltigt format för starttid.');
        return;
      }
      if (endDateTime && isNaN(endDateTime.getTime())) {
        setError('Ogiltigt format för sluttid.');
        return;
      }

      if (endDateTime && endDateTime <= startDateTime) {
        setError('Sluttid måste vara efter starttid.');
        return;
      }

      const eventData = {
        organisation_id: currentUserProfile?.organisation_id || '',
        title: formData.title,
        type: formData.type,
        start_time: startDateTime.toISOString(),
        // Handle the case where end_time might not be set
        end_time: endDateTime ? endDateTime.toISOString() : null,
        assigned_to_user_id: formData.assigned_to_user_id || null,
        assigned_to_team_id: formData.assigned_to_team_id || null,
        related_order_id: formData.related_order_id || null,
        description: formData.description || null,
        location: formData.location || null,
        meeting_link: formData.meeting_link || null,
        related_lead_id: formData.related_lead_id || null
      };

      // Check for conflicts
      if (eventData.assigned_to_user_id) {
        const hasConflict = checkEventConflict(
          {
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            assigned_to_user_id: eventData.assigned_to_user_id
          },
          events,
          editingEvent?.id
        );

        if (hasConflict && !confirm('Det finns en konflikt med en annan händelse. Vill du fortsätta ändå?')) {
          return;
        }
      } else if (eventData.assigned_to_team_id) {
        // New team conflict check
        const teamEvents = events.filter(e => e.assigned_to_team_id === eventData.assigned_to_team_id);
        const hasConflict = checkEventConflict(
          { start_time: eventData.start_time, end_time: eventData.end_time, assigned_to_user_id: null }, // Pass null for user_id
          teamEvents,
          editingEvent?.id
        );
        if (hasConflict && !confirm('Det finns en team-konflikt med en annan händelse. Vill du fortsätta ändå?')) {
          return;
        }
      }

      if (formData.is_recurring) {
        // Create recurring events
        const result = await createRecurringEvents(eventData, {
          type: formData.recurrence_type,
          interval: formData.recurrence_interval,
          endDate: formData.recurrence_end_date
        });
      } else if (editingEvent) {
        const result = await updateCalendarEvent(editingEvent.id, eventData);
        if (result.error) {
          setError(result.error.message);
          return;
        }
        if (result.data) {
          const updatedEvents = events.map(event => event.id === editingEvent.id ? result.data! : event);
          setEvents(updatedEvents);
          setFilteredEvents(updatedEvents); // This ensures the UI updates instantly
        }
      } else {
        // Create single event
        const result = await createCalendarEvent(eventData);
        if (result.error) {
          setError(result.error.message);
          return;
        }
        if (result.data) {
          let newEvent = result.data; // Use a mutable variable

          if (draggedItemForModal) {
            const { type, id } = draggedItemForModal;
            if (type === 'order') {
              await updateOrder(id, { status: 'bokad_bekräftad' });
              setOrders(prev => prev.filter(o => o.id !== id));
            } else if (type === 'lead') {
              await updateLead(id, { status: 'contacted' });
              // Manually update the lead status on the new event object
              if (newEvent.related_lead) {
                newEvent = {
                  ...newEvent,
                  related_lead: {
                    ...newEvent.related_lead,
                    status: 'contacted',
                  },
                };
              }
              setLeads(prev => prev.filter(l => l.id !== id));
            }
          }

          // Sync to Google Calendar if enabled
          if (user?.id && newEvent.type === 'meeting') {
            const { enabled, calendarId } = await checkGoogleCalendarEnabled(user.id);
            if (enabled && session?.provider_token) {
              const syncResult = await syncEventToGoogle(
                newEvent.id,
                'create',
                session.provider_token,
                calendarId
              );
              if (syncResult.success && syncResult.meeting_link) {
                // Update the event with the new meeting link
                newEvent = { ...newEvent, meeting_link: syncResult.meeting_link };
                success('Google Meet-länk skapad automatiskt');
              }
            }
          }

          // Now add the final, correct event object to the state
          setEvents(prev => [...prev, newEvent]);
          setFilteredEvents(prev => [...prev, newEvent]);
        }
      }

      // Reset form, modals, and the temporary dragged item state
      resetEventForm();
      setShowEventModal(false);
      setEditingEvent(null);
      setDraggedItemForModal(null); // Clear the temporary item

    } catch (err: any) {
      console.error("Error creating/updating event:", err);
      setError(`Kunde inte spara händelse: ${err.message}`);
      setDraggedItemForModal(null); // Also clear on error
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna händelse?')) return;

    try {
      const result = await deleteCalendarEvent(eventId);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setEvents(prev => prev.filter(event => event.id !== eventId));
      setFilteredEvents(prev => prev.filter(event => event.id !== eventId)); // Add this line
      setShowDetailModal(false);
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Kunde inte ta bort händelse.');
    }
  };

  const resetEventForm = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const formatDate = (date: Date) => {
      // Helper to format to YYYY-MM-DDTHH:MM
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const nowFormatted = formatDate(today);
    const oneHourLater = formatDate(new Date(today.getTime() + 60 * 60 * 1000));

    setEventForm({
      title: '',
      type: 'meeting',
      start_time: nowFormatted,
      end_time: oneHourLater,
      description: '',
      assigned_to_user_id: user?.id || '',
      assigned_to_team_id: '',
      related_lead_id: '',
      related_order_id: '',
      location: '',
      is_recurring: false,
      recurrence_type: 'weekly',
      recurrence_interval: 1,
      recurrence_end_date: formatDate(tomorrow),
      meeting_link: ''
    });
  };

  const handleEditEvent = (event: CalendarEventWithRelations) => {
    setEditingEvent(event);
    const toLocalISOString = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const ten = (i) => (i < 10 ? '0' : '') + i;
      return `${date.getFullYear()}-${ten(date.getMonth() + 1)}-${ten(date.getDate())}T${ten(date.getHours())}:${ten(date.getMinutes())}`;
    };

    setEventForm({
      title: event.title,
      type: event.type,
      start_time: toLocalISOString(event.start_time),
      end_time: toLocalISOString(event.end_time),
      description: event.description || '',
      assigned_to_user_id: event.assigned_to_user_id || '',
      assigned_to_team_id: event.assigned_to_team_id || '',
      related_lead_id: event.related_lead_id || '',
      related_order_id: event.related_order_id || '',
      location: event.location || '',
      is_recurring: false,
      recurrence_type: 'weekly',
      recurrence_interval: 1,
      recurrence_end_date: '',
      meeting_link: event.meeting_link || ''
    });
    setShowEventModal(true);
  };

  const handleDayClick = (date: Date) => {
    // Use local date components to avoid timezone issues with toISOString()
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    setEventForm(prev => ({
      ...prev,
      start_time: `${dateStr}T09:00`,
      end_time: `${dateStr}T10:00`
    }));
    setShowEventModal(true);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    switch (viewMode) {
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }

    setCurrentDate(newDate);
  };

  const getEventsForDay = (date: Date) => {
    return filteredEvents.filter(event => {
      if (!event.start_time) return false;
      const eventDate = new Date(event.start_time);
      return isSameDay(eventDate, date);
    });
  };

  const getSelectedUsersData = () => {
    return users.filter(user => selectedUsers.includes(user.id));
  };

  const getSelectedTeamsData = () => {
    return teams.filter(team => selectedTeams.includes(team.id));
  };

  const eventTypes = [
    { type: 'meeting', label: 'Möten', color: 'bg-blue-500' },
    { type: 'task', label: 'Uppgifter', color: 'bg-green-500' },
    { type: 'reminder', label: 'Påminnelser', color: 'bg-orange-500' }
  ];

  const renderMonthView = () => {
    const monthDays = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());

    return (
      <div className="bg-white rounded-lg shadow-sm border" onMouseLeave={() => setDragOverDate(null)}>
        <div className="grid grid-cols-8 border-b border-gray-100">
          <div className="p-3 text-center text-sm font-medium text-gray-500">V</div>
          {SWEDISH_DAYS_SHORT.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-8">
          {Array.from({ length: Math.ceil(monthDays.length / 7) }, (_, weekIndex) => {
            const weekStart = monthDays[weekIndex * 7];
            const weekNumber = getWeekNumber(weekStart);

            return (
              <React.Fragment key={weekIndex}>
                <div className="p-2 text-center text-xs text-gray-400 border-r border-gray-50">
                  {weekNumber}
                </div>
                {monthDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((date, dayIndex) => {
                  const dayEvents = getEventsForDay(date);
                  const isCurrentMonth = isSameMonth(date, currentDate);
                  const isTodayDate = isToday(date);

                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      onClick={() => handleDayClick(date)}
                      onDragOver={handleDragOver} // Allows the element to be a drop target
                      onDragEnter={(e) => handleDragEnter(e, date)} // Correctly calls the handler
                      onDrop={(e) => handleDrop(e, date)} // THIS IS THE NEW PART
                      className={`
                       min-h-[120px] p-2 border-r border-b border-gray-500 cursor-pointer 
                       transition-colors duration-200 ease-in-out
                        ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'hover:bg-blue-50'}
                        ${isTodayDate ? 'bg-blue-50' : ''}
                        ${dragOverDate && isSameDay(dragOverDate, date) ? 'bg-green-100 ring-2 ring-green-400' : ''}
                        
                      `}
                    >
                      <div className={`
                        text-sm font-medium mb-1
                        ${isTodayDate ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                      `}>
                        {date.getDate()}
                      </div>

                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => (
                          <CalendarEventCard
                            key={event.id}
                            event={event}
                            onDragStart={(e) => handleDragStart(e, {
                              type: 'event',
                              id: event.id,
                              title: event.title,
                              eventData: event, // Pass the full event object
                            })}
                            onClick={(e) => {
                              e.stopPropagation(); // Prevents the day from being clicked
                              setSelectedEvent(event);
                              setShowDetailModal(true);
                            }}
                            compact={true}
                            className="text-xs"
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dayEvents.length - 3} fler
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const timeSlots = getTimeSlots();

    return (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden" onMouseLeave={() => setDragOverDate(null)}>
        <div className="grid grid-cols-8 border-b border-gray-100">
          <div className="p-3 text-center text-sm font-medium text-gray-500">Tid</div>
          {weekDays.map((date, index) => (
            <div key={index} className="p-3 text-center border-l border-gray-50">
              <div className="text-sm font-medium text-gray-900">
                {SWEDISH_DAYS_SHORT[index]}
              </div>
              <div className={`text-lg font-bold ${isToday(date) ? 'text-blue-600' : 'text-gray-700'}`}>
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          <div className="grid grid-cols-8">
            {timeSlots.filter((_, index) => index % 2 === 0).map(timeSlot => (
              <React.Fragment key={timeSlot}>
                <div className="p-2 text-xs text-gray-500 border-b border-gray-500 text-center">
                  {timeSlot}
                </div>
                {weekDays.map((date, dayIndex) => {
                  const dayEvents = getEventsForDay(date);
                  const slotEvents = dayEvents.filter(event => {
                    if (!event.start_time) return false;
                    const eventTime = formatSwedishTime(new Date(event.start_time));
                    return eventTime.startsWith(timeSlot.split(':')[0]);
                  });

                  return (
                    <div
                      key={`${timeSlot}-${dayIndex}`}
                      onClick={() => {
                        const dateStr = date.toISOString().split('T')[0];
                        setEventForm(prev => ({
                          ...prev,
                          start_date: dateStr,
                          end_date: dateStr,
                          start_time: timeSlot
                        }));
                        setShowEventModal(true);
                      }}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, date, timeSlot)} // Pass date and timeSlot
                      onDrop={(e) => handleDrop(e, date, timeSlot)} // Pass date and timeSlot
                      className={`
                       min-h-[120px] p-2 border-r border-b border-gray-500 cursor-pointer 
                       transition-colors duration-200 ease-in-out
                       ${dragOverDate && isSameDay(dragOverDate, date) ? 'bg-green-100 ring-2 ring-green-400' : ''}
                       
                      `}
                    >
                      {slotEvents.map(event => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                            setShowDetailModal(true);
                          }}
                          className={`
                            text-xs p-1 rounded border mb-1 cursor-pointer hover:shadow-sm
                            ${EVENT_TYPE_COLORS[event.type]}
                          `}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);
    const timeSlots = getTimeSlots();

    return (
      <div className="bg-white rounded-lg shadow-sm border" onMouseLeave={() => setDragOverDate(null)}>
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {formatSwedishDate(currentDate)}
          </h3>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {timeSlots.filter((_, index) => index % 2 === 0).map(timeSlot => {
            const slotEvents = dayEvents.filter(event => {
              if (!event.start_time) return false;
              const eventTime = formatSwedishTime(new Date(event.start_time));
              return eventTime.startsWith(timeSlot.split(':')[0]);
            });

            return (
              <div key={timeSlot} className="flex border-b border-gray-100">
                <div className="w-20 p-3 text-sm text-gray-500 text-right border-r border-gray-500">
                  {timeSlot}
                </div>
                <div
                  onClick={() => {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    setEventForm(prev => ({
                      ...prev,
                      start_date: dateStr,
                      end_date: dateStr,
                      start_time: timeSlot
                    }));
                    setShowEventModal(true);
                  }}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, currentDate, timeSlot)} // Pass date and timeSlot
                  onDrop={(e) => handleDrop(e, currentDate, timeSlot)} // Pass date and timeSlot
                  className={`
                       min-h-[120px] p-2 border-r border-b border-gray-50 cursor-pointer 
                       transition-colors duration-200 ease-in-out
                       ${dragOverDate && isSameDay(dragOverDate, currentDate) ? 'bg-green-100 ring-2 ring-green-400' : ''}
                       
                      `}
                >
                  {slotEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                        setShowDetailModal(true);
                      }}
                      className={`
                        p-2 rounded border mb-2 cursor-pointer hover:shadow-sm
                        ${EVENT_TYPE_COLORS[event.type]}
                      `}
                    >
                      <div className="font-medium">{event.title}</div>
                      {event.start_time && event.end_time && (
                        <div className="text-xs opacity-75">
                          {formatSwedishTime(new Date(event.start_time))} - {formatSwedishTime(new Date(event.end_time))}
                        </div>
                      )}
                      {event.assigned_to ? (
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <User className="w-4 h-4 mr-1" />
                          {event.assigned_to.full_name}
                        </div>
                      ) : event.assigned_to_team_id && (
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <Users className="w-4 h-4 mr-1 text-purple-600" />
                          <span className="font-medium">
                            {teams.find(team => team.id === event.assigned_to_team_id)?.name || 'Okänt Team'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const sortedEvents = [...events].sort((a, b) => {
      if (!a.start_time || !b.start_time) return 0;
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });

    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Agenda - Kommande händelser</h3>
        </div>

        <div className="divide-y divide-gray-100">
          {sortedEvents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Inga kommande händelser</p>
            </div>
          ) : (
            sortedEvents.map(event => (
              <div
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event);
                  setShowDetailModal(true);
                }}
                className="p-4 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${EVENT_TYPE_COLORS[event.type]}`}>
                        {EVENT_TYPE_LABELS[event.type]}
                      </span>
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                    </div>

                    {event.start_time && (
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatSwedishDateTime(new Date(event.start_time))}
                        {event.end_time && (
                          <span> - {formatSwedishTime(new Date(event.end_time))}</span>
                        )}
                      </div>
                    )}

                    {event.assigned_to ? (
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <User className="w-4 h-4 mr-1" />
                        {event.assigned_to.full_name}
                      </div>
                    ) : event.assigned_to_team_id && (
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Users className="w-4 h-4 mr-1 text-purple-600" />
                        <span className="font-medium">
                          {teams.find(team => team.id === event.assigned_to_team_id)?.name || 'Okänt Team'}
                        </span>
                      </div>
                    )}

                    {event.location && (
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {event.location}
                      </div>
                    )}

                    {(event.related_lead || event.related_job) && (
                      <div className="flex items-center text-sm text-gray-600">
                        {event.related_lead && (
                          <>
                            <FileText className="w-4 h-4 mr-1" />
                            Lead: {event.related_lead.title}
                          </>
                        )}
                        {event.related_job && (
                          <>
                            <Briefcase className="w-4 h-4 mr-1" />
                            Jobb: {event.related_job.title}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Kalender</h1>
              <p className="text-blue-100">Planera och övervaka</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Laddar kalender...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Kalender</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <CalendarIcon className="w-8 h-8 mr-3 text-blue-600" />
            Kalender
          </h1>
          <p className="mt-2 text-gray-600">
            Hantera möten, uppgifter och påminnelser
          </p>
          {currentUserProfile && (
            <p className="mt-1 text-sm text-blue-600">
              <Eye className="w-3 h-3 inline mr-1" />
              {getCalendarPermissionMessage(currentUserProfile)}
            </p>
          )}
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <div className="lg:hidden">
            <CalendarFilters
              selectedUsers={selectedUsers}
              selectedTeams={selectedTeams}
              onUserChange={handleUserFilterChange}
              users={users}
              teams={teams}
              onTeamChange={handleTeamFilterChange}
              onClearFilters={handleClearFilters}
              searchTerm={searchTerm}
              userTeams={userTeams}
              selectedCity={selectedCity}
              cities={availableCities.map(city => `${city} (${cityOrderCounts[city] || 0})`)}
              onCityChange={(cityWithCount) => {
                // Extract only the city name before setting the state
                const cityName = cityWithCount.split(' (')[0];
                setSelectedCity(cityName);
              }}
            />
            <button
              onClick={handleCreateEvent}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ny händelse
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* ========================= CALENDAR TOOLBAR ========================== */}
      {/* ======================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">

        {/* ADD THIS NEW BLOCK FOR CALENDAR TABS */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1 space-x-1">
          <button
            onClick={() => setCalendarMode('main')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${calendarMode === 'main' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-gray-500 hover:bg-white/60 dark:text-gray-400 dark:hover:bg-gray-600/50'
              }`}
          >
            Huvudkalender
          </button>
          <button
            onClick={() => setCalendarMode('sales')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${calendarMode === 'sales' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-gray-500 hover:bg-white/60 dark:text-gray-400 dark:hover:bg-gray-600/50'
              }`}
          >
            Säljkalender
          </button>
          <button
            onClick={() => setCalendarMode('delivery')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${calendarMode === 'delivery' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-gray-500 hover:bg-white/60 dark:text-gray-400 dark:hover:bg-gray-600/50'
              }`}
          >
            Leveranskalender
          </button>
        </div>

        {/* City/Region Filter Tabs */}
        {availableCities.length > 0 && (
          <RegionTabs
            regions={[
              { id: '', name: 'Alla städer', shortName: 'Alla' },
              ...availableCities.map(city => ({
                id: city,
                name: city,
                shortName: city.length > 6 ? city.substring(0, 5) + '.' : city
              }))
            ]}
            selectedRegion={selectedCity}
            onRegionChange={(cityId) => setSelectedCity(cityId)}
            counts={cityOrderCounts}
            showIcon={true}
          />
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1 space-x-1">
          {(['month', 'week', 'day', 'agenda'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${viewMode === mode
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm'
                : 'text-gray-500 hover:bg-white/60 dark:text-gray-400 dark:hover:bg-gray-600/50'
                }`}
            >
              {/* Capitalize for better readability */}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        {viewMode !== 'agenda' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
              {viewMode === 'month' && `${SWEDISH_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
              {viewMode === 'week' && `Vecka ${getWeekNumber(currentDate)}, ${currentDate.getFullYear()}`}
              {viewMode === 'day' && formatSwedishDate(currentDate)}
            </div>

            <button
              onClick={() => navigateDate('next')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
            >
              Idag
            </button>
          </div>
        )}

        {filterLoading && (
          <div className="flex items-center text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="ml-2 text-sm text-gray-600">Uppdaterar...</span>
          </div>
        )}
      </div>




      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Drag and Drop Info */}
      {draggedData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <GripVertical className="w-5 h-5 text-blue-600 mr-2" />
            <p className="text-blue-700">
              Drar: <strong>{draggedData.title}</strong> - Släpp på önskad tid för att {draggedData.type === 'event' ? 'flytta' : 'skapa händelse'}
            </p>
          </div>
        </div>
      )}

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
        >
          <div className="flex items-center">
            <Filter className="w-4 h-4 mr-2 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">
              Kalenderfilter {(selectedUsers.length + selectedTeams.length) > 0 && `(${selectedUsers.length + selectedTeams.length})`}
            </span>
          </div>
          <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${showMobileFilters ? 'rotate-90' : ''}`} />
        </button>

        {showMobileFilters && (
          <div className="mt-2 bg-white border border-gray-200 rounded-lg p-4">
            <CalendarFilters
              selectedUsers={selectedUsers}
              selectedTeams={selectedTeams}
              users={users}
              teams={teams}
              onUserChange={handleUserFilterChange}
              onTeamChange={handleTeamFilterChange}
              onClearFilters={handleClearFilters}
              userTeams={userTeams}
              searchTerm={searchTerm}
              selectedCity={selectedCity}
              cities={availableCities.map(city => `${city} (${cityOrderCounts[city] || 0})`)}
              onCityChange={(cityWithCount) => {
                // Extract only the city name before setting the state
                const cityName = cityWithCount.split(' (')[0];
                setSelectedCity(cityName);
              }}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Desktop Only */}
        <div className="hidden lg:block lg:col-span-1 relative z-10 flex flex-col gap-y-4">
          {/* Draggable Items Sidebar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex-grow flex flex-col min-h-0">
            <button
              onClick={() => setIsDraggableSidebarOpen(!isDraggableSidebarOpen)}
              className="w-full flex items-center justify-between text-sm font-medium text-gray-800"
            >
              <span>Schemaläggning</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isDraggableSidebarOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDraggableSidebarOpen && (
              <div className="mt-4 pt-4 border-t flex-grow overflow-y-auto space-y-4 scrollbar-thin">

                {/* Conditional Rendering based on Calendar Mode */}

                {/* SÄLJKALENDER: Show New Leads */}
                {(calendarMode === 'sales' || calendarMode === 'main') && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
                      <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
                      Förfrågningar ({leads.filter(l => l.status === 'new').length})
                    </h3>
                    <div className="space-y-2">
                      {leads.filter(lead => lead.status === 'new').map(lead => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, { type: 'lead', id: lead.id, title: lead.title, leadData: lead })}
                          className="select-none flex items-center p-2.5 bg-white rounded-lg border cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <GripVertical className="w-4 h-4 mr-3 text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{lead.title}</p>
                            <p className="text-xs text-gray-500">{lead.customer?.name || 'Ingen kund'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LEVERANSKALENDER: Show Open Orders */}
                {(calendarMode === 'delivery' || calendarMode === 'main') && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
                      <Package className="w-4 h-4 mr-2 text-purple-600" />
                      Öppna Ordrar ({filteredOrders.length})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {filteredOrders.map(order => (
                        <div
                          key={order.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, { type: 'order', id: order.id, title: order.title, orderData: order })}
                          className="select-none flex items-center p-2.5 bg-white rounded-lg border cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <GripVertical className="w-4 h-4 mr-3 text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{order.title}</p>
                            <p className="text-xs text-gray-500">{order.customer?.name || 'Ingen kund'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedCity && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 mb-2 text-center">
                      Visar ordrar för <strong>{selectedCity}</strong>.
                    </p>
                    <button
                      onClick={handleFilterByCityAssignments}
                      className="w-full text-xs font-semibold text-blue-600 hover:underline flex items-center justify-center"
                    >
                      Visa teams/arbetare tilldelade detta område
                      <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAssigned ? 'rotate-180' : ''}`} />
                    </button>

                    {/* This is the new dropdown that will appear */}
                    {showAssigned && (
                      <div className="mt-3 pt-3 border-t border-blue-200 space-y-2">
                        {assignedForCity.users.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-600 mb-1">Arbetare:</h4>
                            <div className="space-y-1">
                              {assignedForCity.users.map(user => (
                                <label key={user.id} className="flex items-center p-1 rounded-md hover:bg-blue-100 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.id)}
                                    onChange={() => handleUserToggle(user.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="ml-2 text-xs text-gray-800">{user.full_name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        {assignedForCity.teams.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-600 mb-1">Teams:</h4>
                            <div className="space-y-1">
                              {assignedForCity.teams.map(team => (
                                <label key={team.id} className="flex items-center p-1 rounded-md hover:bg-blue-100 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedTeams.includes(team.id)}
                                    onChange={() => handleTeamToggle(team.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  />
                                  <span className="ml-2 text-xs text-gray-800">{team.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        {assignedForCity.users.length === 0 && assignedForCity.teams.length === 0 && (
                          <p className="text-xs text-gray-500 text-center">Inga tilldelade.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <button
              onClick={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
              className="w-full flex items-center justify-between text-sm font-medium text-gray-800"
            >
              <span className="font-semibold">Filter</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isFilterSidebarOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Conditionally render the filters */}
            {isFilterSidebarOpen && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <CalendarFilters
                  selectedUsers={selectedUsers}
                  selectedTeams={selectedTeams}
                  onUserChange={handleUserFilterChange}
                  onTeamChange={handleTeamFilterChange}
                  onClearFilters={handleClearFilters}
                  users={users}
                  teams={teams}
                  searchTerm={searchTerm}
                  userTeams={userTeams}
                  selectedCity={selectedCity}
                  cities={availableCities.map(city => `${city} (${cityOrderCounts[city] || 0})`)}
                  onCityChange={(cityWithCount) => {
                    // Extract only the city name before setting the state
                    const cityName = cityWithCount.split(' (')[0];
                    setSelectedCity(cityName);
                  }}
                />
              </div>
            )}
          </div>
          {/* Quick Actions */}
          <CalendarQuickActions
            currentUser={currentUserProfile}
            userTeams={userTeams}
            selectedUsers={selectedUsers}
            selectedTeams={selectedTeams}
            onUserSelect={handleUserSelect}
            onTeamSelect={handleTeamSelect}
            onShowMyCalendar={handleShowMyCalendar}
            onShowAllCalendars={handleShowAllCalendars}
            currentUserRole={currentUserProfile?.role || null} // Add this
            organisationName={currentUserProfile?.organisation?.name || 'Din Organisation'} // Add this
            onCreateEvent={handleCreateEvent}
          />


          {/* Legend */}
          <CalendarLegend
            selectedUsers={getSelectedUsersData()}
            selectedTeams={getSelectedTeamsData()}
            eventTypes={eventTypes}
          />
        </div>


        {/* Main Calendar */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {filterLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <span className="text-gray-600">Uppdaterar kalender...</span>
                </div>
              </div>
            )}

            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'agenda' && renderAgendaView()}
          </div>
        </div>
      </div>


      {/* Assignment Modal */}
      {showAssignModal && pendingEventData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Tilldela händelse</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setPendingEventData(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Vem ska tilldelas händelsen "<strong>{pendingEventData.title}</strong>"?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleAssignEvent('')}
                  className="w-full text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <div className="font-medium text-gray-900">Ingen tilldelning</div>
                  <div className="text-sm text-gray-500">Händelsen tilldelas ingen specifik person</div>
                </button>

                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleAssignEvent(member.id)}
                    className="w-full text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <div className="font-medium text-gray-900">{member.full_name}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Tracking Widget for selected event */}
      {selectedEventForTracking && userProfile?.role === 'worker' && (
        <div className="fixed bottom-4 right-4 z-40">
          <TimeTrackingWidget
            orderId={selectedEventForTracking.related_order_id || ''}
            orderTitle={selectedEventForTracking.title}
            onTimeLogUpdate={loadCalendarData}
          />
        </div>
      )}
      {/* Event Creation/Edit Modal */}
      {showEventModal && (
        <EventModal
          event={editingEvent} // Use editingEvent to pre-fill the form
          eventFormData={eventForm} // Pass the pre-filled form data
          currentUser={currentUserProfile}
          availableUsers={users}
          availableTeams={teams}
          onClose={() => {
            setShowEventModal(false);
            setEditingEvent(null);
            resetEventForm();
          }}
          onSave={handleCreateEventSubmit} // Directly call the database function
        />
      )}


      {/* Event Detail Modal */}
      {showDetailModal && selectedEvent && (() => {

        const relatedOrder = orders.find(order => order.id === selectedEvent.related_order_id);

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Händelsedetaljer</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">{selectedEvent.title}</h3>
                    <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${EVENT_TYPE_COLORS[selectedEvent.type]}`}>
                      {EVENT_TYPE_LABELS[selectedEvent.type]}
                    </span>
                  </div>
                  {selectedEvent.assigned_to ? (
                    <div>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium mx-auto ${getRoleColor(selectedEvent.assigned_to.role)}`}
                        title={selectedEvent.assigned_to.full_name}
                      >
                        {getUserInitials(selectedEvent.assigned_to.full_name)}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{selectedEvent.assigned_to.full_name}</p>
                    </div>
                  ) : selectedEvent.assigned_to_team_id && (
                    <div>
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-500 text-white text-sm font-medium mx-auto"
                        title={`Team: ${teams.find(team => team.id === selectedEvent.assigned_to_team_id)?.name || ''}`}
                      >
                        <Users className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {teams.find(team => team.id === selectedEvent.assigned_to_team_id)?.name || 'Okänt Team'}
                      </p>
                    </div>
                  )}
                </div>

                {/* PROMINENT MEETING LINK SECTION */}
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                  {selectedEvent.meeting_link ? (
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-800">
                          {selectedEvent.meeting_link.includes('teams.microsoft.com') ? 'Microsoft Teams' : 'Google Meet'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={selectedEvent.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Gå med i mötet
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedEvent.meeting_link || '');
                            success('Kopierad!', 'Möteslänken har kopierats till urklipp.');
                          }}
                          className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                          title="Kopiera länk"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Video className="w-5 h-5" />
                        <span className="text-sm">Inget möteslänk tillagt</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const link = `https://meet.google.com/${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
                            const { error } = await updateCalendarEvent(selectedEvent.id, { meeting_link: link });
                            if (!error) {
                              setSelectedEvent({ ...selectedEvent, meeting_link: link });
                              success('Google Meet', 'Möteslänk genererad och sparad!');
                            }
                          }}
                          className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-sm"
                        >
                          <Video className="w-4 h-4 mr-1.5 text-blue-600" />
                          Google Meet
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const link = `https://teams.microsoft.com/l/meetup-join/${Math.random().toString(36).substring(2, 12)}`;
                            const { error } = await updateEvent(selectedEvent.id, { meeting_link: link });
                            if (!error) {
                              setSelectedEvent({ ...selectedEvent, meeting_link: link });
                              success('Microsoft Teams', 'Möteslänk genererad och sparad!');
                            }
                          }}
                          className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors text-sm"
                        >
                          <Video className="w-4 h-4 mr-1.5 text-purple-600" />
                          Teams
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-6">
                  {/* Time & Date */}
                  <div className="flex items-start">
                    <Clock className="w-5 h-5 mr-3 mt-1 text-gray-400 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-gray-800">Tid & Datum</h4>
                      <p className="text-gray-600">
                        {selectedEvent.start_time ? formatSwedishDateTime(new Date(selectedEvent.start_time)) : 'Ingen starttid'}
                        {selectedEvent.end_time && ` - ${formatSwedishTime(new Date(selectedEvent.end_time))}`}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  {selectedEvent.location && (
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 mr-3 mt-1 text-gray-400 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-gray-800">Plats</h4>
                        <p className="text-gray-600">{selectedEvent.location}</p>
                      </div>
                    </div>
                  )}

                  {/* Meeting Link */}
                  {selectedEvent.meeting_link && (
                    <div className="flex items-start">
                      <Video className="w-5 h-5 mr-3 mt-1 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">
                          {selectedEvent.meeting_link.includes('teams.microsoft.com') ? 'Microsoft Teams' : 'Google Meet'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <a href={selectedEvent.meeting_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all text-sm">
                            {selectedEvent.meeting_link.length > 50
                              ? selectedEvent.meeting_link.substring(0, 50) + '...'
                              : selectedEvent.meeting_link}
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedEvent.meeting_link || '');
                              // Show brief feedback
                              const btn = document.getElementById('copy-link-btn');
                              if (btn) {
                                btn.classList.add('text-green-600');
                                btn.setAttribute('title', 'Kopierad!');
                                setTimeout(() => {
                                  btn.classList.remove('text-green-600');
                                  btn.setAttribute('title', 'Kopiera länk');
                                }, 2000);
                              }
                            }}
                            id="copy-link-btn"
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Kopiera länk"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {relatedOrder && ( // Use the new relatedOrder variable
                    <div className="flex items-start">
                      <Package className="w-5 h-5 mr-3 mt-1 text-gray-400 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-gray-800">Kopplad Order</h4>
                        <p className="text-gray-600">{relatedOrder.title}</p> {/* 2. Display the order title */}
                      </div>
                    </div>
                  )}
                </div>

                {/* MODIFIED: Description Section */}
                {/* Show the event's own description first */}
                {selectedEvent.description && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="font-medium text-gray-800 mb-2">Beskrivning (Händelse)</h4>
                    <p className="text-gray-600 whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}

                {/* 3. ADD a new section for the order's description */}
                {relatedOrder?.description && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="font-medium text-gray-800 mb-2">Beskrivning (Order)</h4>
                    <p className="text-gray-600 whitespace-pre-wrap">{relatedOrder.description}</p>
                  </div>
                )}
              </div>


              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <div className="flex justify-between items-center">
                  {/* ADD THIS NEW BUTTONS SECTION */}
                  {selectedEvent.related_lead && ['new', 'contacted'].includes(selectedEvent.related_lead.status) && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleLeadOutcome(selectedEvent.related_lead, 'won')}
                        disabled={isSubmittingOutcome}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> {isSubmittingOutcome ? 'Sparar...' : 'Vunnen'}
                      </button>
                      <button
                        onClick={() => handleLeadOutcome(selectedEvent.related_lead, 'lost')}
                        disabled={isSubmittingOutcome}
                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        <X className="w-4 h-4 mr-2" /> {isSubmittingOutcome ? 'Sparar...' : 'Förlorad'}
                      </button>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleInitiateInvitation(selectedEvent, relatedOrder)}
                      disabled={isSendingInvite}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      {isSendingInvite ? 'Skickar...' : 'Skicka Inbjudan'}
                    </button>

                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-100"
                    >
                      Stäng
                    </button>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          handleEditEvent(selectedEvent);
                          setShowDetailModal(false);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Redigera
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(selectedEvent.id)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Ta bort
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      <InvitationPreviewModal
        isOpen={showInvitationPreview}
        onClose={() => setShowInvitationPreview(false)}
        onSend={handleConfirmSendInvitation}
        defaultContent={invitationData.content}
        recipientEmail={invitationData.recipientEmail}
        recipientPhone={invitationData.recipientPhone}
        subject={invitationData.subject}
        meetingLink={invitationData.meetingLink}
        isSending={isSendingInvite}
      />

      {showQuoteCreationModal && leadForQuote && (
        <QuoteCreationModal
          isOpen={showQuoteCreationModal}
          onClose={() => {
            setShowQuoteCreationModal(false);
            setLeadForQuote(null);
          }}
          onQuoteCreated={handleQuoteCreated}
          lead={leadForQuote}
        />
      )}

    </div>

  );
}



interface EventModalProps {
  event: CalendarEventWithRelations | null;
  // This should be the eventForm state, not the full interface
  eventFormData: Partial<EventFormData>;
  currentUser: UserProfile | null;
  availableUsers: UserProfile[];
  availableTeams: TeamWithRelations[];
  onClose: () => void;
  onSave: (eventData: EventFormData) => void; // Use the specific type for better safety
}

function EventModal({ event, eventFormData, currentUser, availableUsers, availableTeams, onClose, onSave }: EventModalProps) {
  const [assignmentType, setAssignmentType] = useState<'user' | 'team'>(
    // Default to 'team' if a team is already assigned, otherwise 'user'
    event?.assigned_to_team_id ? 'team' : 'user'
  );
  const [formData, setFormData] = useState({
    title: eventFormData.title || event?.title || '',
    description: eventFormData.description || event?.description || '',
    type: eventFormData.type || event?.type || 'meeting',
    start_time: eventFormData.start_time || '',
    end_time: eventFormData.end_time || '',
    location: eventFormData.location || event?.location || '',
    meeting_link: eventFormData.meeting_link || event?.meeting_link || '',
    assigned_to_user_id: eventFormData.assigned_to_user_id || event?.assigned_to_user_id || currentUser?.id || '',
    assigned_to_team_id: eventFormData.assigned_to_team_id || event?.assigned_to_team_id || '', // Add this line
    related_order_id: eventFormData.related_order_id || event?.related_order_id || '',
    related_lead_id: eventFormData.related_lead_id || event?.related_lead_id || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const canAssignToUser = (userId: string) => {
    if (!currentUser) return false;
    return canUserCreateEventFor(currentUser, userId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {event ? 'Redigera händelse' : 'Ny händelse'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Header Actions - Meeting Link Generators */}
          <div className="flex justify-end gap-2 mb-2">
            {!formData.meeting_link ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const link = `https://meet.google.com/${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
                    setFormData(prev => ({ ...prev, meeting_link: link }));
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Video className="w-3 h-3 mr-1 text-blue-600" />
                  Google Meet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const link = `https://teams.microsoft.com/l/meetup-join/${Math.random().toString(36).substring(2, 12)}`;
                    setFormData(prev => ({ ...prev, meeting_link: link }));
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Video className="w-3 h-3 mr-1 text-purple-600" />
                  Teams
                </button>
              </>
            ) : (
              <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                <Video className="w-3 h-3 mr-1" />
                {formData.meeting_link.includes('teams.microsoft.com') ? 'Teams-länk' : 'Meet-länk'} genererad
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, meeting_link: '' }))}
                  className="ml-2 text-gray-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titel *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Händelsetitel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Typ *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="meeting">Möte</option>
              <option value="task">Uppgift</option>
              <option value="reminder">Påminnelse</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Starttid *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sluttid
              </label>
              <input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tilldelningstyp
              </label>
              <select
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value as 'user' | 'team')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="user">Användare</option>
                <option value="team">Team</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tilldelad till
              </label>
              {assignmentType === 'user' ? (
                <select
                  value={formData.assigned_to_user_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_to_user_id: e.target.value, assigned_to_team_id: null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Ingen tilldelning</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={formData.assigned_to_team_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_to_team_id: e.target.value, assigned_to_user_id: null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Inget team</option>
                  {availableTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plats
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mötesplats eller adress"
            />
          </div>

          {formData.meeting_link && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Meet Länk
              </label>
              <input
                type="text"
                readOnly
                value={formData.meeting_link}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500 select-all"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beskrivning
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ytterligare information om händelsen"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {event ? 'Uppdatera' : 'Skapa'} händelse
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CalendarView;