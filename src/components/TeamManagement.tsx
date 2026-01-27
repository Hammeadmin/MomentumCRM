import React, { useState, useEffect, useRef } from 'react';
import {
  Users2,
  Eye,
  Plus,
  Search,
  Filter,
  Crown,
  User,
  MapPin,
  Clock,
  TrendingUp,
  Activity,
  Edit,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Target,
  Phone,
  Mail,
  UserPlus,
  UserMinus,
  ChevronDown,
  FileText,
  Loader2,
  Send,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamStats,
  getUnassignedUsers,
  addTeamMember,
  removeTeamMember,
  type TeamWithRelations,
  type TeamFilters,

} from '../lib/teams';
import { getTeamMembers, formatCurrency, formatDate, createUser, updateUserProfile } from '../lib/database';
import {
  TEAM_SPECIALTY_LABELS,
  TEAM_ROLE_LABELS,

  getTeamSpecialtyColor,
  getTeamRoleColor,
  UserRole, EmploymentType,
  type TeamSpecialty,
  type TeamRole,
  type UserProfile,

  type TimeLog,
  type PayrollAdjustment
} from '../types/database';
import {
  getTimeLogsForPayroll,
  updateTimeLogApproval,
  getPayrollAdjustments,
  addPayrollAdjustment,
  deletePayrollAdjustment,
  getPayrollStatus,
  updatePayrollStatus,
  getPayrollDataForPeriod
} from '../lib/teams';
import EmptyState from './EmptyState';
import ConfirmDialog from './ConfirmDialog';
import { supabase } from '../lib/supabase';





