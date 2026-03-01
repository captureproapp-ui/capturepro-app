import { useEffect, useState } from 'react';

type SplashScreenProps = {
  onComplete: () => void;
};

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center">
        <img
          src="/brand/image.png"
          alt="CapturePro"
          className="w-48 h-48 object-contain mb-8"
        />
        <div className="w-12 h-12 border-4 border-electric-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );
}
