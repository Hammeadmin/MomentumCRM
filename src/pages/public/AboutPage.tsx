import content from '../../locales/publicContent';
import ImagePlaceholder from '../../components/public/ImagePlaceholder';

const t = content.about;

export default function AboutPage() {
    return (
        <div className="bg-slate-900 pt-24">
            {/* Header */}
            <section className="py-20 lg:py-28">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl lg:text-5xl font-bold text-white">
                        Om oss
                    </h1>
                    <p className="mt-6 text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
                        {t.intro}
                    </p>
                </div>
            </section>

            {/* Story */}
            <section className="py-16 bg-slate-800/50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-white mb-8">
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

            {/* Values */}
            <section className="py-24 bg-slate-900">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-white mb-12 text-center">
                        Våra principer
                    </h2>
                    <div className="grid md:grid-cols-3 gap-12">
                        {t.values.map((value) => (
                            <div key={value.title} className="text-center">
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

            {/* Team */}
            <section className="py-24 bg-slate-800/50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-white mb-12 text-center">
                        {t.team.headline}
                    </h2>
                    <div className="flex justify-center">
                        {t.team.members.map((member) => (
                            <div key={member.name} className="text-center max-w-xs">
                                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-4 border border-slate-600">
                                    <ImagePlaceholder id={member.image} aspectRatio="1" className="w-full h-full" />
                                </div>
                                <h3 className="font-semibold text-white">{member.name}</h3>
                                <p className="text-sm text-slate-400">{member.role}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Office */}
            <section className="py-24 bg-slate-900">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-4">
                                {t.office.headline}
                            </h2>
                            <p className="text-slate-400 whitespace-pre-line">
                                {t.office.address}
                            </p>
                        </div>
                        <div>
                            <ImagePlaceholder
                                id={t.office.image}
                                aspectRatio="2/1"
                                className="rounded-xl border border-slate-700"
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
