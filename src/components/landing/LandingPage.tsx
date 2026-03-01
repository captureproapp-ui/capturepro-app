import { useEffect, useState } from 'react';

export function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
      <div className="absolute inset-0 bg-gradient-radial from-electric-900/20 via-transparent to-transparent opacity-50"></div>

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-electric-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-electric-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <header className="relative z-10 px-6 py-4 flex justify-between items-center">
        <div className="text-white font-bold text-xl">
          Capture<span className="text-electric-400">Pro</span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="mailto:capturepro.app@gmail.com"
            className="text-gray-300 hover:text-white transition-colors duration-200 text-sm font-medium"
          >
            Contact Us
          </a>
          <a
            href="/login"
            className="px-4 py-2 bg-electric-500 hover:bg-electric-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            App Login
          </a>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6">
        <div
          className={`transform transition-all duration-1000 ease-out ${
            isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
          }`}
        >
          <div className="relative mb-8 animate-float">
            <div className="absolute inset-0 bg-electric-500/20 blur-3xl rounded-full"></div>
            <img
              src="/brand/image.png"
              alt="CapturePro Logo"
              className="relative w-64 h-auto mx-auto md:w-80 lg:w-96 drop-shadow-2xl"
            />
          </div>

          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
              Capture<span className="text-electric-400">Pro</span>
            </h1>

            <h2 className="text-xl md:text-2xl text-gray-300 mb-8 font-light">
              This website is currently under construction
            </h2>

            <p className="text-base md:text-lg text-gray-400 leading-relaxed max-w-xl mx-auto">
              We're building CapturePro and will be launching soon. Check back for updates on our professional photo documentation platform.
            </p>

            <div className="mt-12">
              <a
                href="mailto:capturepro.app@gmail.com"
                className="inline-flex items-center gap-2 px-6 py-3 bg-electric-500 hover:bg-electric-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-electric-500/50"
              >
                Get in Touch
              </a>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}
