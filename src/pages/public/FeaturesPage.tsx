import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import content from '../../locales/publicContent';
import ImagePlaceholder from '../../components/public/ImagePlaceholder';

const t = content.features;

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

export default function FeaturesPage() {
    return (
        <div className="bg-slate-900 pt-24">
            {/* Header with gradient text */}
            <section className="py-20 lg:py-28 relative overflow-hidden">
                {/* Subtle mesh gradient background */}
                <div className="absolute inset-0 mesh-gradient-bg opacity-50" />

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
                    <h1 className="text-4xl lg:text-5xl font-bold text-gradient-premium text-premium-display">
                        Funktioner
                    </h1>
                    <p className="mt-6 text-xl text-slate-400 max-w-2xl mx-auto">
                        Allt du behöver för att driva ditt hantverksföretag
                    </p>
                </div>
            </section>

            {/* Feature Sections with scroll reveal */}
            {t.categories.map((feature, index) => {
                const sectionReveal = useScrollReveal();

                return (
                    <section
                        key={feature.id}
                        id={feature.id}
                        ref={sectionReveal.ref}
                        className={`py-24 ${index % 2 === 1 ? 'bg-slate-800/30' : 'bg-slate-900'}`}
                    >
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className={`grid lg:grid-cols-2 gap-16 items-center ${sectionReveal.isInView ? '' : 'opacity-0'}`}>
                                {/* Image with reveal animation */}
                                <div
                                    className={`${index % 2 === 1 ? 'lg:order-2' : ''} ${sectionReveal.isInView
                                            ? (index % 2 === 1 ? 'scroll-reveal-right in-view' : 'scroll-reveal-left in-view')
                                            : (index % 2 === 1 ? 'scroll-reveal-right' : 'scroll-reveal-left')
                                        }`}
                                >
                                    <div className="card-premium-dark p-1 overflow-hidden">
                                        <ImagePlaceholder
                                            id={feature.image}
                                            aspectRatio="4/3"
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>

                                {/* Content with staggered reveal */}
                                <div className={`${index % 2 === 1 ? 'lg:order-1' : ''} ${sectionReveal.isInView ? 'scroll-reveal in-view' : 'scroll-reveal'
                                    }`}
                                    style={{ transitionDelay: '150ms' }}
                                >
                                    <h2 className="text-3xl lg:text-4xl font-bold text-white text-premium-heading">
                                        {feature.title}
                                    </h2>
                                    <p className="mt-4 text-lg text-slate-400 leading-relaxed">
                                        {feature.description}
                                    </p>

                                    <ul className="mt-8 space-y-4">
                                        {feature.highlights.map((item, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start"
                                                style={{
                                                    opacity: sectionReveal.isInView ? 1 : 0,
                                                    transform: sectionReveal.isInView ? 'translateY(0)' : 'translateY(10px)',
                                                    transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${200 + i * 80}ms`
                                                }}
                                            >
                                                <div className="check-icon-premium mt-0.5">
                                                    <Check className="w-3 h-3 text-indigo-400" />
                                                </div>
                                                <span className="ml-3 text-slate-300">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Section divider */}
                        {index < t.categories.length - 1 && (
                            <div className="section-divider mt-24 max-w-7xl mx-auto" />
                        )}
                    </section>
                );
            })}

            {/* Integrations with hover effects */}
            <section id="integrationer" className="py-24 bg-slate-800/30 relative overflow-hidden">
                {/* Subtle glow accent */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
                        filter: 'blur(80px)',
                    }}
                />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gradient-subtle text-premium-heading">
                            Integrationer
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {t.integrations.items.map((integration, i) => (
                            <div
                                key={integration.name}
                                className="card-premium-dark p-6 group"
                                style={{
                                    animationDelay: `${i * 100}ms`
                                }}
                            >
                                <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors duration-300">
                                    {integration.name}
                                </h3>
                                <p className="mt-2 text-sm text-slate-400">{integration.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA with premium button */}
            <section className="py-24 bg-slate-900 relative">
                <div className="section-divider-accent mb-24 max-w-xl mx-auto" />

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Link
                        to="/pris"
                        className="group btn-shine inline-flex items-center px-8 py-4 bg-white text-slate-900 rounded-full font-medium hover:bg-slate-100 transition-all duration-300 shadow-lg shadow-white/10"
                    >
                        Se priser
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
