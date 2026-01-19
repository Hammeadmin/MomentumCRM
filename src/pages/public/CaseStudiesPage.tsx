import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import content from '../../locales/publicContent';
import ImagePlaceholder from '../../components/public/ImagePlaceholder';

const t = content.caseStudies;

export default function CaseStudiesPage() {
    return (
        <div className="bg-slate-900 pt-24">
            {/* Header */}
            <section className="py-20 lg:py-28">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl lg:text-5xl font-bold text-white">
                        Kunder
                    </h1>
                    <p className="mt-6 text-xl text-slate-400 max-w-2xl mx-auto">
                        Företag som använder Momentum
                    </p>
                </div>
            </section>

            {/* Case Studies */}
            <section className="pb-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="space-y-24">
                        {t.items.map((caseStudy, index) => (
                            <div
                                key={caseStudy.company}
                                className={`grid lg:grid-cols-2 gap-12 items-center`}
                            >
                                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                                    <ImagePlaceholder
                                        id={caseStudy.image}
                                        aspectRatio="4/3"
                                        className="rounded-2xl border border-slate-700"
                                    />
                                </div>
                                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        {caseStudy.industry}
                                    </div>
                                    <h2 className="text-2xl lg:text-3xl font-bold text-white">
                                        {caseStudy.company}
                                    </h2>
                                    <blockquote className="mt-6 text-lg text-slate-400 italic border-l-2 border-indigo-500 pl-4">
                                        "{caseStudy.quote}"
                                    </blockquote>
                                    <div className="mt-4 text-sm">
                                        <span className="font-semibold text-white">{caseStudy.author}</span>
                                        <span className="text-slate-500">, {caseStudy.role}</span>
                                    </div>

                                    {/* Metrics */}
                                    <div className="mt-8 grid grid-cols-3 gap-4">
                                        {caseStudy.metrics.map((metric) => (
                                            <div
                                                key={metric.label}
                                                className="text-center p-4 bg-slate-800 rounded-xl border border-slate-700"
                                            >
                                                <div className="text-xl font-bold text-indigo-400">{metric.value}</div>
                                                <div className="text-xs text-slate-500 mt-1">{metric.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 bg-slate-800/50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Link
                        to="/kontakt"
                        className="inline-flex items-center px-8 py-4 bg-white text-slate-900 rounded-full font-medium hover:bg-slate-100 transition-colors"
                    >
                        Kontakta oss
                        <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
