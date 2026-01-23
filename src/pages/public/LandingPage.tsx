import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import AnimatedMomentum from '../../components/public/AnimatedMomentum';
import DemoRequestModal from '../../components/public/DemoRequestModal';

// Custom hook for scroll reveal
function useScrollReveal() {
    const [isInView, setIsInView] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                }
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, []);

    return { ref, isInView };
}

export default function LandingPage() {
    const [showDemoRequest, setShowDemoRequest] = useState(false);
    const navSection = useScrollReveal();

    return (
        <div className="bg-slate-900">
            {/* =====================================================================
                HERO - Full Screen, Premium Dark Mode with Radial Glow
            ===================================================================== */}
            <section className="relative min-h-screen flex flex-col overflow-hidden">
                {/* Background with refined dark gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/80" />

                {/* Brand Accent Radial Glow - behind the headline */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] pointer-events-none slow-pulse-glow"
                    style={{
                        background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
                        filter: 'blur(120px)',
                    }}
                />

                {/* Subtle noise texture overlay */}
                <div
                    className="absolute inset-0 opacity-[0.015]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* Main Content - Centered */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
                    {/* Premium Glassmorphic Container for Brand */}
                    <div className="glass-card-premium p-8 sm:p-10 md:p-12 relative">
                        {/* Animated Brand */}
                        <AnimatedMomentum
                            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black text-white justify-center text-premium-display"
                            delay={200}
                        />
                    </div>

                    {/* Simple tagline with premium typography */}
                    <p
                        className="animate-hero-fade-up mt-8 text-lg sm:text-xl text-slate-400/90 font-light tracking-wide"
                        style={{ animationDelay: '800ms' }}
                    >
                        Affärssystem för hantverkare
                    </p>

                    {/* Single CTA with Shine Effect */}
                    <div
                        className="animate-hero-fade-up mt-12"
                        style={{ animationDelay: '1100ms' }}
                    >
                        <button
                            onClick={() => setShowDemoRequest(true)}
                            className="group btn-shine px-8 py-3.5 bg-white text-slate-900 rounded-full font-medium text-base hover:bg-slate-100 transition-all duration-300 inline-flex items-center shadow-lg shadow-white/10"
                        >
                            Boka demo
                            <ArrowRight className="ml-2.5 w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                        </button>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="relative z-10 pb-10 flex justify-center">
                    <ChevronDown className="w-5 h-5 text-slate-600 animate-scroll-indicator" />
                </div>
            </section>

            {/* =====================================================================
                SIMPLE NAVIGATION - Links to other pages with Scroll Reveal
            ===================================================================== */}
            <section
                ref={navSection.ref}
                className="py-32 bg-slate-800/50"
            >
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className={`space-y-1 scroll-reveal-stagger ${navSection.isInView ? 'in-view' : ''}`}>
                        <Link
                            to="/funktioner"
                            className="group flex items-center justify-between py-6 border-b border-slate-700 hover:border-brand-accent/50 transition-colors duration-300"
                        >
                            <span className="text-2xl font-medium text-white group-hover:text-brand-accent transition-colors duration-300 text-premium-heading">
                                Funktioner
                            </span>
                            <ArrowRight className="w-6 h-6 text-slate-500 group-hover:text-brand-accent group-hover:translate-x-2 transition-all duration-300" />
                        </Link>

                        <Link
                            to="/pris"
                            className="group flex items-center justify-between py-6 border-b border-slate-700 hover:border-brand-accent/50 transition-colors duration-300"
                        >
                            <span className="text-2xl font-medium text-white group-hover:text-brand-accent transition-colors duration-300 text-premium-heading">
                                Priser
                            </span>
                            <ArrowRight className="w-6 h-6 text-slate-500 group-hover:text-brand-accent group-hover:translate-x-2 transition-all duration-300" />
                        </Link>

                        <Link
                            to="/kundcase"
                            className="group flex items-center justify-between py-6 border-b border-slate-700 hover:border-brand-accent/50 transition-colors duration-300"
                        >
                            <span className="text-2xl font-medium text-white group-hover:text-brand-accent transition-colors duration-300 text-premium-heading">
                                Kunder
                            </span>
                            <ArrowRight className="w-6 h-6 text-slate-500 group-hover:text-brand-accent group-hover:translate-x-2 transition-all duration-300" />
                        </Link>

                        <Link
                            to="/om-oss"
                            className="group flex items-center justify-between py-6 border-b border-slate-700 hover:border-brand-accent/50 transition-colors duration-300"
                        >
                            <span className="text-2xl font-medium text-white group-hover:text-brand-accent transition-colors duration-300 text-premium-heading">
                                Om oss
                            </span>
                            <ArrowRight className="w-6 h-6 text-slate-500 group-hover:text-brand-accent group-hover:translate-x-2 transition-all duration-300" />
                        </Link>
                    </nav>
                </div>
            </section>

            {/* =====================================================================
                FOOTER - Minimal with Premium Styling
            ===================================================================== */}
            <section className="py-24 bg-slate-900 border-t border-slate-800/50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-slate-500 text-sm">
                        14 dagars kostnadsfri test
                    </p>
                    <button
                        onClick={() => setShowDemoRequest(true)}
                        className="mt-6 text-white hover:text-brand-accent transition-colors duration-300 inline-flex items-center text-sm group"
                    >
                        Kom igång
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </button>
                </div>
            </section>

            {/* Modal */}
            {showDemoRequest && <DemoRequestModal onClose={() => setShowDemoRequest(false)} />}
        </div>
    );
}
