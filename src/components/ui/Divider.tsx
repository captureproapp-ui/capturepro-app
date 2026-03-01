interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className = '' }: DividerProps) {
  if (label) {
    return (
      <div className={`relative flex items-center ${className}`}>
        <div className="flex-grow border-t border-gray-300" />
        <span className="flex-shrink mx-4 text-sm text-gray-500">{label}</span>
        <div className="flex-grow border-t border-gray-300" />
      </div>
    );
  }

  return <hr className={`border-t border-gray-300 ${className}`} />;
}
