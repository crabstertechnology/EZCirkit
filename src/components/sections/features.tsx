import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FEATURES } from '@/lib/features';

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <Card className="group relative overflow-hidden text-center transition-all duration-300 hover:-translate-y-3 hover:shadow-xl">
      <div className="absolute top-0 h-1 w-full bg-primary-gradient scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"></div>
      <CardHeader className="items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-gradient text-white transition-transform duration-500 group-hover:rotate-[360deg]">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <CardTitle className="text-xl font-headline">{title}</CardTitle>
        <p className="text-foreground/70">{description}</p>
      </CardContent>
    </Card>
  );
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold font-headline">
            Why Choose EZCirkit?
          </h2>
          <p className="mt-4 text-lg text-foreground/70">
            Everything you need to embark on your electronics journey, packed
            into one powerful kit.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
