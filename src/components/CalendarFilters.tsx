import React, { useState, useEffect } from 'react';
import {
  Filter,
  Users,
  User,
  X,
  ChevronDown,
  Check,
  Calendar,
  Building,
  Search
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTeams, type TeamWithRelations } from '../lib/teams';
import { getUserProfiles, type UserProfile } from '../lib/database';

interface CalendarFiltersProps {
  selectedUsers: string[];
  selectedTeams: string[];
  users: UserProfile[]; // Add this
  teams: TeamWithRelations[]; // Add this
  selectedCity: string; // Add this line
  cities: string[]; // Add this line
  onUserChange: (userIds: string[]) => void;
  onTeamChange: (teamIds: string[]) => void;
  onCityChange: (city: string) => void; // Add this line
  onClearFilters: () => void;
  className?: string;
  userTeams: TeamWithRelations[];
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

interface FilterSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  items: Array<{
    id: string;
    name: string;
    avatar?: string;
    color?: string;
    role?: string;
    specialty?: string;
  }>;
}

function CalendarFilters({
  selectedUsers,
  selectedTeams,
  selectedCity, 
  cities,     
  users,
  teams,
  onUserChange,
  onTeamChange,
  searchTerm,
  onSearchTermChange,
  onCityChange,
  userTeams,
  onClearFilters,
  className = ''
}: CalendarFiltersProps) {
    const [isUserSectionOpen, setIsUserSectionOpen] = useState(true);
  const [isTeamSectionOpen, setIsTeamSectionOpen] = useState(true);
  const [isCitySectionOpen, setIsCitySectionOpen] = useState(true);

  const handleUserToggle = (userId: string) => {
    const newSelection = selectedUsers.includes(userId)
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId];
    onUserChange(newSelection);
  };

  const handleTeamToggle = (teamId: string) => {
    const newSelection = selectedTeams.includes(teamId)
      ? selectedTeams.filter(id => id !== teamId)
      : [...selectedTeams, teamId];
    onTeamChange(newSelection);
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      onUserChange([]);
    } else {
      onUserChange(users.map(u => u.id));
    }
  };

  const handleSelectAllTeams = () => {
    if (selectedTeams.length === teams.length) {
      onTeamChange([]);
    } else {
      onTeamChange(teams.map(t => t.id));
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActiveFiltersCount = () => {
  return selectedUsers.length + selectedTeams.length + (selectedCity ? 1 : 0);
};

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTeamColor = (specialty: string) => {
    const colors = {
      fönsterputsning: 'bg-blue-500',
      taktvätt: 'bg-green-500',
      fasadtvätt: 'bg-purple-500',
      allmänt: 'bg-gray-500',
      övrigt: 'bg-orange-500'
    };
    return colors[specialty as keyof typeof colors] || 'bg-gray-500';
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-red-500',
      sales: 'bg-blue-500',
      worker: 'bg-green-500'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-500';
  };

return (
  <div className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm ${className}`}>
    {/* Header with Title and "Clear All" button */}
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-base font-semibold text-gray-900 flex items-center">
        <Filter className="w-4 h-4 mr-2" />
        Filter
      </h3>
      {getActiveFiltersCount() > 0 && (
        <button
          onClick={onClearFilters}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
        >
          Rensa alla
        </button>
      )}
    </div>

    {/* Your existing Search Input */}
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
      type="text"
      placeholder="Sök..."
      value={searchTerm} // Use the prop
      onChange={(e) => onSearchTermChange(e.target.value)} // Use the prop function
      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
       />
    </div>

    {/* Main Accordion container */}
    <div className="space-y-3">
      {/* Users Accordion Section */}
      <div>
        <button
          onClick={() => setIsUserSectionOpen(!isUserSectionOpen)}
          className="w-full flex items-center justify-between text-left p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg"
        >
          <div className="flex items-center">
            <User className="w-4 h-4 mr-2 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Användare</span>
            {selectedUsers.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {selectedUsers.length}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isUserSectionOpen ? 'rotate-180' : ''}`} />
        </button>
        {isUserSectionOpen && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
            <div className="flex justify-end px-2">
              <button onClick={handleSelectAllUsers} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                {selectedUsers.length === filteredUsers.length ? 'Avmarkera alla' : 'Markera alla'}
              </button>
            </div>
            {filteredUsers.map(user => (
              <label key={user.id} className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleUserToggle(user.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ml-3 mr-2 ${getRoleColor(user.role)}`}>
                  {getUserInitials(user.full_name)}
                </div>
                <span className="text-sm text-gray-700">{user.full_name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Teams Accordion Section */}
      <div>
        <button
          onClick={() => setIsTeamSectionOpen(!isTeamSectionOpen)}
          className="w-full flex items-center justify-between text-left p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg"
        >
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Team</span>
            {selectedTeams.length > 0 && (
              <span className="ml-2 bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {selectedTeams.length}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isTeamSectionOpen ? 'rotate-180' : ''}`} />
        </button>
        {isTeamSectionOpen && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
             <div className="flex justify-end px-2">
              <button onClick={handleSelectAllTeams} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                {selectedTeams.length === filteredTeams.length ? 'Avmarkera alla' : 'Markera alla'}
              </button>
            </div>
            {filteredTeams.map(team => (
              <label key={team.id} className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTeams.includes(team.id)}
                  onChange={() => handleTeamToggle(team.id)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-medium ml-3 mr-2 ${getTeamColor(team.specialty)}`}>
                    <Users className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-700">{team.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {/* City Filter Accordion Section */}
    <div>
      <button
        onClick={() => setIsCitySectionOpen(!isCitySectionOpen)}
        className="w-full flex items-center justify-between text-left p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg"
      >
        <div className="flex items-center">
          <Building className="w-4 h-4 mr-2 text-gray-600" />
          <span className="text-sm font-medium text-gray-800">Säljområde</span>
          {selectedCity && (
            <span className="ml-2 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              1
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isCitySectionOpen ? 'rotate-180' : ''}`} />
      </button>
      {isCitySectionOpen && (
        <div className="mt-2 space-y-1">
          <select
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Alla städer</option>
            {(cities || []).map(city => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
    </div>
  </div>
);
}

export default CalendarFilters;