const CreateUserModal = ({ isOpen, onClose, onCreate, isLoading, organisationId }: { isOpen: boolean; onClose: () => void; onCreate: (userData: any) => void; isLoading: boolean; organisationId: string | null }) => {
  const [employmentType, setEmploymentType] = useState<EmploymentType>('hourly');
  const [hasCommission, setHasCommission] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userData = {
      organisation_id: organisationId,
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as UserRole,
      phone_number: formData.get('phone_number') as string,
      address: formData.get('address') as string,
      postal_code: formData.get('postal_code') as string,
      city: formData.get('city') as string,
      personnummer: formData.get('personnummer') as string,
      bank_account_number: formData.get('bank_account_number') as string,
      employment_type: employmentType,
      base_hourly_rate: employmentType === 'hourly' ? Number(formData.get('base_hourly_rate')) : null,
      base_monthly_salary: employmentType === 'salary' ? Number(formData.get('base_monthly_salary')) : null,
      has_commission: hasCommission,
      commission_rate: hasCommission ? Number(formData.get('commission_rate')) : null,
    };
    onCreate(userData);
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Skapa ny användare</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700">Fullständigt namn*</label><input type="text" name="full_name" required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700">E-postadress*</label><input type="email" name="email" required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Telefonnummer</label><input type="tel" name="phone_number" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Roll*</label><select name="role" required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"><option value="worker">Arbetare</option><option value="sales">Säljare</option><option value="admin">Administratör</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700">Adress</label><input type="text" name="address" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Stad</label><input type="text" name="city" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Postnummer</label><input type="text" name="postal_code" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Personnummer</label><input type="text" name="personnummer" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Bankkontonummer</label><input type="text" name="bank_account_number" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
          </div>
          <div className="border-t pt-4 space-y-4">
            <div><label className="block text-sm font-medium text-gray-700">Anställningstyp*</label><select value={employmentType} onChange={(e) => setEmploymentType(e.target.value as EmploymentType)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"><option value="hourly">Timlön</option><option value="salary">Månadslön</option></select></div>
            {employmentType === 'hourly' && <div><label className="block text-sm font-medium text-gray-700">Timlön (SEK)</label><input type="number" step="0.01" name="base_hourly_rate" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>}
            {employmentType === 'salary' && <div><label className="block text-sm font-medium text-gray-700">Månadslön (SEK)</label><input type="number" step="0.01" name="base_monthly_salary" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>}
            <div className="flex items-center"><input type="checkbox" id="has_commission" checked={hasCommission} onChange={(e) => setHasCommission(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /><label htmlFor="has_commission" className="ml-2 block text-sm text-gray-900">Har provision</label></div>
            {hasCommission && <div><label className="block text-sm font-medium text-gray-700">Provisionssats (%)</label><input type="number" step="0.01" name="commission_rate" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>}
          </div>
          <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium">Avbryt</button><button type="submit" disabled={isLoading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">{isLoading ? 'Skapar...' : 'Skapa Användare'}</button></div>
        </form>
      </div>
    </div>
  );
};

const MultiSelectDropdown = ({ options, selected, onChange, placeholder = "Välj städer..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    const newSelection = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelection);
  };

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase()) && !selected.includes(option)
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">Tilldelade städer</label>
      <div onClick={() => setIsOpen(!isOpen)} className="w-full min-h-[42px] p-2 flex flex-wrap gap-2 items-center border border-gray-300 rounded-md bg-white cursor-pointer relative">
        {selected.length > 0 ? (
          selected.map(item => (
            <span key={item} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center">
              {item}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOption(item);
                }}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <X size={12} />
              </button>
            </span>
          ))
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2">
            <input
              type="text"
              placeholder="Sök..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <ul>
            {filteredOptions.map(option => (
              <li
                key={option}
                onClick={() => toggleOption(option)}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                {option}
              </li>
            ))}
            {filteredOptions.length === 0 && <li className="px-4 py-2 text-sm text-gray-500">Inga alternativ hittades.</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

function TeamManagement() {
  const { user, organisationId } = useAuth();
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<'teams' | 'members' | 'payroll'>('teams');
  const [teams, setTeams] = useState<TeamWithRelations[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [unassignedUsers, setUnassignedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamStats, setTeamStats] = useState<any>(null);

  const handleCreateUser = async (userData: any) => {
    setFormLoading(true);
    const { error } = await createUser(userData); // createUser will invoke the Edge Function
    if (error) {
      showError('Fel vid skapande av användare', error.message);
    } else {
      success('Användare skapad!', 'Ett e-postmeddelande har skickats till användaren.');
      setShowCreateUserModal(false);
      await loadData(); // Reload all data to see the new user
    }
    setFormLoading(false);
  };


  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithRelations | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<TeamWithRelations | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    specialty: 'allmänt' as TeamSpecialty,
    team_leader_id: '',
    hourly_rate: '',
    cities: [] as string[]
  });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberRoles, setMemberRoles] = useState<Record<string, TeamRole>>({});
  const [formLoading, setFormLoading] = useState(false);

  // Filter states
  const [filters, setFilters] = useState<TeamFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [showUserEditModal, setShowUserEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userEditData, setUserEditData] = useState<Partial<UserProfile>>({});



  const [showQuickAssignModal, setShowQuickAssignModal] = useState(false);
  const [userToAssign, setUserToAssign] = useState<UserProfile | null>(null);
  const [newMemberId, setNewMemberId] = useState(''); // For the dropdown in the edit modal



  // Payroll state (Task 10)
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [payrollData, setPayrollData] = useState<any[] | null>(null);
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [selectedPayrollUser, setSelectedPayrollUser] = useState<UserProfile | null>(null);
  const [payrollTimeLogs, setPayrollTimeLogs] = useState<TimeLog[]>([]);
  const [payrollAdjustments, setPayrollAdjustments] = useState<PayrollAdjustment[]>([]);
  const [newAdjustment, setNewAdjustment] = useState<Partial<PayrollAdjustment>>({ type: 'bonus', amount: 0, description: '' });
  const [selectedPayrollStatus, setSelectedPayrollStatus] = useState<'pending' | 'paid'>('pending');
  const [showInternalEmailModal, setShowInternalEmailModal] = useState(false);
  const [internalEmailRecipient, setInternalEmailRecipient] = useState<UserProfile | null>(null);
  const [internalEmailData, setInternalEmailData] = useState({ subject: '', content: '' });
  const [isSendingInternalEmail, setIsSendingInternalEmail] = useState(false);
  const [selectedUsersForEmail, setSelectedUsersForEmail] = useState<string[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [bulkEmailData, setBulkEmailData] = useState({ subject: '', content: '' });
  const [emailAttachments, setEmailAttachments] = useState<{ filename: string; content: string; size: number }[]>([]);
  const [bulkEmailAttachments, setBulkEmailAttachments] = useState<{ filename: string; content: string; size: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'payroll') {
      loadPayroll();
    }
  }, [activeTab, selectedPayrollMonth]);

  const loadPayroll = async () => {
    setLoadingPayroll(true);
    try {
      const startOfMonth = `${selectedPayrollMonth}-01`;
      const endOfMonth = new Date(new Date(startOfMonth).getFullYear(), new Date(startOfMonth).getMonth() + 1, 0).toISOString().substring(0, 10);
      const userIds = allUsers.map((u: UserProfile) => u.id);

      const { data } = await getPayrollDataForPeriod(organisationId!, startOfMonth, endOfMonth, userIds);

      if (data) {
        const payrollList = allUsers.map((user: UserProfile) => {
          const timeLogs = data.timeLogs[user.id] || [];
          const adjustments = data.adjustments[user.id] || [];
          const status = data.statuses[user.id] || 'pending';

          const totalHours = timeLogs.reduce((sum, log) => {
            const start = new Date(log.start_time).getTime();
            const end = new Date(log.end_time).getTime();
            const dur = (end - start) / (1000 * 60 * 60);
            const net = Math.max(0, dur - (log.break_duration / 60));
            return sum + net;
          }, 0);

          // Use user's base hourly rate if log doesn't have one (fallback)
          const hourlyPay = timeLogs.reduce((sum, log) => sum + (log.total_amount || 0), 0);

          const adjustmentTotal = adjustments.reduce((sum, adj) => {
            return adj.type === 'deduction' ? sum - adj.amount : sum + adj.amount;
          }, 0);

          const grossSalary = (user.base_monthly_salary || 0) + hourlyPay + adjustmentTotal; // Simplified

          return {
            user,
            totalHours,
            hourlyPay,
            adjustmentTotal,
            grossSalary,
            status,
            adjustments // Included for tooltip display
          };
        });

        setPayrollData(payrollList);
      }
    } catch (err) {
      console.error(err);
      showError('Fel vid laddning av löner', 'Kunde inte hämta löneunderlag.');
    } finally {
      setLoadingPayroll(false);
    }
  };

  const openPayrollDetails = async (user: UserProfile) => {
    setSelectedPayrollUser(user);
    setShowPayrollModal(true);
    // Fetch details
    const startOfMonth = `${selectedPayrollMonth}-01`;
    const endOfMonth = new Date(new Date(startOfMonth).getFullYear(), new Date(startOfMonth).getMonth() + 1, 0).toISOString().substring(0, 10);

    const { data: logs } = await getTimeLogsForPayroll(user.id, startOfMonth, endOfMonth);
    const { data: adjs } = await getPayrollAdjustments(user.id, startOfMonth, endOfMonth);
    const { status } = await getPayrollStatus(user.id, selectedPayrollMonth);

    setPayrollTimeLogs(logs || []);
    setPayrollAdjustments(adjs || []);
    setSelectedPayrollStatus(status);
  };

  const handleTogglePaidStatus = async () => {
    if (!selectedPayrollUser) return;
    try {
      const newStatus = selectedPayrollStatus === 'pending' ? 'paid' : 'pending';
      const { error } = await updatePayrollStatus(selectedPayrollUser.id, selectedPayrollMonth, newStatus, organisationId!);

      if (error) {
        showError('Fel vid uppdatering', 'Kunde inte ändra status.');
        return;
      }

      setSelectedPayrollStatus(newStatus);
      await loadPayroll(); // Refresh list view
      success('Status uppdaterad', `Månaden markerad som ${newStatus === 'paid' ? 'utbetald' : 'ej utbetald'}.`);
    } catch (err) {
      showError('Ett fel inträffade', 'Kunde inte uppdatera status.');
    }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayrollUser) return;

    if (!newAdjustment.amount || Number(newAdjustment.amount) <= 0) {
      showError('Ogiltigt belopp', 'Vänligen ange ett belopp större än 0.');
      return;
    }
    if (!newAdjustment.description || newAdjustment.description.trim().length < 2) {
      showError('Beskrivning saknas', 'Vänligen ange en beskrivning för justeringen.');
      return;
    }

    try {
      const { data, error } = await addPayrollAdjustment({
        organisation_id: organisationId,
        user_id: selectedPayrollUser.id,
        amount: Number(newAdjustment.amount),
        description: newAdjustment.description,
        type: newAdjustment.type as any,
        date: new Date().toISOString().substring(0, 10)
      });

      if (error || !data) {
        showError('Fel', 'Kunde inte lägga till justering');
      } else {
        success('Sparat', 'Justering tillagd');
        setPayrollAdjustments([...payrollAdjustments, data]);
        setNewAdjustment({ type: 'bonus', amount: 0, description: '' });
        loadPayroll(); // Refresh totals
      }
    } catch (err) {
      showError('Ett fel inträffade', 'Kunde inte spara justeringen.');
    }
  };

  const handleDeleteAdjustment = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna justering?')) return;

    const { error } = await deletePayrollAdjustment(id);
    if (error) {
      showError('Fel', 'Kunde inte ta bort justeringen.');
    } else {
      success('Borttagen', 'Justeringen har tagits bort.');
      setPayrollAdjustments(payrollAdjustments.filter(a => a.id !== id));
      loadPayroll();
    }
  };


  const handleTimeLogUpdate = async (logId: string, updates: any) => {
    const { error } = await updateTimeLogApproval(logId, updates);
    if (error) {
      showError('Fel', 'Kunde inte uppdatera tidrapport');
    } else {
      success('Uppdaterad', 'Tidrapport uppdaterad');
      if (selectedPayrollUser) {
        // refresh details
        openPayrollDetails(selectedPayrollUser);
        loadPayroll();
      }
    }
  };

  const handleAddMemberToTeam = async (teamId: string, userId: string) => {
    if (!userId) {
      showError('Fel', 'Välj en medlem att lägga till.');
      return;
    }
    const result = await addTeamMember({
      team_id: teamId,
      user_id: userId,
      role_in_team: 'medarbetare', // Default role
      organisation_id: organisationId
    });

    if (result.error) {
      showError('Fel', result.error.message);
    } else {
      success('Framgång', 'Medlem tillagd i teamet!');
      await loadData(); // Refresh all data
    }
    setNewMemberId(''); // Reset dropdown
  };

  const handleRemoveMemberFromTeam = async (memberId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna medlem från teamet?')) return;

    const result = await removeTeamMember(memberId);
    if (result.error) {
      showError('Fel', result.error.message);
    } else {
      success('Framgång', 'Medlem borttagen från teamet!');
      await loadData();
      setShowDetailsModal(false); // Close details modal if open to see changes
      setShowEditModal(false);   // Close edit modal
    }
  };

  const handleViewUser = (user: UserProfile) => {
    setSelectedUser(user);
    setShowUserDetailsModal(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setUserEditData({ ...user }); // Pre-fill form with user data
    setShowUserEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setFormLoading(true);
    // updateUserProfile should be in your lib/database.ts
    const { error } = await updateUserProfile(selectedUser.id, userEditData);

    if (error) {
      showError('Fel', error.message);
    } else {
      success('Framgång', 'Användare uppdaterad!');
      setShowUserEditModal(false);
      setSelectedUser(null);
      await loadData(); // Reload all data
    }
    setFormLoading(false);
  };

  const swedishCities = [
    "Alingsås", "Arboga", "Arvika", "Askersund", "Avesta",
    "Boden", "Bollnäs", "Borgholm", "Borlänge", "Borås", "Båstad",
    "Eksjö", "Enköping", "Eskilstuna", "Eslöv",
    "Fagersta", "Falkenberg", "Falköping", "Falsterbo", "Falun", "Filipstad", "Flen",
    "Gränna", "Gävle", "Göteborg",
    "Hagfors", "Halmstad", "Haparanda", "Hedemora", "Helsingborg", "Hjo", "Hudiksvall", "Huskvarna", "Härnösand", "Hässleholm", "Höganäs",
    "Jönköping",
    "Kalmar", "Karlshamn", "Karlskoga", "Karlskrona", "Karlstad", "Katrineholm", "Kiruna", "Kramfors", "Kristianstad", "Kristinehamn", "Kumla", "Kungsbacka", "Kungälv", "Köping",
    "Laholm", "Landskrona", "Lidköping", "Lindesberg", "Linköping", "Ljungby", "Ludvika", "Luleå", "Lund", "Lycksele", "Lysekil",
    "Malmö", "Mariefred", "Mariestad", "Marstrand", "Mjölby", "Motala", "Mölndal",
    "Nora", "Norrköping", "Norrtälje", "Nybro", "Nyköping", "Nynäshamn", "Nässjö",
    "Oskarshamn", "Oxelösund",
    "Piteå",
    "Ronneby",
    "Sala", "Sandviken", "Sigtuna", "Simrishamn", "Skara", "Skellefteå", "Skänninge", "Skövde", "Sollefteå", "Stockholm", "Strängnäs", "Strömstad", "Sundsvall", "Säffle", "Säter", "Sävsjö", "Söderhamn", "Söderköping", "Södertälje", "Sölvesborg",
    "Tidaholm", "Torshälla", "Tranås", "Trelleborg", "Trollhättan", "Trosa",
    "Uddevalla", "Ulricehamn", "Umeå", "Uppsala",
    "Vadstena", "Varberg", "Vetlanda", "Vimmerby", "Visby", "Vänersborg", "Värnamo", "Västervik", "Västerås", "Växjö",
    "Ystad",
    "Åhus", "Åmål",
    "Ängelholm",
    "Örebro", "Öregrund", "Örnsköldsvik", "Östersund", "Östhammar"
  ];

  useEffect(() => {
    loadData();
  }, [filters, activeTab]);



  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [teamsResult, usersResult, unassignedResult, statsResult] = await Promise.all([
        getTeams(organisationId, filters),
        getTeamMembers(organisationId),
        getUnassignedUsers(organisationId),
        getTeamStats(organisationId)
      ]);

      if (teamsResult.error) {
        setError(teamsResult.error.message);
        return;
      }

      if (usersResult.error) {
        setError(usersResult.error.message);
        return;
      }

      setTeams(teamsResult.data || []);
      setAllUsers(usersResult.data || []);
      setUnassignedUsers(unassignedResult.data || []);
      setTeamStats(statsResult.data);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ett oväntat fel inträffade vid laddning av data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.team_leader_id) {
      showError('Fel', 'Teamnamn och teamledare är obligatoriska fält.');
      return;
    }

    try {
      setFormLoading(true);

      const teamData = {
        organisation_id: organisationId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        specialty: formData.specialty,
        team_leader_id: formData.team_leader_id,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        cities: formData.cities
      };

      const result = await createTeam(teamData, selectedMembers, memberRoles);

      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }

      success('Framgång', 'Team skapat framgångsrikt!');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error creating team:', err);
      showError('Fel', 'Ett oväntat fel inträffade vid skapande av team.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTeam || !formData.name.trim()) {
      showError('Fel', 'Teamnamn är obligatoriskt.');
      return;
    }

    try {
      setFormLoading(true);

      const updates = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        specialty: formData.specialty,
        team_leader_id: formData.team_leader_id || null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        cities: formData.cities
      };

      const result = await updateTeam(selectedTeam.id, updates);

      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }

      success('Framgång', 'Team uppdaterat framgångsrikt!');
      setShowEditModal(false);
      setSelectedTeam(null);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error updating team:', err);
      showError('Fel', 'Ett oväntat fel inträffade vid uppdatering av team.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;

    try {
      const result = await deleteTeam(teamToDelete.id);

      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }

      success('Framgång', 'Team borttaget framgångsrikt!');
      setShowDeleteDialog(false);
      setTeamToDelete(null);
      loadData();
    } catch (err) {
      console.error('Error deleting team:', err);
      showError('Fel', 'Ett oväntat fel inträffade vid borttagning av team.');
    }
  };

  const handleEditTeam = (team: TeamWithRelations) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      specialty: team.specialty,
      team_leader_id: team.team_leader_id || '',
      hourly_rate: team.hourly_rate?.toString() || '',
      cities: team.cities || []
    });
    setShowEditModal(true);
  };

  const handleMemberRoleChange = (userId: string, role: TeamRole) => {
    setMemberRoles(prev => ({ ...prev, [userId]: role }));
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );

    // Set default role if not set
    if (!memberRoles[userId]) {
      setMemberRoles(prev => ({ ...prev, [userId]: 'medarbetare' }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      specialty: 'allmänt',
      team_leader_id: '',
      hourly_rate: '',
      cities: []
    });
    setSelectedMembers([]);
    setMemberRoles({});
  };

  const handleFileSelect = async (files: FileList | null, isBulk: boolean = false) => {
    if (!files) return;

    const maxSize = 10 * 1024 * 1024;
    const newAttachments: { filename: string; content: string; size: number }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSize) {
        showError('Fil för stor', `${file.name} överskrider 10MB gränsen.`);
        continue;
      }

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      newAttachments.push({
        filename: file.name,
        content: base64,
        size: file.size
      });
    }

    if (isBulk) {
      setBulkEmailAttachments(prev => [...prev, ...newAttachments]);
    } else {
      setEmailAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (index: number, isBulk: boolean = false) => {
    if (isBulk) {
      setBulkEmailAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setEmailAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const handleSendInternalEmail = async () => {
    if (!internalEmailRecipient?.email || !internalEmailData.subject || !internalEmailData.content) return;

    setIsSendingInternalEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          to: internalEmailRecipient.email,
          subject: internalEmailData.subject,
          content: internalEmailData.content,
          attachments: emailAttachments.map(a => ({ filename: a.filename, content: a.content })),
        }),
      });

      if (response.ok) {
        showSuccess('Skickat!', 'E-postmeddelandet har skickats.');
        setShowInternalEmailModal(false);
        setInternalEmailRecipient(null);
        setInternalEmailData({ subject: '', content: '' });
        setEmailAttachments([]);
      } else {
        throw new Error('Failed to send email');
      }
    } catch (err) {
      console.error('Error sending internal email:', err);
      showError('Fel', 'Kunde inte skicka e-post. Försök igen.');
    } finally {
      setIsSendingInternalEmail(false);
    }
  };

  const handleSendBulkEmail = async () => {
    if (selectedUsersForEmail.length === 0 || !bulkEmailData.subject || !bulkEmailData.content) return;

    setIsSendingInternalEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const selectedUserEmails = allUsers
        .filter(u => selectedUsersForEmail.includes(u.id) && u.email)
        .map(u => u.email!);

      if (selectedUserEmails.length === 0) {
        showError('Fel', 'Inga giltiga e-postadresser hittades.');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          to: selectedUserEmails[0],
          cc: selectedUserEmails.slice(1),
          subject: bulkEmailData.subject,
          content: bulkEmailData.content,
          attachments: bulkEmailAttachments.map(a => ({ filename: a.filename, content: a.content })),
        }),
      });

      if (response.ok) {
        success('Skickat!', `E-post skickades till ${selectedUserEmails.length} mottagare.`);
        setShowBulkEmailModal(false);
        setSelectedUsersForEmail([]);
        setBulkEmailData({ subject: '', content: '' });
        setBulkEmailAttachments([]);
      } else {
        throw new Error('Failed to send email');
      }
    } catch (err) {
      console.error('Error sending bulk email:', err);
      showError('Fel', 'Kunde inte skicka e-post. Försök igen.');
    } finally {
      setIsSendingInternalEmail(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsersForEmail(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    const usersWithEmail = filteredMembers.filter(u => u.email);
    if (selectedUsersForEmail.length === usersWithEmail.length) {
      setSelectedUsersForEmail([]);
    } else {
      setSelectedUsersForEmail(usersWithEmail.map(u => u.id));
    }
  };

  const filteredMembers = allUsers.filter(user => {
    if (!memberSearchTerm) return true;
    const search = memberSearchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.phone_number?.toLowerCase().includes(search) ||
      user.city?.toLowerCase().includes(search)
    );
  });

  const getUserTeam = (userId: string) => {
    for (const team of teams) {
      const member = team.members?.find(m => m.user_id === userId);
      if (member) return { team, member };
    }
    return null;
  };

  const getSpecialtyIcon = (specialty: TeamSpecialty) => {
    switch (specialty) {
      case 'fönsterputsning': return '🪟';
      case 'taktvätt': return '🏠';
      case 'fasadtvätt': return '🏢';
      case 'allmänt': return '🔧';
      case 'övrigt': return '⚡';
      default: return '🔧';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-4 shadow-lg shadow-blue-500/20">
              <Users2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
              <p className="text-sm text-gray-500">Laddar...</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Laddar team och medlemmar...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-10 h-10 text-red-600 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Kunde inte ladda team-data</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={loadData}
              className="ml-auto inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Försök igen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-4 shadow-lg shadow-blue-500/20">
            <Users2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-sm text-gray-500">
              {teams.length} team • {allUsers.length} medarbetare
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => setShowFilters(!showFilters)}
            icon={<Filter className="w-4 h-4" />}
          >
            Filter
          </Button>
          <Button
            variant="success"
            size="md"
            onClick={() => setShowCreateUserModal(true)}
            icon={<UserPlus className="w-4 h-4" />}
          >
            Skapa Användare
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowCreateModal(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Skapa Nytt Team
          </Button>
        </div>
      </div>

      {/* Team Statistics */}
      {teamStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Totalt Team</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.totalTeams}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Aktiva Team</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.activeTeams}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Totalt Medlemmar</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.totalMembers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Genomsnittlig Storlek</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.averageTeamSize}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'teams', label: 'Alla Team', icon: Users2 },
            { id: 'members', label: 'Teammedlemmar', icon: User }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sök</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Sök team..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialitet</label>
              <select
                value={filters.specialty || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, specialty: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alla specialiteter</option>
                {Object.entries(TEAM_SPECIALTY_LABELS).map(([specialty, label]) => (
                  <option key={specialty} value={specialty}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Rensa filter
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          {teams.length === 0 ? (
            <EmptyState
              type="general"
              title="Inga team ännu"
              description="Skapa ditt första team för att organisera medarbetare efter specialitet och projekt."
              actionText="Skapa Nytt Team"
              onAction={() => setShowCreateModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team: TeamWithRelations) => (
                <div key={team.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Team Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{getSpecialtyIcon(team.specialty)}</div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{team.name}</h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTeamSpecialtyColor(team.specialty)}`}>
                            {TEAM_SPECIALTY_LABELS[team.specialty]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEditTeam(team)}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setTeamToDelete(team);
                            setShowDeleteDialog(true);
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Team Description */}
                    {team.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{team.description}</p>
                    )}

                    {/* Team Leader */}
                    {team.team_leader && (
                      <div className="flex items-center space-x-2 mb-4 p-3 bg-blue-50 rounded-lg">
                        <Crown className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{team.team_leader.full_name}</p>
                          <p className="text-xs text-gray-500">Teamledare</p>
                        </div>
                      </div>
                    )}

                    {/* Team Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-gray-900">{team.member_count || 0}</p>
                        <p className="text-xs text-gray-500">Medlemmar</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-gray-900">{team.active_jobs_count || 0}</p>
                        <p className="text-xs text-gray-500">Aktiva Jobb</p>
                      </div>
                    </div>

                    {/* Hourly Rate */}
                    {team.hourly_rate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Timtaxa:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(team.hourly_rate)}/tim</span>
                      </div>
                    )}

                    {/* Team Members Preview */}
                    {team.members && team.members.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Medlemmar</span>
                          <button
                            onClick={() => {
                              setSelectedTeam(team);
                              setShowDetailsModal(true);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Visa alla
                          </button>
                        </div>
                        <div className="flex -space-x-2">
                          {team.members.slice(0, 4).map((member) => (
                            <div
                              key={member.id}
                              className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                              title={member.user?.full_name}
                            >
                              {member.user?.full_name?.charAt(0) || 'U'}
                            </div>
                          ))}
                          {team.members.length > 4 && (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
                              +{team.members.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
      }

      {/* Team Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Search and Actions Bar */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Sök på namn, e-post, telefon eller stad..."
                />
              </div>
              {selectedUsersForEmail.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {selectedUsersForEmail.length} valda
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowBulkEmailModal(true)}
                    icon={<Mail className="w-4 h-4" />}
                  >
                    Skicka e-post till valda
                  </Button>
                  <button
                    onClick={() => setSelectedUsersForEmail([])}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* All Organisation Members */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Alla medarbetare</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {filteredMembers.length} av {allUsers.length} medarbetare
                </p>
              </div>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Inga medarbetare hittades</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedUsersForEmail.length === filteredMembers.filter(u => u.email).length && filteredMembers.length > 0}
                          onChange={toggleAllUsers}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medarbetare</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kontakt</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMembers.map((member) => {
                      const teamInfo = getUserTeam(member.id);
                      const roleLabels: Record<string, string> = {
                        admin: 'Administratör',
                        sales: 'Säljare',
                        worker: 'Arbetare',
                        finance: 'Ekonomi'
                      };
                      return (
                        <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedUsersForEmail.includes(member.id)}
                              onChange={() => toggleUserSelection(member.id)}
                              disabled={!member.email}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                            />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium shadow-sm">
                                {member.full_name?.charAt(0) || 'U'}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
                                {member.city && (
                                  <div className="text-xs text-gray-500 flex items-center">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {member.city}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              {member.email && (
                                <div className="text-sm text-gray-600 flex items-center">
                                  <Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                  {member.email}
                                </div>
                              )}
                              {member.phone_number && (
                                <div className="text-sm text-gray-600 flex items-center">
                                  <Phone className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                  {member.phone_number}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                              member.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                              member.role === 'sales' ? 'bg-blue-100 text-blue-800' :
                              member.role === 'finance' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {roleLabels[member.role] || member.role}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {teamInfo ? (
                              <div className="flex items-center">
                                <span className="text-lg mr-2">{getSpecialtyIcon(teamInfo.team.specialty)}</span>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{teamInfo.team.name}</div>
                                  <span className={`text-xs ${getTeamRoleColor(teamInfo.member.role_in_team)} px-1.5 py-0.5 rounded`}>
                                    {TEAM_ROLE_LABELS[teamInfo.member.role_in_team]}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 italic">Ej tilldelad</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                              member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {member.is_active ? 'Aktiv' : 'Inaktiv'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {member.email && (
                                <button
                                  onClick={() => {
                                    setInternalEmailRecipient(member);
                                    setShowInternalEmailModal(true);
                                  }}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Skicka e-post"
                                >
                                  <Mail className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleViewUser(member)}
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Visa detaljer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditUser(member)}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Redigera"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {!teamInfo && (
                                <button
                                  onClick={() => {
                                    setUserToAssign(member);
                                    setShowQuickAssignModal(true);
                                  }}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Tilldela till team"
                                >
                                  <UserPlus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {
        activeTab === 'payroll' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Löner & Tidrapporter</h2>
              <div className="flex items-center space-x-4">
                <input
                  type="month"
                  value={selectedPayrollMonth}
                  onChange={(e) => setSelectedPayrollMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <button onClick={loadPayroll} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full" title="Uppdatera">
                  <Activity className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              {loadingPayroll ? (
                <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anställd</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timmar</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lön (Tid)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Justeringar</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Totalt</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Åtgärd</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payrollData && payrollData.map((row) => (
                        <tr key={row.user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{row.user.full_name}</div>
                            <div className="text-gray-500 text-sm">{row.user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{row.user.role}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.totalHours?.toFixed(1)} h</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.hourlyPay)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm cursor-help ${row.adjustmentTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}
                            title={row.adjustments && row.adjustments.length > 0
                              ? row.adjustments.map((a: any) => `${a.description}: ${a.type === 'deduction' ? '-' : '+'}${a.amount}kr`).join('\n')
                              : 'Inga justeringar'}
                          >
                            <div className="flex items-center">
                              {row.adjustmentTotal > 0 ? '+' : ''}{formatCurrency(row.adjustmentTotal)}
                              {row.adjustments && row.adjustments.length > 0 && (
                                <FileText className="w-3 h-3 ml-1.5 opacity-50" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(row.grossSalary)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {row.status === 'paid' ? 'Utbetald' : 'Ej utbetald'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openPayrollDetails(row.user)}
                              className="text-blue-600 hover:text-blue-900 font-medium flex items-center justify-end"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Hantera
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!payrollData || payrollData.length === 0) && (
                        <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500 italic">Ingen löneinformation hittades för denna period</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )
              }
            </div>
          </div>
        )
      }

      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onCreate={handleCreateUser}
        isLoading={formLoading}
        organisationId={organisationId}
      />

      {/* User Details Modal */}
      {
        showUserDetailsModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between p-6 border-b">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedUser.full_name}</h3>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
                <button onClick={() => setShowUserDetailsModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Left Column */}
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Kontakt & Information</h4>
                    <div className="text-sm space-y-2 border-l-2 border-gray-200 pl-4">
                      <p><strong className="text-gray-600 w-24 inline-block">Roll:</strong> {selectedUser.role}</p>
                      <p><strong className="text-gray-600 w-24 inline-block">Telefon:</strong> {selectedUser.phone_number || 'Ej angivet'}</p>
                      <p><strong className="text-gray-600 w-24 inline-block">Personnr:</strong> {selectedUser.personnummer || 'Ej angivet'}</p>
                      <p><strong className="text-gray-600 w-24 inline-block">Status:</strong>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${selectedUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {selectedUser.is_active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Adress</h4>
                    <div className="text-sm space-y-2 border-l-2 border-gray-200 pl-4">
                      <p>{selectedUser.address || 'Ingen adress angiven'}</p>
                      <p>{selectedUser.postal_code} {selectedUser.city}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Anställning & Lön</h4>
                    <div className="text-sm space-y-2 border-l-2 border-gray-200 pl-4">
                      <p><strong className="text-gray-600 w-28 inline-block">Anst. typ:</strong> {selectedUser.employment_type === 'hourly' ? 'Timlön' : 'Månadslön'}</p>
                      {selectedUser.employment_type === 'hourly' && <p><strong className="text-gray-600 w-28 inline-block">Timlön:</strong> {formatCurrency(selectedUser.base_hourly_rate || 0)}</p>}
                      {selectedUser.employment_type === 'salary' && <p><strong className="text-gray-600 w-28 inline-block">Månadslön:</strong> {formatCurrency(selectedUser.base_monthly_salary || 0)}</p>}
                      <p><strong className="text-gray-600 w-28 inline-block">Provision:</strong> {selectedUser.has_commission ? `Ja (${selectedUser.commission_rate || 0}%)` : 'Nej'}</p>
                      <p><strong className="text-gray-600 w-28 inline-block">Bankkonto:</strong> {selectedUser.bank_account_number || 'Ej angivet'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex justify-end">
                <button onClick={() => setShowUserDetailsModal(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium">Stäng</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Quick Assign Modal */}
      {
        showQuickAssignModal && userToAssign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-sm w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Tilldela {userToAssign.full_name}</h3>
                <button onClick={() => setShowQuickAssignModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <label className="block text-sm font-medium text-gray-700">Välj ett team att tilldela till:</label>
                <select
                  onChange={(e) => setNewMemberId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Välj team...</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 p-6 bg-gray-50 border-t">
                <button type="button" onClick={() => setShowQuickAssignModal(false)} className="px-4 py-2 border rounded-md text-sm">Avbryt</button>
                <button
                  onClick={() => {
                    handleAddMemberToTeam(newMemberId, userToAssign.id);
                    setShowQuickAssignModal(false);
                  }}
                  disabled={!newMemberId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50"
                >
                  Tilldela
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* User Edit Modal */}
      {
        showUserEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Redigera {selectedUser.full_name}</h3>
                <button onClick={() => setShowUserEditModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleUpdateUser} className="p-6">
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700">Fullständigt namn*</label><input type="text" value={userEditData.full_name || ''} onChange={e => setUserEditData(p => ({ ...p, full_name: e.target.value }))} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">E-post (kan ej ändras)</label><input type="email" value={userEditData.email || ''} disabled className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Telefonnummer</label><input type="tel" value={userEditData.phone_number || ''} onChange={e => setUserEditData(p => ({ ...p, phone_number: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Personnummer</label><input type="text" value={userEditData.personnummer || ''} onChange={e => setUserEditData(p => ({ ...p, personnummer: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Adress</label><input type="text" value={userEditData.address || ''} onChange={e => setUserEditData(p => ({ ...p, address: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Stad</label><input type="text" value={userEditData.city || ''} onChange={e => setUserEditData(p => ({ ...p, city: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Postnummer</label><input type="text" value={userEditData.postal_code || ''} onChange={e => setUserEditData(p => ({ ...p, postal_code: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                  </div>
                  {/* City Assignment */}
                  <div className="border-t border-gray-200 pt-6">
                    <MultiSelectDropdown
                      options={swedishCities}
                      selected={userEditData.cities || []}
                      onChange={(cities) => setUserEditData(p => ({ ...p, cities }))}
                      placeholder="Välj arbetstäder..."
                    />
                  </div>

                  {/* Employment & Role */}
                  <div className="border-t border-gray-200 pt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-gray-700">Roll*</label><select value={userEditData.role || ''} onChange={e => setUserEditData(p => ({ ...p, role: e.target.value as UserRole }))} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"><option value="worker">Arbetare</option><option value="sales">Säljare</option><option value="admin">Administratör</option></select></div>
                      <div><label className="block text-sm font-medium text-gray-700">Anställningstyp*</label><select value={userEditData.employment_type || ''} onChange={e => setUserEditData(p => ({ ...p, employment_type: e.target.value as EmploymentType }))} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"><option value="hourly">Timlön</option><option value="salary">Månadslön</option></select></div>
                      {userEditData.employment_type === 'hourly' && <div><label className="block text-sm font-medium text-gray-700">Timlön (SEK)</label><input type="number" step="0.01" value={userEditData.base_hourly_rate || ''} onChange={e => setUserEditData(p => ({ ...p, base_hourly_rate: Number(e.target.value) }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>}
                      {userEditData.employment_type === 'salary' && <div><label className="block text-sm font-medium text-gray-700">Månadslön (SEK)</label><input type="number" step="0.01" value={userEditData.base_monthly_salary || ''} onChange={e => setUserEditData(p => ({ ...p, base_monthly_salary: Number(e.target.value) }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>}
                    </div>
                    <div className="flex items-center"><input type="checkbox" id="is_active_edit" checked={userEditData.is_active || false} onChange={e => setUserEditData(p => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /><label htmlFor="is_active_edit" className="ml-2 block text-sm text-gray-900">Användarkonto är aktivt</label></div>
                  </div>

                  {/* Commission & Bank */}
                  <div className="border-t border-gray-200 pt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-gray-700">Bankkontonummer</label><input type="text" value={userEditData.bank_account_number || ''} onChange={e => setUserEditData(p => ({ ...p, bank_account_number: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
                    </div>
                    <div className="flex items-center"><input type="checkbox" id="has_commission_edit" checked={userEditData.has_commission || false} onChange={e => setUserEditData(p => ({ ...p, has_commission: e.target.checked }))} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /><label htmlFor="has_commission_edit" className="ml-2 block text-sm text-gray-900">Har provision</label></div>
                    {userEditData.has_commission && <div><label className="block text-sm font-medium text-gray-700">Provisionssats (%)</label><input type="number" step="0.01" value={userEditData.commission_rate || ''} onChange={e => setUserEditData(p => ({ ...p, commission_rate: Number(e.target.value) }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" /></div>}
                  </div>

                </div>
                <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                  <button type="button" onClick={() => setShowUserEditModal(false)} className="px-4 py-2 border rounded-md text-sm">Avbryt</button>
                  <button type="submit" disabled={formLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50 flex items-center">
                    {formLoading ? <><Loader2 className="w-4 h-4 animate-spin text-white" /><span className="ml-2">Sparar...</span></> : 'Spara ändringar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Create Team Modal */}
      {
        showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Skapa nytt team</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTeam} className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Team Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Teaminformation</h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teamnamn *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="T.ex. Fönsterputsningsexperten"
                      />
                    </div>

                    <MultiSelectDropdown
                      options={swedishCities}
                      selected={formData.cities}
                      onChange={(cities) => setFormData(prev => ({ ...prev, cities }))}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Beskrivning
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Specialiserat team för komplexa fönsterputsningsjobb"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Specialitet *
                        </label>
                        <select
                          required
                          value={formData.specialty}
                          onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value as TeamSpecialty }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          {Object.entries(TEAM_SPECIALTY_LABELS).map(([specialty, label]) => (
                            <option key={specialty} value={specialty}>{label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Timtaxa (SEK)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.hourly_rate}
                          onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="500.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teamledare *
                      </label>
                      <select
                        required
                        value={formData.team_leader_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, team_leader_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Välj teamledare...</option>
                        {allUsers.map(user => (
                          <option key={user.id} value={user.id}>{user.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Member Selection */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Välj teammedlemmar</h4>

                    <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                      {allUsers.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <User className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">Inga användare tillgängliga</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {allUsers.map((user) => (
                            <div key={user.id} className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedMembers.includes(user.id)}
                                    onChange={() => toggleMemberSelection(user.id)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                                    {user.full_name?.charAt(0) || 'U'}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                  </div>
                                </div>

                                {selectedMembers.includes(user.id) && (
                                  <select
                                    value={memberRoles[user.id] || 'medarbetare'}
                                    onChange={(e) => handleMemberRoleChange(user.id, e.target.value as TeamRole)}
                                    className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    {Object.entries(TEAM_ROLE_LABELS).map(([role, label]) => (
                                      <option key={role} value={role}>{label}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Members Preview */}
                    {selectedMembers.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h5 className="font-medium text-blue-900 mb-2">
                          Valda medlemmar ({selectedMembers.length})
                        </h5>
                        <div className="space-y-2">
                          {selectedMembers.map(userId => {
                            const user = allUsers.find(u => u.id === userId);
                            const role = memberRoles[userId] || 'medarbetare';
                            return (
                              <div key={userId} className="flex items-center justify-between text-sm">
                                <span className="text-blue-900">{user?.full_name}</span>
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTeamRoleColor(role)}`}>
                                  {TEAM_ROLE_LABELS[role]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formLoading ? (
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span className="ml-2">Skapar...</span>
                      </div>
                    ) : (
                      'Skapa Team'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Edit Team Modal */}
      {
        showEditModal && selectedTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Redigera team</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedTeam(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateTeam} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teamnamn *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Hantera Medlemmar</h4>

                  {/* List of current members */}
                  <div className="space-y-2 mb-4">
                    {(selectedTeam?.members || []).map(member => (
                      <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium">{member.user?.full_name}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveMemberFromTeam(member.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Ta bort från team"
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new member */}
                  {unassignedUsers.length > 0 && (
                    <div className="flex items-end gap-2">
                      <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-700">Lägg till medlem</label>
                        <select
                          value={newMemberId}
                          onChange={(e) => setNewMemberId(e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Välj...</option>
                          {unassignedUsers.map(user => (
                            <option key={user.id} value={user.id}>{user.full_name}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddMemberToTeam(selectedTeam.id, newMemberId)}
                        disabled={!newMemberId}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm h-10 disabled:opacity-50"
                      >
                        Lägg till
                      </button>
                    </div>
                  )}
                </div>

                <MultiSelectDropdown
                  options={swedishCities}
                  selected={formData.cities}
                  onChange={(cities) => setFormData(prev => ({ ...prev, cities }))}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beskrivning
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialitet *
                    </label>
                    <select
                      required
                      value={formData.specialty}
                      onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value as TeamSpecialty }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(TEAM_SPECIALTY_LABELS).map(([specialty, label]) => (
                        <option key={specialty} value={specialty}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timtaxa (SEK)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teamledare
                  </label>
                  <select
                    value={formData.team_leader_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, team_leader_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Ingen teamledare</option>
                    {allUsers.map(user => (
                      <option key={user.id} value={user.id}>{user.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedTeam(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formLoading ? (
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span className="ml-2">Sparar...</span>
                      </div>
                    ) : (
                      'Spara Ändringar'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Team Details Modal */}
      {
        showDetailsModal && selectedTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <span className="text-2xl mr-3">{getSpecialtyIcon(selectedTeam.specialty)}</span>
                    {selectedTeam.name}
                  </h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTeamSpecialtyColor(selectedTeam.specialty)}`}>
                    {TEAM_SPECIALTY_LABELS[selectedTeam.specialty]}
                  </span>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Team Information */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Teaminformation</h4>
                    <div className="space-y-3">
                      {selectedTeam.description && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Beskrivning:</span>
                          <p className="text-sm text-gray-900">{selectedTeam.description}</p>
                        </div>
                      )}

                      {selectedTeam.cities && selectedTeam.cities.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-500 flex items-center mb-2">
                            <MapPin size={14} className="mr-2" />
                            Aktiva städer:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {selectedTeam.cities.map(city => (
                              <span key={city} className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-1 rounded-full">
                                {city}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedTeam.hourly_rate && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Timtaxa:</span>
                          <p className="text-sm text-gray-900">{formatCurrency(selectedTeam.hourly_rate)}/tim</p>
                        </div>
                      )}

                      <div>
                        <span className="text-sm font-medium text-gray-500">Skapat:</span>
                        <p className="text-sm text-gray-900">{formatDate(selectedTeam.created_at)}</p>
                      </div>

                      <div>
                        <span className="text-sm font-medium text-gray-500">Aktiva jobb:</span>
                        <p className="text-sm text-gray-900">{selectedTeam.active_jobs_count || 0}</p>
                      </div>

                      <div>
                        <span className="text-sm font-medium text-gray-500">Slutförda jobb:</span>
                        <p className="text-sm text-gray-900">{selectedTeam.completed_jobs_count || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Teammedlemmar</h4>
                    {selectedTeam.members && selectedTeam.members.length > 0 ? (
                      <div className="space-y-3">
                        {selectedTeam.members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                                {member.user?.full_name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {member.user?.full_name}
                                  {member.user_id === selectedTeam.team_leader_id && (
                                    <Crown className="w-4 h-4 inline ml-2 text-yellow-600" />
                                  )}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTeamRoleColor(member.role_in_team)}`}>
                                    {TEAM_ROLE_LABELS[member.role_in_team]}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Sedan {formatDate(member.joined_date)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              {member.user?.phone_number && (
                                <a
                                  href={`tel:${member.user.phone_number}`}
                                  className="text-gray-400 hover:text-blue-600"
                                  title="Ring"
                                >
                                  <Phone className="w-4 h-4" />
                                </a>
                              )}
                              {member.user?.email && (
                                <a
                                  href={`mailto:${member.user.email}`}
                                  className="text-gray-400 hover:text-blue-600"
                                  title="E-post"
                                >
                                  <Mail className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <User className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Inga medlemmar i detta team</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Payroll Modal */}
      {
        showPayrollModal && selectedPayrollUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Lönespecifikation: {selectedPayrollUser.full_name}</h3>
                  <p className="text-sm text-gray-500">Period: {selectedPayrollMonth}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleTogglePaidStatus}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${selectedPayrollStatus === 'paid'
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      }`}
                  >
                    {selectedPayrollStatus === 'paid' ? 'Utbetald ✅' : 'Markera som utbetald'}
                  </button>
                  <button onClick={() => setShowPayrollModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="p-6 space-y-8">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center"><Clock className="w-4 h-4 mr-2" /> Tidrapporter</h4>
                  <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Datum</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Start</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Slut</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Rast (min)</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Summa</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Åtgärd</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {payrollTimeLogs.map(log => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{log.start_time.split('T')[0]}</td>
                            <td className="px-4 py-2 text-sm">
                              <input
                                type="time"
                                defaultValue={log.start_time.split('T')[1].substring(0, 5)}
                                onBlur={(e) => {
                                  const date = log.start_time.split('T')[0];
                                  handleTimeLogUpdate(log.id, { start_time: `${date}T${e.target.value}:00` });
                                }}
                                className="w-24 border-gray-300 rounded-md text-sm p-1"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <input
                                type="time"
                                defaultValue={log.end_time ? log.end_time.split('T')[1].substring(0, 5) : ''}
                                onBlur={(e) => {
                                  const date = log.start_time.split('T')[0];
                                  handleTimeLogUpdate(log.id, { end_time: `${date}T${e.target.value}:00` });
                                }}
                                className="w-24 border-gray-300 rounded-md text-sm p-1"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <input
                                type="number"
                                defaultValue={log.break_duration}
                                onBlur={(e) => handleTimeLogUpdate(log.id, { break_duration: Number(e.target.value) })}
                                className="w-16 border-gray-300 rounded-md text-sm p-1"
                              />
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-gray-900 font-medium">
                              {formatCurrency(log.total_amount || 0)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500 inline" title="Sparad" />
                            </td>
                          </tr>
                        ))}
                        {payrollTimeLogs.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500 italic">Inga tidrapporter för denna period</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center"><TrendingUp className="w-4 h-4 mr-2" /> Justeringar & Utlägg</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-3">
                      {payrollAdjustments.map(adj => (
                        <div key={adj.id} className="flex justify-between items-center p-3 bg-white rounded-md border border-gray-200 hover:border-gray-300">
                          <div>
                            <div className="font-medium text-gray-900">{adj.description}</div>
                            <div className="text-xs text-gray-500 capitalize">{adj.type} - {adj.date}</div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`font-bold ${adj.type === 'deduction' ? 'text-red-600' : 'text-green-600'}`}>
                              {adj.type === 'deduction' ? '-' : '+'}{formatCurrency(adj.amount)}
                            </span>
                            <button onClick={() => handleDeleteAdjustment(adj.id)} className="text-gray-400 hover:text-red-600 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {payrollAdjustments.length === 0 && <p className="text-gray-500 text-sm italic py-4">Inga justeringar registrerade.</p>}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-fit">
                      <h5 className="font-medium text-sm text-gray-900 mb-3">Lägg till justering</h5>
                      <form onSubmit={handleAdjustmentSubmit} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700">Typ</label>
                          <select
                            value={newAdjustment.type}
                            onChange={e => setNewAdjustment({ ...newAdjustment, type: e.target.value as any })}
                            className="mt-1 w-full text-sm border-gray-300 rounded-md"
                          >
                            <option value="bonus">Bonus</option>
                            <option value="deduction">Avdrag</option>
                            <option value="expense">Utlägg</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">Belopp</label>
                          <input
                            type="number"
                            value={newAdjustment.amount}
                            onChange={e => setNewAdjustment({ ...newAdjustment, amount: Number(e.target.value) })}
                            className="mt-1 w-full text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">Beskrivning</label>
                          <input
                            type="text"
                            value={newAdjustment.description}
                            onChange={e => setNewAdjustment({ ...newAdjustment, description: e.target.value })}
                            className="mt-1 w-full text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        <button type="submit" className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                          Lägg till
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setTeamToDelete(null);
        }}
        onConfirm={handleDeleteTeam}
        title="Ta bort team"
        message={`Är du säker på att du vill ta bort teamet "${teamToDelete?.name}"? Alla medlemmar kommer att bli ej tilldelade.`}
        confirmText="Ta bort"
        cancelText="Avbryt"
        type="danger"
      />

      {showInternalEmailModal && internalEmailRecipient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Skicka e-post</h3>
                  <p className="text-sm text-gray-600">Till: {internalEmailRecipient.full_name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowInternalEmailModal(false);
                  setInternalEmailRecipient(null);
                  setInternalEmailData({ subject: '', content: '' });
                }}
                disabled={isSendingInternalEmail}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Till</label>
                <input
                  type="text"
                  value={internalEmailRecipient.email || 'Ingen e-post'}
                  readOnly
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amne *</label>
                <input
                  type="text"
                  value={internalEmailData.subject}
                  onChange={(e) => setInternalEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Skriv amne..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meddelande *</label>
                <textarea
                  value={internalEmailData.content}
                  onChange={(e) => setInternalEmailData(prev => ({ ...prev, content: e.target.value }))}
                  rows={8}
                  placeholder="Skriv ditt meddelande..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bilagor</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files, false)}
                  className="hidden"
                  accept="*/*"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors w-full justify-center"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Klicka för att bifoga filer
                </button>
                {emailAttachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {emailAttachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div className="flex items-center min-w-0">
                          <div className="p-1.5 bg-blue-100 rounded text-blue-600 mr-2.5">
                            {getFileIcon(file.filename)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.filename}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index, false)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500 mt-1">
                      Totalt: {emailAttachments.length} fil(er), {formatFileSize(emailAttachments.reduce((sum, f) => sum + f.size, 0))}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowInternalEmailModal(false);
                  setInternalEmailRecipient(null);
                  setInternalEmailData({ subject: '', content: '' });
                  setEmailAttachments([]);
                }}
                disabled={isSendingInternalEmail}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleSendInternalEmail}
                disabled={isSendingInternalEmail || !internalEmailData.subject || !internalEmailData.content || !internalEmailRecipient.email}
                className="inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSendingInternalEmail ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {isSendingInternalEmail ? 'Skickar...' : 'Skicka'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Email Modal */}
      {showBulkEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Users2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Skicka e-post till flera</h3>
                  <p className="text-sm text-gray-600">{selectedUsersForEmail.length} mottagare valda</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBulkEmailModal(false);
                  setBulkEmailData({ subject: '', content: '' });
                }}
                disabled={isSendingInternalEmail}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mottagare</label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                  {allUsers
                    .filter(u => selectedUsersForEmail.includes(u.id))
                    .map(user => (
                      <span
                        key={user.id}
                        className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                      >
                        {user.full_name}
                        <button
                          onClick={() => toggleUserSelection(user.id)}
                          className="ml-1.5 hover:text-blue-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amne *</label>
                <input
                  type="text"
                  value={bulkEmailData.subject}
                  onChange={(e) => setBulkEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Skriv amne..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meddelande *</label>
                <textarea
                  value={bulkEmailData.content}
                  onChange={(e) => setBulkEmailData(prev => ({ ...prev, content: e.target.value }))}
                  rows={8}
                  placeholder="Skriv ditt meddelande..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bilagor</label>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files, true)}
                  className="hidden"
                  accept="*/*"
                />
                <button
                  type="button"
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors w-full justify-center"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Klicka för att bifoga filer
                </button>
                {bulkEmailAttachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {bulkEmailAttachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div className="flex items-center min-w-0">
                          <div className="p-1.5 bg-blue-100 rounded text-blue-600 mr-2.5">
                            {getFileIcon(file.filename)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.filename}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index, true)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500 mt-1">
                      Totalt: {bulkEmailAttachments.length} fil(er), {formatFileSize(bulkEmailAttachments.reduce((sum, f) => sum + f.size, 0))}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowBulkEmailModal(false);
                  setBulkEmailData({ subject: '', content: '' });
                  setBulkEmailAttachments([]);
                }}
                disabled={isSendingInternalEmail}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleSendBulkEmail}
                disabled={isSendingInternalEmail || !bulkEmailData.subject || !bulkEmailData.content || selectedUsersForEmail.length === 0}
                className="inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSendingInternalEmail ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {isSendingInternalEmail ? 'Skickar...' : `Skicka till ${selectedUsersForEmail.length} mottagare`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default TeamManagement;