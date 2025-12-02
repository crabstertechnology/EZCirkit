'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PolicySection {
  title: string;
  content: string[];
}

interface PolicyPageProps {
  pageTitle: string;
  lastUpdated: string;
  sections: PolicySection[];
}

const PolicyPage: React.FC<PolicyPageProps> = ({ pageTitle, lastUpdated, sections }) => {
  return (
    <div className="container mx-auto px-4 md:px-6 py-24 md:py-32">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-extrabold">{pageTitle}</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          </CardHeader>
          <CardContent className="space-y-8">
            {sections.map((section, index) => (
              <div key={index}>
                <h2 className="text-2xl font-semibold mb-4">{section.title}</h2>
                <div className="space-y-4 text-muted-foreground">
                    {section.content.map((paragraph, pIndex) => (
                        <p key={pIndex}>{paragraph}</p>
                    ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PolicyPage;
