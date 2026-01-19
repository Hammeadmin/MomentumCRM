import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Zap } from 'lucide-react';
import content from '../../locales/publicContent';

const t = content;

export default function PublicLayout() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setIsMobileMenuOpen(false);
        window.scrollTo(0, 0);
    }, [location.pathname]);

    const navLinks = [
        { label: t.nav.features, href: '/funktioner' },
        { label: t.nav.pricing, href: '/pris' },
        { label: t.nav.customers, href: '/kundcase' },
        { label: t.nav.about, href: '/om-oss' },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Navbar */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                        ? 'bg-surface/95 backdrop-blur-md shadow-subtle border-b border-border/50'
                        : 'bg-transparent'
                    }`}
            >
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 lg:h-20">
                        {/* Logo */}
                        <Link to="/" className="flex items-center space-x-2.5 group">
                            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center group-hover:bg-primary transition-colors">
                                <Zap className="w-4 h-4 text-background" />
                            </div>
                            <span className="text-lg font-semibold text-foreground tracking-tight">
                                Momentum
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex items-center space-x-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.label}
                                    to={link.href}
                                    className={`text-sm font-medium transition-colors ${location.pathname === link.href
                                            ? 'text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden lg:flex items-center space-x-4">
                            <Link
                                to="/login"
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {t.nav.login}
                            </Link>
                            <Link
                                to="/kontakt"
                                className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors"
                            >
                                {t.nav.getStarted}
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </nav>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden bg-surface border-t border-border">
                        <div className="px-4 py-6 space-y-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.label}
                                    to={link.href}
                                    className="block px-3 py-2.5 text-foreground hover:bg-muted rounded-lg transition-colors font-medium"
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <div className="pt-4 mt-4 border-t border-border space-y-3">
                                <Link
                                    to="/login"
                                    className="block text-center py-2.5 text-foreground font-medium"
                                >
                                    {t.nav.login}
                                </Link>
                                <Link
                                    to="/kontakt"
                                    className="block text-center py-2.5 bg-foreground text-background rounded-lg font-medium"
                                >
                                    {t.nav.getStarted}
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main>
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-zinc-900 text-white pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Main Footer */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 pb-12 border-b border-zinc-800">
                        {/* Brand Column */}
                        <div className="col-span-2 md:col-span-1">
                            <Link to="/" className="flex items-center space-x-2 mb-4">
                                <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
                                    <Zap className="w-4 h-4 text-zinc-900" />
                                </div>
                                <span className="text-base font-semibold">Momentum</span>
                            </Link>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                {t.footer.tagline}
                            </p>
                        </div>

                        {/* Link Columns */}
                        {t.footer.columns.map((column) => (
                            <div key={column.title}>
                                <h4 className="font-medium text-xs uppercase tracking-wider text-zinc-400 mb-4">
                                    {column.title}
                                </h4>
                                <ul className="space-y-2.5">
                                    {column.links.map((link) => (
                                        <li key={link.label}>
                                            <Link
                                                to={link.href}
                                                className="text-zinc-400 hover:text-white transition-colors text-sm"
                                            >
                                                {link.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Row */}
                    <div className="pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-zinc-500">
                        <p>{t.footer.copyright}</p>
                        <p className="mt-2 md:mt-0">{t.footer.location}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
