import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';

interface DraggableWidgetWrapperProps {
    id: string;
    children: React.ReactNode;
    editMode: boolean;
    onRemove: (id: string) => void;
    className?: string; // For col-span classes
}

export default function DraggableWidgetWrapper({
    id,
    children,
    editMode,
    onRemove,
    className = ''
}: DraggableWidgetWrapperProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative group h-full ${className} ${editMode ? 'ring-2 ring-transparent hover:ring-primary-100 rounded-2xl' : ''}`}
        >
            {/* Content */}
            <div className="h-full">
                {children}
            </div>

            {/* Edit Mode Overlays */}
            {editMode && (
                <>
                    {/* Drag Handle */}
                    <div
                        {...attributes}
                        {...listeners}
                        className="absolute top-2 left-2 p-1.5 bg-white shadow-md rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-50 text-gray-400 hover:text-gray-600 border border-gray-100 transition-opacity z-20"
                    >
                        <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Remove Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(id);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-white shadow-md rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 border border-gray-100 transition-all z-20"
                        title="Ta bort widget"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Overlay to prevent interaction with widget content while editing */}
                    <div className="absolute inset-0 z-10 bg-transparent" />
                </>
            )}
        </div>
    );
}
