import { useState, useEffect, useRef } from 'react';
import content from '../../locales/publicContent';
import ImagePlaceholder from '../../components/public/ImagePlaceholder';

const t = content.about;

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

export default function AboutPage() {
    const valuesReveal = useScrollReveal();
    const teamReveal = useScrollReveal();
    const officeReveal = useScrollReveal();

    return (
        <div className="bg-slate-900 pt-24">
            {/* Header with gradient text */}
            <section className="py-20 lg:py-28 relative overflow-hidden">
                {/* Subtle mesh gradient */}
                <div className="absolute inset-0 mesh-gradient-bg opacity-40" />

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
                    <h1 className="text-4xl lg:text-5xl font-bold text-gradient-premium text-premium-display">
                        Om oss
                    </h1>
                    <p className="mt-6 text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
                        {t.intro}
                    </p>
                </div>
            </section>

            {/* Story with premium styling */}
            <section className="py-16 bg-slate-800/30">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-white mb-8 text-premium-heading">
                        {t.story.headline}
                    </h2>
                    <div className="space-y-6">
                        {t.story.paragraphs.map((p, i) => (
                            <p key={i} className="text-slate-400 leading-relaxed">
                                {p}
                            </p>
                        ))}
                    </div>
                </div>
            </section>

            <div className="section-divider max-w-3xl mx-auto" />

            {/* Values with scroll reveal */}
            <section
                ref={valuesReveal.ref}
                className="py-24 bg-slate-900"
            >
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-white mb-12 text-center text-premium-heading">
                        Våra principer
                    </h2>
                    <div className={`grid md:grid-cols-3 gap-12 ${valuesReveal.isInView ? 'scroll-reveal-stagger in-view' : 'scroll-reveal-stagger'}`}>
                        {t.values.map((value, i) => (
                            <div
                                key={value.title}
                                className="text-center"
                                style={{ transitionDelay: `${i * 100}ms` }}
                            >
                                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center border border-indigo-500/20">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-3">
                                    {value.title}
                                </h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    {value.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="section-divider-accent max-w-xl mx-auto" />

            {/* Team with premium card */}
            <section
                ref={teamReveal.ref}
                className="py-24 bg-slate-800/30"
            >
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-white mb-12 text-center text-premium-heading">
                        {t.team.headline}
                    </h2>
                    <div className={`flex justify-center ${teamReveal.isInView ? 'scroll-reveal-scale in-view' : 'scroll-reveal-scale'}`}>
                        {t.team.members.map((member) => (
                            <div key={member.name} className="text-center max-w-xs card-premium-dark p-8">
                                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-4 ring-2 ring-indigo-500/30 ring-offset-4 ring-offset-slate-800">
                                    <ImagePlaceholder id={member.image} aspectRatio="1" className="w-full h-full" />
                                </div>
                                <h3 className="font-semibold text-white text-lg">{member.name}</h3>
                                <p className="text-sm text-indigo-400">{member.role}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Office with refined layout */}
            <section
                ref={officeReveal.ref}
                className="py-24 bg-slate-900"
            >
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className={`grid lg:grid-cols-2 gap-12 items-center ${officeReveal.isInView ? '' : 'opacity-0'}`}>
                        <div className={officeReveal.isInView ? 'scroll-reveal-left in-view' : 'scroll-reveal-left'}>
                            <h2 className="text-2xl font-bold text-white mb-4 text-premium-heading">
                                {t.office.headline}
                            </h2>
                            <p className="text-slate-400 whitespace-pre-line">
                                {t.office.address}
                            </p>
                        </div>
                        <div className={officeReveal.isInView ? 'scroll-reveal-right in-view' : 'scroll-reveal-right'}>
                            <div className="card-premium-dark p-1 overflow-hidden">
                                <ImagePlaceholder
                                    id={t.office.image}
                                    aspectRatio="2/1"
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

