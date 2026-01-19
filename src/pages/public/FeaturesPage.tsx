import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import content from '../../locales/publicContent';
import ImagePlaceholder from '../../components/public/ImagePlaceholder';

const t = content.features;

export default function FeaturesPage() {
    return (
        <div className="bg-slate-900 pt-24">
            {/* Header */}
            <section className="py-20 lg:py-28">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl lg:text-5xl font-bold text-white">
                        Funktioner
                    </h1>
                    <p className="mt-6 text-xl text-slate-400 max-w-2xl mx-auto">
                        Allt du behöver för att driva ditt hantverksföretag
                    </p>
                </div>
            </section>

            {/* Feature Sections */}
            {t.categories.map((feature, index) => (
                <section
                    key={feature.id}
                    id={feature.id}
                    className={`py-24 ${index % 2 === 1 ? 'bg-slate-800/50' : 'bg-slate-900'}`}
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className={`grid lg:grid-cols-2 gap-16 items-center`}>
                            {/* Image */}
                            <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                                <ImagePlaceholder
                                    id={feature.image}
                                    aspectRatio="4/3"
                                    className="rounded-xl border border-slate-700"
                                />
                            </div>

                            {/* Content */}
                            <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                                <h2 className="text-3xl lg:text-4xl font-bold text-white">
                                    {feature.title}
                                </h2>
                                <p className="mt-4 text-lg text-slate-400 leading-relaxed">
                                    {feature.description}
                                </p>

                                <ul className="mt-8 space-y-4">
                                    {feature.highlights.map((item, i) => (
                                        <li key={i} className="flex items-start">
                                            <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check className="w-3 h-3 text-indigo-400" />
                                            </div>
                                            <span className="ml-3 text-slate-300">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>
            ))}

            {/* Integrations */}
            <section id="integrationer" className="py-24 bg-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-white">
                            Integrationer
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {t.integrations.items.map((integration) => (
                            <div
                                key={integration.name}
                                className="bg-slate-800 rounded-xl p-6 border border-slate-700"
                            >
                                <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
                                <p className="mt-2 text-sm text-slate-400">{integration.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 bg-slate-900">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Link
                        to="/pris"
                        className="inline-flex items-center px-8 py-4 bg-white text-slate-900 rounded-full font-medium hover:bg-slate-100 transition-colors"
                    >
                        Se priser
                        <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
