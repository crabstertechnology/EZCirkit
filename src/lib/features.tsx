import {
  BookOpen,
  Box,
  Cpu,
  HeartHandshake,
  Wrench,
  Award,
} from 'lucide-react';

export const FEATURES = [
  {
    icon: <HeartHandshake className="h-8 w-8" />,
    title: 'Beginner Friendly',
    description: 'Designed for absolute beginners with no prior experience.',
  },
  {
    icon: <BookOpen className="h-8 w-8" />,
    title: 'Detailed Manuals',
    description: 'Clear, step-by-step instructions for every project.',
  },
  {
    icon: <Box className="h-8 w-8" />,
    title: 'Complete Kit',
    description: 'All necessary components included to get started right away.',
  },
  {
    icon: <Cpu className="h-8 w-8" />,
    title: 'Build Real Projects',
    description: 'Create fun and practical gadgets you can actually use.',
  },
  {
    icon: <Wrench className="h-8 w-8" />,
    title: 'Expert Support',
    description: 'Get help from our friendly experts whenever you are stuck.',
  },
  {
    icon: <Award className="h-8 w-8" />,
    title: 'Quality Assured',
    description: 'High-quality components for a reliable learning experience.',
  },
];
