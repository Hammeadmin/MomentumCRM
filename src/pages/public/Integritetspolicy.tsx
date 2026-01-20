import LegalPageLayout from '../../layouts/public/LegalPageLayout';
import content from '../../locales/publicContent';

const t = content.legal.privacy;

export default function Integritetspolicy() {
    return (
        <LegalPageLayout title={t.title} lastUpdated={t.lastUpdated}>
            {t.sections.map((section: { heading: string; content: string }) => (
                <section key={section.heading} className="mb-8">
                    <h2 className="text-xl font-semibold text-foreground mb-3">
                        {section.heading}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                        {section.content}
                    </p>
                </section>
            ))}
        </LegalPageLayout>
    );
}
