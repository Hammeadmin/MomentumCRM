import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import content from '../../locales/publicContent';
import ImagePlaceholder from '../../components/public/ImagePlaceholder';

const t = content.caseStudies;

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

export default function CaseStudiesPage() {
    return (
        <div className="bg-slate-900 pt-24">
            {/* Header with gradient text */}
            <section className="py-20 lg:py-28 relative overflow-hidden">
                {/* Subtle mesh gradient */}
                <div className="absolute inset-0 mesh-gradient-bg opacity-40" />

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
                    <h1 className="text-4xl lg:text-5xl font-bold text-gradient-premium text-premium-display">
                        Kunder
                    </h1>
                    <p className="mt-6 text-xl text-slate-400 max-w-2xl mx-auto">
                        Företag som använder Momentum
                    </p>
                </div>
            </section>

            {/* Case Studies with premium styling */}
            <section className="pb-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="space-y-32">
                        {t.items.map((caseStudy, index) => {
                            const caseReveal = useScrollReveal();

                            return (
                                <div
                                    key={caseStudy.company}
                                    ref={caseReveal.ref}
                                    className={`grid lg:grid-cols-2 gap-12 items-center ${caseReveal.isInView ? '' : 'opacity-0'}`}
                                >
                                    <div className={`${index % 2 === 1 ? 'lg:order-2' : ''} ${caseReveal.isInView
                                            ? (index % 2 === 1 ? 'scroll-reveal-right in-view' : 'scroll-reveal-left in-view')
                                            : (index % 2 === 1 ? 'scroll-reveal-right' : 'scroll-reveal-left')
                                        }`}>
                                        <div className="card-premium-dark p-1 overflow-hidden">
                                            <ImagePlaceholder
                                                id={caseStudy.image}
                                                aspectRatio="4/3"
                                                className="rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    <div className={`${index % 2 === 1 ? 'lg:order-1' : ''} ${caseReveal.isInView ? 'scroll-reveal in-view' : 'scroll-reveal'
                                        }`}
                                        style={{ transitionDelay: '150ms' }}
                                    >
                                        <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
                                            {caseStudy.industry}
                                        </div>
                                        <h2 className="text-2xl lg:text-3xl font-bold text-white text-premium-heading">
                                            {caseStudy.company}
                                        </h2>

                                        {/* Premium quote with gradient border */}
                                        <blockquote className="mt-6 text-lg text-slate-400 italic pl-5 border-l-2 border-transparent bg-gradient-to-b from-indigo-500/20 to-transparent"
                                            style={{
                                                borderImage: 'linear-gradient(180deg, #6366f1 0%, #8b5cf6 50%, transparent 100%) 1'
                                            }}
                                        >
                                            "{caseStudy.quote}"
                                        </blockquote>
                                        <div className="mt-4 text-sm">
                                            <span className="font-semibold text-white">{caseStudy.author}</span>
                                            <span className="text-slate-500">, {caseStudy.role}</span>
                                        </div>

                                        {/* Premium Metrics */}
                                        <div className="mt-8 grid grid-cols-3 gap-4">
                                            {caseStudy.metrics.map((metric, i) => (
                                                <div
                                                    key={metric.label}
                                                    className="text-center metric-card-premium p-4"
                                                    style={{
                                                        opacity: caseReveal.isInView ? 1 : 0,
                                                        transform: caseReveal.isInView ? 'translateY(0)' : 'translateY(10px)',
                                                        transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${300 + i * 100}ms`
                                                    }}
                                                >
                                                    <div className="text-xl font-bold text-gradient-premium">{metric.value}</div>
                                                    <div className="text-xs text-slate-500 mt-1">{metric.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA with premium button */}
            <section className="py-24 bg-slate-800/30 relative">
                <div className="section-divider-accent mb-24 max-w-xl mx-auto" />

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Link
                        to="/kontakt"
                        className="group btn-shine inline-flex items-center px-8 py-4 bg-white text-slate-900 rounded-full font-medium hover:bg-slate-100 transition-all duration-300 shadow-lg shadow-white/10"
                    >
                        Kontakta oss
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </Link>
                </div>
            </section>
        </div>
    );
}

