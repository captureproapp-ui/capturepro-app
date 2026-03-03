import { useEffect, useState } from 'react';
import { Camera, Shield, FileCheck, Clock, Users, Download, ChevronRight, Check } from 'lucide-react';

export function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: Camera,
      title: 'Photo Documentation',
      description: 'Capture high-quality installation evidence with GPS location and timestamps'
    },
    {
      icon: Shield,
      title: 'Compliance Tracking',
      description: 'Meet PAS 2030 standards with automated checklists and requirements'
    },
    {
      icon: FileCheck,
      title: 'Professional Reports',
      description: 'Generate comprehensive PDF reports with all evidence and documentation'
    },
    {
      icon: Clock,
      title: 'Real-time Updates',
      description: 'Track project progress and completion status instantly'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Manage multiple installers and properties from one central platform'
    },
    {
      icon: Download,
      title: 'Secure Storage',
      description: 'Cloud-based storage with automatic backups and 30-day retention'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Capture On-Site',
      description: 'Take photos of installations with automatic GPS tagging and timestamps'
    },
    {
      number: '02',
      title: 'Add Details',
      description: 'Document property information, measures, and compliance requirements'
    },
    {
      number: '03',
      title: 'Generate Reports',
      description: 'Create professional PDF reports with all evidence and documentation'
    },
    {
      number: '04',
      title: 'Share & Archive',
      description: 'Share reports with stakeholders and maintain secure archives'
    }
  ];

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
      <div className="absolute inset-0 bg-gradient-radial from-electric-900/20 via-transparent to-transparent opacity-50"></div>

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-electric-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-electric-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-navy-950/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
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
              className="px-6 py-2.5 bg-electric-500 hover:bg-electric-600 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-electric-500/50"
            >
              App Login
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="flex flex-col items-center justify-center min-h-[90vh] px-6 py-20">
          <div
            className={`transform transition-all duration-1000 ease-out ${
              isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
            }`}
          >
            <div className="relative mb-12 animate-float">
              <div className="absolute inset-0 bg-electric-500/20 blur-3xl rounded-full"></div>
              <img
                src="/brand/image.png"
                alt="CapturePro Logo"
                className="relative w-48 h-auto mx-auto md:w-56 lg:w-64 drop-shadow-2xl"
              />
            </div>

            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
                Professional Installation
                <br />
                <span className="text-electric-400">Evidence System</span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-3xl mx-auto mb-12">
                Streamline compliance documentation with comprehensive photo evidence, automated checklists, and professional reporting for PAS 2030 installations.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-electric-500 hover:bg-electric-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-electric-500/50 hover:scale-105"
                >
                  Get Started
                  <ChevronRight className="w-5 h-5" />
                </a>
                <a
                  href="mailto:capturepro.app@gmail.com"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/20"
                >
                  Contact Sales
                </a>
              </div>

              <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="text-3xl font-bold text-electric-400 mb-2">100%</div>
                  <div className="text-sm text-gray-400">Compliance Ready</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-electric-400 mb-2">Secure</div>
                  <div className="text-sm text-gray-400">Cloud Storage</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-electric-400 mb-2">Mobile</div>
                  <div className="text-sm text-gray-400">Optimized</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Everything You Need for
                <span className="text-electric-400"> Compliance</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Powerful features designed for installation professionals who demand quality and efficiency
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-electric-500/50 transition-all duration-300 hover:scale-105"
                >
                  <div className="w-14 h-14 rounded-xl bg-electric-500/20 flex items-center justify-center mb-6 group-hover:bg-electric-500/30 transition-colors">
                    <feature.icon className="w-7 h-7 text-electric-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-gradient-to-b from-transparent via-navy-900/50 to-transparent">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                How It <span className="text-electric-400">Works</span>
              </h2>
              <p className="text-xl text-gray-400">
                Simple workflow to document installations professionally
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  <div className="p-8 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 h-full">
                    <div className="text-5xl font-bold text-electric-400/30 mb-4">{step.number}</div>
                    <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                      <ChevronRight className="w-6 h-6 text-electric-400/50" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="p-12 rounded-3xl bg-gradient-to-br from-electric-500/20 to-electric-600/10 backdrop-blur-sm border border-electric-500/30">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Join installation professionals who trust CapturePro for their compliance documentation needs.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-electric-500 hover:bg-electric-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-electric-500/50 hover:scale-105"
                >
                  Access the App
                  <ChevronRight className="w-5 h-5" />
                </a>
                <a
                  href="mailto:capturepro.app@gmail.com"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/20"
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-navy-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <div className="text-white font-bold text-xl mb-2">
                Capture<span className="text-electric-400">Pro</span>
              </div>
              <p className="text-gray-400 text-sm">
                Professional Installation Evidence System
              </p>
            </div>

            <div className="flex flex-col items-center md:items-end gap-4">
              <div className="flex items-center gap-6">
                <a
                  href="mailto:capturepro.app@gmail.com"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  capturepro.app@gmail.com
                </a>
              </div>
              <div className="text-gray-500 text-sm">
                © {new Date().getFullYear()} CapturePro. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </footer>

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
