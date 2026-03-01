import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Flame, DoorOpen, Home, Layers, Square, Check, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSupabaseUrl, getSupabaseAnonKey } from '../../lib/env';
import { useAuth } from '../../contexts/AuthContext';

interface MeasureType {
  id: string;
  name: string;
  code: string;
  description: string;
  icon_name: string;
  color_class: string;
}

const iconMap: Record<string, any> = {
  'flame': Flame,
  'door-open': DoorOpen,
  'home': Home,
  'layers': Layers,
  'square': Square,
};

export function ChooseMeasurePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const sessionId = useMemo(() => {
    return (
      searchParams.get('session_id') ||
      searchParams.get('sessionId') ||
      sessionStorage.getItem('onboarding_session_id') ||
      ''
    );
  }, [searchParams]);

  const [measures, setMeasures] = useState<MeasureType[]>([]);
  const [selectedMeasureId, setSelectedMeasureId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!sessionId && !user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!sessionId) {
      setError('Missing registration session. Please contact support.');
      setLoading(false);
      return;
    }

    fetchMeasures();
  }, [sessionId, authLoading, user, navigate]);

  const fetchMeasures = async () => {
    try {
      if (!supabase) {
        throw new Error('Database connection unavailable');
      }

      const { data, error } = await supabase
        .from('measure_types')
        .select('id, name, code, description, icon_name, color_class')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setMeasures(data || []);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching measures:', err);
      setError('Failed to load available measures. Please try again.');
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedMeasureId || !sessionId) return;

    setSubmitting(true);
    setError('');

    try {
      const supabaseUrl = getSupabaseUrl();
      const supabaseAnonKey = getSupabaseAnonKey();

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('App configuration error. Please try again shortly.');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/save-organisation-measure`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({
            sessionId,
            measureTypeId: selectedMeasureId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save measure selection');
      }

      sessionStorage.removeItem('onboarding_session_id');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Error saving measure:', err);
      setError(err.message || 'Failed to save your selection. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,175,255,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,175,255,0.08),transparent_50%)]" />
        <div className="relative flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-3 border-electric-500/30 border-t-electric-500 rounded-full animate-spin" />
          <p className="text-gray-400 font-medium">Loading available measures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-8 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,175,255,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,175,255,0.08),transparent_50%)]" />

      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-electric-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-electric-600/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative w-full max-w-3xl">
        <div className="flex items-center justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-electric-500/20 blur-2xl rounded-full scale-150" />
            <img
              src="/brand/image.png"
              alt="CapturePro"
              className="relative w-20 h-20 object-contain drop-shadow-2xl"
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Check size={16} className="text-white" />
            </div>
            <span className="text-emerald-400 text-sm font-medium">Password Set</span>
          </div>
          <div className="w-8 h-px bg-navy-700" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-electric-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-electric-500/30">
              2
            </div>
            <span className="text-white text-sm font-medium">Choose Measure</span>
          </div>
        </div>

        <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-center text-white mb-2">
            Choose Your Starting Measure
          </h1>
          <p className="text-center text-gray-400 mb-8 text-sm">
            Select the primary measure type for your organisation
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {measures.map((measure) => {
              const Icon = iconMap[measure.icon_name] || Square;
              const isSelected = selectedMeasureId === measure.id;
              const isExternalCladding = measure.code === 'external_cladding';

              return (
                <button
                  key={measure.id}
                  onClick={() => setSelectedMeasureId(measure.id)}
                  className={`relative p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-electric-500 bg-electric-500/10 shadow-lg shadow-electric-500/10 ring-1 ring-electric-500/30'
                      : 'border-white/10 bg-white/[0.04] hover:border-electric-500/40 hover:bg-white/[0.07]'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 rounded-full bg-electric-500 flex items-center justify-center shadow-lg shadow-electric-500/30">
                        <Check size={14} className="text-white" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-electric-500/20' : 'bg-white/[0.07]'}`}>
                      <Icon size={22} className={isSelected ? 'text-electric-400' : 'text-gray-400'} />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                        {measure.name}
                      </h3>
                      {isExternalCladding && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full">
                          Non Funded
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 leading-relaxed">
                    {measure.description}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleContinue}
            disabled={!selectedMeasureId || submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-electric-500 hover:bg-electric-600 text-white font-semibold shadow-lg shadow-electric-500/25 hover:shadow-electric-500/40 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue to Dashboard
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <a
                href="mailto:support@capturepro.work"
                className="text-electric-400 hover:text-electric-300 transition-colors"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
