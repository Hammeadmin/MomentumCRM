import { ReactNode } from 'react';

interface LegalPageLayoutProps {
    title: string;
    lastUpdated: string;
    children: ReactNode;
}

export default function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
    return (
        <div className="min-h-screen pt-24 pb-16 bg-background">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <header className="mb-12 text-center">
                    <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
                        {title}
                    </h1>
                    <p className="mt-3 text-muted-foreground text-sm">
                        {lastUpdated}
                    </p>
                </header>

                <article className="prose prose-zinc dark:prose-invert max-w-none">
                    {children}
                </article>
            </div>
        </div>
    );
}
