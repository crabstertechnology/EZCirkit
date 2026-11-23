'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface TourStep {
  target: string | null;
  category: string;
  title: string;
  description: string;
  note?: string;
}

const EXPERIMENT_TOUR_STEPS: TourStep[] = [
  {
    target: null,
    category: 'Getting Started',
    title: 'Welcome to Coding Experiments',
    description: 'Explore hands-on Arduino electronics and coding experiments. Each project comes with step-by-step circuit wiring instructions, component requirements, and interactive coding.',
    note: 'Everything runs directly in your browser without requiring desktop Arduino IDE or driver installations.'
  },
  {
    target: '#tour-search-bar',
    category: 'Search & Discovery',
    title: 'Instant Search',
    description: 'Quickly find projects by sensor name, actuator, or keyword (such as "IR Sensor", "Servo", "DHT11", "Buzzer", or "Water Pump").',
    note: 'Search filters across both project titles and full descriptions in real time.'
  },
  {
    target: '#tour-launch-ide',
    category: 'Web IDE',
    title: 'Launch Web IDE Directly',
    description: 'Open the browser-based Arduino Web IDE with a clean workspace. Use this to write your own custom sketches, test code, or build personal Arduino projects.',
    note: 'Connect your Arduino Uno via USB to compile in the cloud and upload with zero software installation.'
  },
  {
    target: '#tour-chapter-filter',
    category: 'Curriculum Navigation',
    title: 'Filter by Chapter',
    description: 'Organize experiments by curriculum chapter to follow a progressive learning path from basic digital I/O to advanced sensors and displays.',
    note: 'Select "All Chapters" to view the complete curriculum at once.'
  },
  {
    target: '#tour-first-card',
    category: 'Experiments',
    title: 'Preloaded Coding Experiments',
    description: 'Clicking any coding experiment card directly opens the Web IDE with the circuit diagram, working code, precompiled binary, and video tutorial already loaded.',
    note: 'Items with a "Video Guide" badge open an introductory walkthrough video, while coding experiments launch the Web IDE directly.'
  }
];

interface ExperimentsTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExperimentsTour({ isOpen, onClose }: ExperimentsTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({ display: 'none' });
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});

  const updatePosition = useCallback((stepIndex: number) => {
    const step = EXPERIMENT_TOUR_STEPS[stepIndex];
    if (!step) return;

    if (!step.target) {
      setSpotlightStyle({ display: 'none' });
      setCardStyle({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    const el = document.querySelector(step.target);
    if (!el) {
      setSpotlightStyle({ display: 'none' });
      setCardStyle({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const padding = 8;
    const spotTop = Math.max(0, rect.top - padding);
    const spotLeft = Math.max(0, rect.left - padding);
    const spotWidth = rect.width + padding * 2;
    const spotHeight = rect.height + padding * 2;

    setSpotlightStyle({
      display: 'block',
      top: `${spotTop}px`,
      left: `${spotLeft}px`,
      width: `${spotWidth}px`,
      height: `${spotHeight}px`,
    });

    const cardWidth = Math.min(400, window.innerWidth - 32);
    const cardHeight = 280;

    let top: number;
    let left: number;

    if (rect.top < window.innerHeight / 2) {
      top = rect.bottom + 16;
      left = rect.left + rect.width / 2 - cardWidth / 2;
    } else {
      top = rect.top - cardHeight - 16;
      left = rect.left + rect.width / 2 - cardWidth / 2;
    }

    if (left < 16) left = 16;
    if (left + cardWidth > window.innerWidth - 16) {
      left = window.innerWidth - cardWidth - 16;
    }

    if (top < 16) top = 16;
    if (top + cardHeight > window.innerHeight - 16) {
      top = window.innerHeight - cardHeight - 16;
    }

    setCardStyle({
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none',
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition(currentStep);

    const handleResize = () => updatePosition(currentStep);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') {
        if (currentStep < EXPERIMENT_TOUR_STEPS.length - 1) {
          setCurrentStep((prev) => prev + 1);
        } else {
          onClose();
        }
      }
      if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          setCurrentStep((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentStep, updatePosition, onClose]);

  if (!isOpen) return null;

  const step = EXPERIMENT_TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-auto transition-opacity duration-300">
      {/* Dark semi-transparent backdrop */}
      <div 
        className="fixed inset-0 bg-black/45" 
        onClick={onClose} 
      />

      {/* Spotlight cutout */}
      <div
        className="fixed rounded-xl border-2 border-zinc-950 pointer-events-none transition-all duration-300 z-[100000]"
        style={{
          ...spotlightStyle,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
        }}
      />

      {/* Tour Card (Clean White & Black) */}
      <div
        className="fixed z-[100001] w-[400px] max-w-[calc(100vw-32px)] bg-white text-zinc-900 border border-zinc-200 rounded-2xl p-5 shadow-2xl transition-all duration-300 font-sans"
        style={cardStyle}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="bg-zinc-100 text-zinc-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-zinc-200">
              Step {currentStep + 1} of {EXPERIMENT_TOUR_STEPS.length}
            </span>
            <span className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider">
              {step.category}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-900 p-1 rounded-md transition-colors cursor-pointer"
            title="Exit Tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4">
          <h3 className="text-base font-bold text-zinc-900 mb-1.5 tracking-tight">
            {step.title}
          </h3>
          <p className="text-[13px] text-zinc-600 leading-relaxed mb-3">
            {step.description}
          </p>

          {step.note && (
            <div className="bg-zinc-50 border border-zinc-200 border-l-[3px] border-l-zinc-900 rounded-lg p-2.5 text-xs text-zinc-700 leading-relaxed">
              <strong className="text-zinc-900 font-bold">Note:</strong> {step.note}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3.5 border-t border-zinc-100">
          <div className="flex items-center gap-1.5">
            {EXPERIMENT_TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-1.5 rounded-full cursor-pointer transition-all ${
                  i === currentStep ? 'w-4 bg-zinc-900' : 'w-1.5 bg-zinc-200 hover:bg-zinc-300'
                }`}
                title={`Step ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="bg-white hover:bg-zinc-100 text-black border-zinc-200 text-xs font-semibold h-8 px-3 rounded-lg cursor-pointer"
              >
                Back
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => {
                if (currentStep < EXPERIMENT_TOUR_STEPS.length - 1) {
                  setCurrentStep((prev) => prev + 1);
                } else {
                  onClose();
                }
              }}
              className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold h-8 px-3.5 rounded-lg cursor-pointer"
            >
              {currentStep === EXPERIMENT_TOUR_STEPS.length - 1 ? 'Finish' : 'Next Step'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
