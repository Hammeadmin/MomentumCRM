import { useState } from 'react';
import { Check, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import content from '../../locales/publicContent';

const t = content.pricing;

export default function PricingPage() {
    const [isYearly, setIsYearly] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <div className="bg-slate-900 pt-24">
            {/* Header */}
            <section className="py-20 lg:py-28">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl lg:text-5xl font-bold text-white">
                        Priser
                    </h1>
                    <p className="mt-6 text-xl text-slate-400">
                        Enkel prismodell. Inga dolda avgifter.
                    </p>

                    {/* Toggle */}
                    <div className="mt-10 inline-flex items-center bg-slate-800 rounded-full p-1 border border-slate-700">
                        <button
                            onClick={() => setIsYearly(false)}
                            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${!isYearly
                                    ? 'bg-white text-slate-900'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Månadsvis
                        </button>
                        <button
                            onClick={() => setIsYearly(true)}
                            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${isYearly
                                    ? 'bg-white text-slate-900'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Årsvis
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                                -20%
                            </span>
                        </button>
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="pb-24">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-6">
                        {t.plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`relative bg-slate-800 rounded-2xl border p-8 ${plan.popular
                                        ? 'border-indigo-500 ring-1 ring-indigo-500/20'
                                        : 'border-slate-700'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 text-white text-xs font-semibold rounded-full">
                                        Populärast
                                    </div>
                                )}

                                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                <p className="mt-2 text-sm text-slate-400">{plan.description}</p>

                                <div className="mt-6">
                                    {plan.monthlyPrice !== null ? (
                                        <div className="flex items-baseline">
                                            <span className="text-4xl font-bold text-white">
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
                                                    <Check className="w-4 h-4 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                                                ) : (
                                                    <Minus className="w-4 h-4 text-slate-600 mr-2 mt-0.5 flex-shrink-0" />
                                                )
                                            )}
                                            <span className={feature.included || feature.header ? 'text-slate-300' : 'text-slate-500'}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    to={plan.monthlyPrice !== null ? '/register' : '/kontakt'}
                                    className={`mt-8 block w-full py-3 rounded-full font-medium text-center transition-colors ${plan.popular
                                            ? 'bg-white text-slate-900 hover:bg-slate-100'
                                            : 'bg-slate-700 text-white hover:bg-slate-600'
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
            <section className="py-24 bg-slate-800/50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-white text-center mb-12">
                        Jämför planer
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-4 px-4 font-medium text-slate-400">Funktion</th>
                                    <th className="text-center py-4 px-4 font-semibold text-white">Solo</th>
                                    <th className="text-center py-4 px-4 font-semibold text-white bg-indigo-500/5">Team</th>
                                    <th className="text-center py-4 px-4 font-semibold text-white">Företag</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
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
                                    <tr key={row.feature} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="py-4 px-4 text-slate-300">{row.feature}</td>
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

            {/* FAQ */}
            <section className="py-24 bg-slate-900">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-white text-center mb-12">
                        Vanliga frågor
                    </h2>

                    <div className="space-y-3">
                        {t.faq.map((item, index) => (
                            <div key={index} className="border border-slate-700 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                    className="w-full flex items-center justify-between p-5 text-left bg-slate-800 hover:bg-slate-700/50 transition-colors"
                                >
                                    <span className="font-medium text-white">{item.question}</span>
                                    {openFaq === index ? (
                                        <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                    )}
                                </button>
                                {openFaq === index && (
                                    <div className="p-5 pt-0 text-slate-400 bg-slate-800">
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
