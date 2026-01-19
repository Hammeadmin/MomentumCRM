// src/components/SalesRouteHandler.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/database';

interface SalesRouteHandlerProps {
  children: React.ReactElement;
}

function SalesRouteHandler({ children }: SalesRouteHandlerProps) {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      if (user) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
        } else if (data) {
          setRole(data.role as UserRole);
        }
      }
      setLoading(false);
    }

    fetchUserRole();
  }, [user]);

  if (loading) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }

  if (role === 'sales') {
    return children;
  }

  // If not a sales user, you might want to redirect them
  // For now, returning null or a message.
  return null; 
}

export default SalesRouteHandler;