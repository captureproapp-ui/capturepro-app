import { useState, useRef, useEffect } from 'react';
import { Columns, Eye, EyeOff } from 'lucide-react';

export interface Column {
  key: string;
  label: string;
  visible: boolean;
}

interface ColumnVisibilityToggleProps {
  columns: Column[];
  onChange: (columns: Column[]) => void;
  storageKey?: string;
}

export function ColumnVisibilityToggle({
  columns,
  onChange,
  storageKey,
}: ColumnVisibilityToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggle = (key: string) => {
    const updatedColumns = columns.map((col) =>
      col.key === key ? { ...col, visible: !col.visible } : col
    );
    onChange(updatedColumns);

    if (storageKey) {
      const visibility = updatedColumns.reduce((acc, col) => {
        acc[col.key] = col.visible;
        return acc;
      }, {} as Record<string, boolean>);
      localStorage.setItem(storageKey, JSON.stringify(visibility));
    }
  };

  const visibleCount = columns.filter((col) => col.visible).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        aria-label="Toggle column visibility"
      >
        <Columns className="w-5 h-5 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">
          Columns ({visibleCount})
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
          <div className="px-4 py-2 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Toggle Columns
            </p>
          </div>
          <div className="py-1">
            {columns.map((column) => (
              <button
                key={column.key}
                onClick={() => handleToggle(column.key)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-700">{column.label}</span>
                {column.visible ? (
                  <Eye className="w-4 h-4 text-green-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
