"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface ImageLightboxProps {
    images: string[];
    currentIndex: number;
    isOpen: boolean;
    onClose: () => void;
    onDownload?: (url: string, index: number) => void;
}

export default function ImageLightbox({ images, currentIndex, isOpen, onClose, onDownload }: ImageLightboxProps) {
    const [activeIndex, setActiveIndex] = useState(currentIndex);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setActiveIndex(currentIndex);
        setZoomLevel(1);
        setPosition({ x: 0, y: 0 });
    }, [currentIndex, isOpen]);

    // Keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    handlePrevious();
                    break;
                case 'ArrowRight':
                    handleNext();
                    break;
                case '+':
                case '=':
                    handleZoomIn();
                    break;
                case '-':
                    handleZoomOut();
                    break;
                case '0':
                    handleReset();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, activeIndex]);

    const handleNext = useCallback(() => {
        if (activeIndex < images.length - 1) {
            setActiveIndex(prev => prev + 1);
            setZoomLevel(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [activeIndex, images.length]);

    const handlePrevious = useCallback(() => {
        if (activeIndex > 0) {
            setActiveIndex(prev => prev - 1);
            setZoomLevel(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [activeIndex]);

    const handleZoomIn = () => {
        setZoomLevel(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleFitToScreen = () => {
        setZoomLevel(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleReset = () => {
        setZoomLevel(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleDownloadClick = async () => {
        const imageUrl = images[activeIndex];
        if (onDownload) {
            onDownload(imageUrl, activeIndex);
        } else {
            // Default download implementation
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `gold-photo-${Date.now()}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Download failed:', error);
                alert('Failed to download image');
            }
        }
    };

    // Mouse drag handlers for panning when zoomed
    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoomLevel > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && zoomLevel > 1) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    if (!isOpen || images.length === 0) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white backdrop-blur-md"
                title="Close (ESC)"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Download button */}
            <button
                onClick={handleDownloadClick}
                className="absolute top-4 right-20 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white backdrop-blur-md"
                title="Download"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </button>

            {/* Image counter */}
            {images.length > 1 && (
                <div className="absolute top-4 left-4 z-50 px-4 py-2 bg-white/10 rounded-full text-white text-sm backdrop-blur-md">
                    {activeIndex + 1} / {images.length}
                </div>
            )}

            {/* Previous button */}
            {images.length > 1 && activeIndex > 0 && (
                <button
                    onClick={handlePrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-4 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white backdrop-blur-md"
                    title="Previous (←)"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            )}

            {/* Next button */}
            {images.length > 1 && activeIndex < images.length - 1 && (
                <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-4 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white backdrop-blur-md"
                    title="Next (→)"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}

            {/* Image container */}
            <div
                className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <img
                    src={images[activeIndex]}
                    alt={`Gold photo ${activeIndex + 1}`}
                    className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
                    style={{
                        transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
                        cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                    }}
                    draggable={false}
                />
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full p-2">
                <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 0.5}
                    className="p-3 hover:bg-white/20 rounded-full transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom Out (-)"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>

                <span className="px-4 py-2 text-white text-sm font-medium min-w-[80px] text-center">
                    {Math.round(zoomLevel * 100)}%
                </span>

                <button
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 3}
                    className="p-3 hover:bg-white/20 rounded-full transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom In (+)"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>

                <div className="w-px h-8 bg-white/20 mx-2"></div>

                <button
                    onClick={handleFitToScreen}
                    className="px-4 py-2 hover:bg-white/20 rounded-full transition-all text-white text-sm font-medium"
                    title="Fit to Screen"
                >
                    Fit
                </button>

                <button
                    onClick={handleReset}
                    className="px-4 py-2 hover:bg-white/20 rounded-full transition-all text-white text-sm font-medium"
                    title="Reset (0)"
                >
                    Reset
                </button>
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 text-white/60 text-xs text-center">
                Use arrow keys to navigate • +/- to zoom • ESC to close
            </div>
        </div>
    );
}
