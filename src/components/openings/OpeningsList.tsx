import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, ChevronRight, AlertTriangle } from 'lucide-react';

type OpeningsListProps = {
  propertyId: string;
  onBack: () => void;
  onSelectOpening: (openingId: string) => void;
  areaId?: string;
  areaName?: string;
};

type OpeningWithCompletion = {
  opening_id: string;
  property_id: string;
  opening_type: string;
  opening_number: number;
  room_name: string;
  area_name: string;
  completion_percentage: number;
  missing_requirements: Array<{
    template_title: string;
    required_qty: number;
    satisfied_qty: number;
    missing_qty: number;
  }>;
};

export function OpeningsList({ propertyId, onBack, onSelectOpening, areaId, areaName }: OpeningsListProps) {
  const [openings, setOpenings] = useState<OpeningWithCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpenings = async () => {
      let query = supabase
        .from('opening_completion_summary')
        .select('*')
        .eq('property_id', propertyId);

      if (areaId) {
        const { data: areaOpeningsData } = await supabase
          .from('openings')
          .select('id')
          .eq('area_id', areaId);

        const openingIds = (areaOpeningsData || []).map(o => o.id);

        if (openingIds.length === 0) {
          setOpenings([]);
          setLoading(false);
          return;
        }

        query = query.in('opening_id', openingIds);
      }

      const { data: openingsData, error: openingsError } = await query
        .order('area_name')
        .order('opening_type')
        .order('opening_number');

      if (openingsError) {
        console.error('Error fetching openings:', openingsError);
        setLoading(false);
        return;
      }

      const openingsWithMissing = await Promise.all(
        (openingsData || []).map(async (opening) => {
          const { data: missingData, error: missingError } = await supabase.rpc(
            'get_opening_missing_requirements',
            { p_opening_id: opening.opening_id, p_limit: 3 }
          );

          if (missingError) {
            console.error('Error fetching missing requirements:', missingError);
          }

          return {
            ...opening,
            missing_requirements: missingData || [],
          };
        })
      );

      setOpenings(openingsWithMissing);
      setLoading(false);
    };

    fetchOpenings();
  }, [propertyId, areaId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  const groupedOpenings = openings.reduce((acc, opening) => {
    const key = opening.area_name;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(opening);
    return acc;
  }, {} as Record<string, OpeningWithCompletion[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">
            {areaName ? `${areaName} - Openings` : 'Openings Checklist'}
          </h2>
          <p className="text-gray-600 mt-1">Review and upload photos for each opening</p>
        </div>
      </div>

      {areaId ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="divide-y divide-gray-200">
            {openings.map((opening) => (
              <button
                key={opening.opening_id}
                onClick={() => onSelectOpening(opening.opening_id)}
                className="w-full p-6 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {opening.opening_type === 'window' ? 'Window' : 'Door'} {opening.opening_number}
                      </h4>
                      {opening.room_name && (
                        <span className="text-sm text-gray-600">({opening.room_name})</span>
                      )}
                      {opening.completion_percentage === 100 ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Complete
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                          In Progress
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Completion</span>
                        <span className="font-medium">{opening.completion_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            opening.completion_percentage === 100
                              ? 'bg-green-600'
                              : opening.completion_percentage >= 50
                              ? 'bg-electric-500'
                              : 'bg-orange-600'
                          }`}
                          style={{ width: `${opening.completion_percentage}%` }}
                        />
                      </div>
                    </div>

                    {opening.missing_requirements.length > 0 && (
                      <div className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-gray-600 font-medium mb-1">Missing photos:</p>
                          <ul className="text-gray-600 space-y-0.5">
                            {opening.missing_requirements.map((req, idx) => (
                              <li key={idx}>
                                • {req.template_title} ({req.missing_qty} needed)
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        Object.entries(groupedOpenings).map(([areaName, areaOpenings]) => (
          <div key={areaName} className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">{areaName}</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {areaOpenings.map((opening) => (
                <button
                  key={opening.opening_id}
                  onClick={() => onSelectOpening(opening.opening_id)}
                  className="w-full p-6 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {opening.opening_type === 'window' ? 'Window' : 'Door'} {opening.opening_number}
                        </h4>
                        {opening.room_name && (
                          <span className="text-sm text-gray-600">({opening.room_name})</span>
                        )}
                        {opening.completion_percentage === 100 ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Complete
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                            In Progress
                          </span>
                        )}
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Completion</span>
                          <span className="font-medium">{opening.completion_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              opening.completion_percentage === 100
                                ? 'bg-green-600'
                                : opening.completion_percentage >= 50
                                ? 'bg-electric-500'
                                : 'bg-orange-600'
                            }`}
                            style={{ width: `${opening.completion_percentage}%` }}
                          />
                        </div>
                      </div>

                      {opening.missing_requirements.length > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-gray-600 font-medium mb-1">Missing photos:</p>
                            <ul className="text-gray-600 space-y-0.5">
                              {opening.missing_requirements.map((req, idx) => (
                                <li key={idx}>
                                  • {req.template_title} ({req.missing_qty} needed)
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {openings.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <p>No openings found for this {areaId ? 'room' : 'property'}</p>
        </div>
      )}
    </div>
  );
}
