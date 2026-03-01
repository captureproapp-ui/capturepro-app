import { Calendar } from 'lucide-react';

interface DateRangeFilterProps {
  selectedRange: string;
  onRangeChange: (range: string) => void;
}

export default function DateRangeFilter({ selectedRange, onRangeChange }: DateRangeFilterProps) {
  const ranges = [
    { value: '7', label: '7 Days' },
    { value: '30', label: '30 Days' },
    { value: '60', label: '60 Days' },
    { value: '90', label: '90 Days' },
    { value: '180', label: '6 Months' },
    { value: '365', label: '1 Year' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="flex items-center gap-3 bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <Calendar className="w-5 h-5 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">Date Range:</span>
      <div className="flex gap-2 flex-wrap">
        {ranges.map((range) => (
          <button
            key={range.value}
            onClick={() => onRangeChange(range.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedRange === range.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}
