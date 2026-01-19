import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { User, Save, Upload, Phone, Home as HomeIcon, Briefcase, DollarSign, Loader2 } from 'lucide-react';


function WorkerProfile() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    address: '',
    postal_code: '',
    city: '',
    hourly_rate: 0,
    avatar_url: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name, phone_number, address, postal_code, city, hourly_rate, avatar_url')
        .eq('id', user!.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          ...data,
          email: user!.email || '',
        });
      }
    } catch (err: any) {
      showError('Kunde inte ladda profilen', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      // Exclude fields the worker shouldn't update
      const { email, hourly_rate, ...updates } = profile;

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user!.id);

      if (error) throw error;

      success('Profilen har uppdaterats!');
    } catch (err: any) {
      showError('Kunde inte uppdatera profilen', err.message);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));

      await supabase.from('user_profiles').update({ avatar_url: publicUrl }).eq('id', user!.id);

      success('Profilbild uppdaterad!');

    } catch (error: any) {
      showError('Fel vid uppladdning', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-gray-600">Laddar profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <User className="w-7 h-7 mr-3 text-blue-600" />
          Min Profil
        </h1>
        <p className="text-gray-600 mt-1">
          Här kan du se och uppdatera dina personliga uppgifter.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center sticky top-6">
            <div className="relative w-32 h-32 mx-auto">
              <img
                src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name || 'A'}&background=0D89EC&color=fff&size=128`}
                alt="Profilbild"
                className="w-32 h-32 rounded-full object-cover mx-auto mb-4 border-4 border-white shadow-lg"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition"
                title="Ladda upp ny profilbild"
              >
                {uploading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Upload className="w-4 h-4" />}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                disabled={uploading}
                accept="image/*"
                className="hidden"
              />
            </div>
            <h2 className="text-xl font-bold mt-4">{profile.full_name}</h2>
            <p className="text-gray-500">{profile.email}</p>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Phone className="w-5 h-5 mr-2 text-blue-600" />
                Kontaktuppgifter
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Fullständigt namn</label>
                <input type="text" name="full_name" value={profile.full_name || ''} onChange={handleChange} className="mt-1 w-full input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefonnummer</label>
                <input type="tel" name="phone_number" value={profile.phone_number || ''} onChange={handleChange} className="mt-1 w-full input" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Adress</label>
                <input type="text" name="address" value={profile.address || ''} onChange={handleChange} className="mt-1 w-full input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Postnummer</label>
                <input type="text" name="postal_code" value={profile.postal_code || ''} onChange={handleChange} className="mt-1 w-full input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Stad</label>
                <input type="text" name="city" value={profile.city || ''} onChange={handleChange} className="mt-1 w-full input" />
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
                Anställningsdetaljer
              </h3>
            </div>
            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Timpris (SEK)</label>
                <div className="mt-1 flex items-center">
                  <input
                    type="number"
                    name="base_hourly_rate"
                    value={profile.hourly_rate}
                    disabled
                    className="w-full input bg-gray-100 cursor-not-allowed"
                  />
                  <span className="ml-2 text-gray-500 text-sm">(Administreras av din chef)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleUpdateProfile}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow"
            >
              <Save className="w-5 h-5 mr-2" />
              Spara ändringar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkerProfile;