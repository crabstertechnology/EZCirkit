
'use client';

import React from 'react';

const StatsSection = ({ averageRating, isLoading }: { averageRating: number; isLoading: boolean }) => {
  
  const STATS = [
    { value: '50+', label: 'Tutorials' },
    { value: '35+', label: 'Components' },
    { value: '45+', label: 'Projects' },
    { value: isLoading ? '...' : `${averageRating.toFixed(1)}★`, label: 'Rating' },
  ];

  return (
    <section className="bg-primary-gradient text-white py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((stat, index) => (
            <div key={index}>
              <h3 className="text-3xl md:text-4xl font-bold">{stat.value}</h3>
              <p className="text-sm md:text-base opacity-80">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
