// src/components/SalesFunnelChart.tsx
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Filter } from 'lucide-react';
import { LEAD_STATUS_LABELS } from '../types/database';

const FUNNEL_STAGES = ['new', 'contacted', 'qualified', 'won'];
const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'];

export default function SalesFunnelChart() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchFunnelData = async () => {
      setLoading(true);
      const { data: leadData, error } = await supabase
        .from('leads')
        .select('status')
        .eq('assigned_to_user_id', user.id);

      if (error) {
        console.error("Error fetching funnel data:", error);
      } else {
        const counts = leadData.reduce((acc, lead) => {
          acc[lead.status] = (acc[lead.status] || 0) + 1;
          return acc;
        }, {});

        const chartData = FUNNEL_STAGES.map(stage => ({
          name: LEAD_STATUS_LABELS[stage] || stage,
          value: counts[stage] || 0,
        }));
        setData(chartData);
      }
      setLoading(false);
    };

    fetchFunnelData();
  }, [user]);

  return (
    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <Filter className="w-5 h-5 mr-3 text-purple-500" />
        Din Säljpipeline
      </h3>
      {loading ? <p>Laddar...</p> : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
            <Tooltip cursor={{ fill: 'rgba(238, 242, 255, 0.5)' }} />
            <Bar dataKey="value" barSize={30}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}