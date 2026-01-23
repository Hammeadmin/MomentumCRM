import { useState } from 'react';
import { Check, Minus, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import content from '../../locales/publicContent';

const t = content.pricing;

export default function PricingPage() {
    const [isYearly, setIsYearly] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <div className="bg-slate-900 pt-24">
            {/* Header with gradient accent */}
            <section className="py-20 lg:py-28 relative overflow-hidden">
                {/* Subtle background glow */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.1) 0%, transparent 60%)',
                        filter: 'blur(80px)',
                    }}
                />

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
                    <h1 className="text-4xl lg:text-5xl font-bold text-gradient-premium text-premium-display">
                        Priser
                    </h1>
                    <p className="mt-6 text-xl text-slate-400">
                        Enkel prismodell. Inga dolda avgifter.
                    </p>

                    {/* Premium Toggle */}
                    <div className="mt-10 inline-flex items-center bg-slate-800/80 rounded-full p-1.5 border border-slate-700/50 backdrop-blur-sm">
                        <button
                            onClick={() => setIsYearly(false)}
                            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${!isYearly
                                ? 'bg-white text-slate-900 shadow-md'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Månadsvis
                        </button>
                        <button
                            onClick={() => setIsYearly(true)}
                            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${isYearly
                                ? 'bg-white text-slate-900 shadow-md'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Årsvis
                            <span className="text-xs bg-gradient-to-r from-emerald-500 to-emerald-400 text-white px-2.5 py-0.5 rounded-full font-semibold">
                                -20%
                            </span>
                        </button>
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="pb-24">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                        {t.plans.map((plan, index) => (
                            <div
                                key={plan.id}
                                className={`relative rounded-2xl p-8 transition-all duration-300 ${plan.popular
                                    ? 'card-glow-ring active bg-slate-800/80 border border-indigo-500/50 scale-[1.02] lg:scale-105'
                                    : 'card-premium-dark'
                                    }`}
                                style={{
                                    animationDelay: `${index * 100}ms`
                                }}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold rounded-full shadow-lg shadow-indigo-500/30">
                                        Populärast
                                    </div>
                                )}

                                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                <p className="mt-2 text-sm text-slate-400">{plan.description}</p>

                                <div className="mt-6">
                                    {plan.monthlyPrice !== null ? (
                                        <div className="flex items-baseline">
                                            <span className="text-4xl font-bold text-white text-premium-heading">
                                                {isYearly
                                                    ? Math.round(plan.yearlyPrice! / 12).toLocaleString('sv-SE')
                                                    : plan.monthlyPrice.toLocaleString('sv-SE')
                                                }
                                            </span>
                                            <span className="text-slate-400 ml-1">kr/mån</span>
                                        </div>
                                    ) : (
                                        <div className="text-2xl font-bold text-white">Kontakta oss</div>
                                    )}
                                </div>

                                <ul className="mt-8 space-y-3">
                                    {plan.features.map((feature, i) => (
                                        <li
                                            key={i}
                                            className={`flex items-start text-sm ${feature.header ? 'font-medium text-white pt-2' : ''}`}
                                        >
                                            {!feature.header && (
                                                feature.included ? (
                                                    <div className="check-icon-premium mt-0.5">
                                                        <Check className="w-3 h-3 text-emerald-400" />
                                                    </div>
                                                ) : (
                                                    <Minus className="w-4 h-4 text-slate-600 mr-2 mt-0.5 flex-shrink-0" />
                                                )
                                            )}
                                            <span className={`${!feature.header && feature.included ? 'ml-2' : ''} ${feature.included || feature.header ? 'text-slate-300' : 'text-slate-500'}`}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    to={plan.monthlyPrice !== null ? '/register' : '/kontakt'}
                                    className={`mt-8 block w-full py-3.5 rounded-full font-medium text-center transition-all duration-300 ${plan.popular
                                        ? 'btn-shine bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-white/10'
                                        : 'bg-slate-700/50 text-white hover:bg-slate-600/50 border border-slate-600/50'
                                        }`}
                                >
                                    {plan.cta}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Comparison Table */}
            <section className="py-24 bg-slate-800/30">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-white text-center mb-12 text-premium-heading">
                        Jämför planer
                    </h2>

                    <div className="overflow-x-auto card-premium-dark p-1">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="text-left py-4 px-6 font-medium text-slate-400">Funktion</th>
                                    <th className="text-center py-4 px-4 font-semibold text-white">Solo</th>
                                    <th className="text-center py-4 px-4 font-semibold text-indigo-400 bg-indigo-500/5 rounded-t-lg">Team</th>
                                    <th className="text-center py-4 px-4 font-semibold text-white">Företag</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30">
                                {[
                                    { feature: 'CRM & Lead-hantering', solo: true, team: true, enterprise: true },
                                    { feature: 'Offerter', solo: true, team: true, enterprise: true },
                                    { feature: 'Fakturering', solo: true, team: true, enterprise: true },
                                    { feature: 'Fortnox-synk', solo: false, team: true, enterprise: true },
                                    { feature: 'Team-schemaläggning', solo: false, team: true, enterprise: true },
                                    { feature: 'SMS-utskick', solo: false, team: true, enterprise: true },
                                    { feature: 'API-åtkomst', solo: false, team: false, enterprise: true },
                                    { feature: 'SSO (SAML)', solo: false, team: false, enterprise: true },
                                    { feature: 'Dedikerad support', solo: false, team: false, enterprise: true },
                                ].map((row) => (
                                    <tr key={row.feature} className="hover:bg-slate-700/20 transition-colors duration-200">
                                        <td className="py-4 px-6 text-slate-300">{row.feature}</td>
                                        <td className="py-4 px-4 text-center">
                                            {row.solo ? <Check className="w-5 h-5 text-emerald-400 mx-auto" /> : <Minus className="w-5 h-5 text-slate-600 mx-auto" />}
                                        </td>
                                        <td className="py-4 px-4 text-center bg-indigo-500/5">
                                            {row.team ? <Check className="w-5 h-5 text-emerald-400 mx-auto" /> : <Minus className="w-5 h-5 text-slate-600 mx-auto" />}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            {row.enterprise ? <Check className="w-5 h-5 text-emerald-400 mx-auto" /> : <Minus className="w-5 h-5 text-slate-600 mx-auto" />}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* FAQ with smooth animations */}
            <section className="py-24 bg-slate-900">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-white text-center mb-12 text-premium-heading">
                        Vanliga frågor
                    </h2>

                    <div className="space-y-3">
                        {t.faq.map((item, index) => (
                            <div
                                key={index}
                                className="card-premium-dark overflow-hidden"
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                    className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-700/30 transition-colors duration-200"
                                >
                                    <span className="font-medium text-white">{item.question}</span>
                                    <div className={`transform transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`}>
                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                    </div>
                                </button>
                                {openFaq === index && (
                                    <div className="px-5 pb-5 text-slate-400 faq-content">
                                        {item.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}

