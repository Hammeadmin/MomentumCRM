/**
 * Image Component with Fallback Placeholder
 * 
 * Uses actual images from src/assets when available,
 * falls back to placeholder for missing images (like TEAM_FOUNDER).
 */

interface ImagePlaceholderProps {
    id: string;
    aspectRatio?: string;
    className?: string;
    alt?: string;
}

// Pre-load all images using Vite's import.meta.glob
// Path is relative to THIS file (components/public/)
const imageModules = import.meta.glob('../../assets/*.png', { eager: true, as: 'url' });

// Build a simple map: ID -> URL
const IMAGES: Record<string, string> = {};
for (const path in imageModules) {
    // Extract filename without extension: "../../assets/HERO_DASHBOARD.png" -> "HERO_DASHBOARD"
    const match = path.match(/\/([^/]+)\.png$/);
    if (match) {
        IMAGES[match[1]] = imageModules[path] as string;
    }
}

// Fallback descriptions for images not yet available
const PLACEHOLDER_INFO: Record<string, { description: string; dimensions: string }> = {
    TEAM_FOUNDER: {
        description: 'Coming soon',
        dimensions: '500x500',
    },
};

export default function ImagePlaceholder({
    id,
    aspectRatio = '16/9',
    className = '',
    alt,
}: ImagePlaceholderProps) {
    const imageSrc = IMAGES[id];

    // If image exists, render it
    if (imageSrc) {
        return (
            <div className={`overflow-hidden ${className}`} style={{ aspectRatio }}>
                <img
                    src={imageSrc}
                    alt={alt || id.replace(/_/g, ' ').toLowerCase()}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            </div>
        );
    }

    // Fallback placeholder for missing images
    const placeholderInfo = PLACEHOLDER_INFO[id];

    return (
        <div
            className={`relative bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 rounded-xl overflow-hidden group ${className}`}
            style={{ aspectRatio }}
        >
            {/* Grid pattern for visual interest */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                }}
            />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-300/50 dark:bg-zinc-700/50 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    [{id}]
                </p>
                {placeholderInfo && (
                    <>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs leading-relaxed">
                            {placeholderInfo.description}
                        </p>
                        <p className="text-xs text-zinc-400 mt-2 font-mono">
                            {placeholderInfo.dimensions}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
