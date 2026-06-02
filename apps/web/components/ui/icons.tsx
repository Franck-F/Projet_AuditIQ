import {
  Sparkles,
  Flag,
  Database,
  Users,
  Scale,
  Zap,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  ArrowRight,
  Home,
  Activity,
  FileText,
  Lightbulb,
  Target,
  Shield,
  Settings,
  HelpCircle,
  Plus,
  type LucideProps,
} from 'lucide-react';

import * as React from 'react';

type IconComponent = React.FC<LucideProps>;

interface IconWrapperProps extends LucideProps {
  size?: number;
}

function wrap(Component: IconComponent): React.FC<IconWrapperProps> {
  const Wrapped: React.FC<IconWrapperProps> = ({ size = 16, ...rest }) => (
    <Component size={size} strokeWidth={1.75} {...rest} />
  );
  Wrapped.displayName = Component.displayName ?? Component.name ?? 'Icon';
  return Wrapped;
}

export const Icons = {
  sparkle: wrap(Sparkles),
  flag: wrap(Flag),
  database: wrap(Database),
  users: wrap(Users),
  scale: wrap(Scale),
  zap: wrap(Zap),
  search: wrap(Search),
  bell: wrap(Bell),
  sun: wrap(Sun),
  moon: wrap(Moon),
  chevronDown: wrap(ChevronDown),
  logOut: wrap(LogOut),
  arrowR: wrap(ArrowRight),
  home: wrap(Home),
  activity: wrap(Activity),
  fileText: wrap(FileText),
  lightbulb: wrap(Lightbulb),
  target: wrap(Target),
  shield: wrap(Shield),
  settings: wrap(Settings),
  helpCircle: wrap(HelpCircle),
  plus: wrap(Plus),
} as const;
