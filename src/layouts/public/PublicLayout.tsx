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
            {/* Premium Sticky Navbar with Glassmorphism */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
                        ? 'navbar-premium scrolled'
                        : 'bg-transparent'
                    }`}
                style={{
                    backdropFilter: isScrolled ? 'blur(16px)' : 'none',
                    WebkitBackdropFilter: isScrolled ? 'blur(16px)' : 'none',
                    borderBottom: isScrolled ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                }}
            >
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 lg:h-20">
                        {/* Logo */}
                        <Link to="/" className="flex items-center space-x-2.5 group">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center group-hover:bg-brand-accent transition-colors duration-300">
                                <Zap className="w-4 h-4 text-slate-900 group-hover:text-white transition-colors duration-300" />
                            </div>
                            <span className="text-lg font-semibold text-white tracking-tight">
                                Momentum
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex items-center space-x-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.label}
                                    to={link.href}
                                    className={`nav-link-premium text-sm font-medium transition-colors duration-300 ${location.pathname === link.href
                                            ? 'active text-brand-accent'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>

                        {/* Desktop Actions with Shine Effect */}
                        <div className="hidden lg:flex items-center space-x-4">
                            <Link
                                to="/login"
                                className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-300"
                            >
                                {t.nav.login}
                            </Link>
                            <Link
                                to="/kontakt"
                                className="btn-shine px-5 py-2.5 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-100 transition-all duration-300"
                            >
                                {t.nav.getStarted}
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
                        >
                            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </nav>

                {/* Mobile Menu with Premium Styling */}
                {isMobileMenuOpen && (
                    <div
                        className="lg:hidden border-t border-white/5"
                        style={{
                            background: 'rgba(15, 23, 42, 0.98)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                        }}
                    >
                        <div className="px-4 py-6 space-y-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.label}
                                    to={link.href}
                                    className={`block px-3 py-2.5 rounded-lg transition-colors duration-200 font-medium ${location.pathname === link.href
                                            ? 'text-brand-accent bg-brand-accent/10'
                                            : 'text-white hover:bg-white/5'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
                                <Link
                                    to="/login"
                                    className="block text-center py-2.5 text-white font-medium hover:text-brand-accent transition-colors duration-200"
                                >
                                    {t.nav.login}
                                </Link>
                                <Link
                                    to="/kontakt"
                                    className="block text-center py-2.5 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors duration-200"
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

            {/* Premium Footer */}
            <footer className="bg-slate-950 text-white pt-16 pb-8 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Main Footer */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 pb-12 border-b border-white/10">
                        {/* Brand Column */}
                        <div className="col-span-2 md:col-span-1">
                            <Link to="/" className="flex items-center space-x-2 mb-4 group">
                                <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center group-hover:bg-brand-accent transition-colors duration-300">
                                    <Zap className="w-4 h-4 text-slate-900 group-hover:text-white transition-colors duration-300" />
                                </div>
                                <span className="text-base font-semibold">Momentum</span>
                            </Link>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                {t.footer.tagline}
                            </p>
                        </div>

                        {/* Link Columns */}
                        {t.footer.columns.map((column) => (
                            <div key={column.title}>
                                <h4 className="font-medium text-xs uppercase tracking-wider text-slate-500 mb-4">
                                    {column.title}
                                </h4>
                                <ul className="space-y-2.5">
                                    {column.links.map((link) => (
                                        <li key={link.label}>
                                            <Link
                                                to={link.href}
                                                className="text-slate-400 hover:text-brand-accent transition-colors duration-200 text-sm"
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
                    <div className="pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-600">
                        <p>{t.footer.copyright}</p>
                        <p className="mt-2 md:mt-0">{t.footer.location}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
