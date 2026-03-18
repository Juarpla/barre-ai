import React from 'react';

const BarreIllustrator = ({ type }: { type?: string }) => {
  const commonProps = {
    stroke: 'currentColor',
    strokeWidth: '3',
    fill: 'none',
    strokeLinecap: 'round' as const,
  };
  const head = <circle cx="50" cy="20" r="7" {...commonProps} />;

  const renderIcon = () => {
    switch (type) {
      case 'standing':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full text-pink-500">
            {head}
            <path d="M50 27 L50 55 L30 85 M50 55 L70 85" {...commonProps} />
            <path d="M50 35 L20 30 M50 35 L85 20" {...commonProps} />
          </svg>
        );
      case 'warmup_arms':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full text-pink-400">
            {head}
            <path d="M50 27 L50 70 L40 95 M50 70 L60 95" {...commonProps} />
            <path d="M50 35 Q30 20 20 40 M50 35 Q70 20 80 40" {...commonProps} />
          </svg>
        );
      case 'barre_kick':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-500">
            <rect x="85" y="10" width="3" height="80" className="fill-slate-300" />
            <path d="M85 35 L60 35" stroke="lightgray" strokeWidth="2" />
            {head}
            <path d="M50 27 L50 60 L45 95 M50 60 L85 60" {...commonProps} />
            <path d="M50 35 L60 35" {...commonProps} />
          </svg>
        );
      case 'barre_releve':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-600">
            <rect x="85" y="10" width="3" height="80" className="fill-slate-300" />
            {head}
            <path d="M50 27 L50 60 L45 92 M50 60 L55 92" {...commonProps} />
            <path d="M50 35 L75 15 M50 35 L85 35" {...commonProps} />
            <path d="M43 92 L47 92 M53 92 L57 92" strokeWidth="4" stroke="currentColor" />
          </svg>
        );
      case 'standing_kickback':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full text-purple-500">
            <circle cx="60" cy="30" r="7" {...commonProps} />
            <path d="M60 37 L50 60 L45 95 M50 60 L15 65" {...commonProps} />
            <path d="M60 42 L40 42" {...commonProps} />
          </svg>
        );
      case 'standing_circles':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full text-purple-600">
            <circle cx="60" cy="30" r="7" {...commonProps} />
            <path d="M60 37 L55 65 L50 95 M55 65 L25 80" {...commonProps} />
            <circle cx="20" cy="82" r="6" stroke="currentColor" strokeWidth="1" strokeDasharray="2" />
          </svg>
        );
      case 'barre_tendu':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full text-blue-500">
            {head}
            <path d="M50 27 L50 60 L40 95 M50 60 L85 95" {...commonProps} />
            <path d="M50 35 L20 40 M50 35 L80 40" {...commonProps} />
          </svg>
        );
      case 'floor_donkey':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full text-emerald-500">
            <circle cx="70" cy="45" r="7" {...commonProps} />
            <path d="M70 52 L40 52 L40 85 M40 52 L15 52 L15 85" {...commonProps} />
            <path d="M40 85 L25 85 M15 85 L5 85" {...commonProps} />
            <path d="M40 52 Q50 30 65 20" {...commonProps} stroke="orange" />
          </svg>
        );
      case 'plank_cube':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full text-teal-600">
            <rect x="70" y="75" width="20" height="10" rx="2" fill="currentColor" opacity="0.2" />
            <circle cx="20" cy="35" r="7" {...commonProps} />
            <path d="M25 40 L80 60 L95 85 M80 60 L75 75" {...commonProps} />
          </svg>
        );
      case 'bridge_ball':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full text-orange-500">
            <circle cx="15" cy="75" r="7" {...commonProps} />
            <path d="M22 75 L55 45 L85 75" {...commonProps} />
            <circle cx="68" cy="62" r="5" fill="orange" opacity="0.5" />
          </svg>
        );
      case 'abs_scissors':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full text-red-500">
            <circle cx="30" cy="70" r="7" {...commonProps} />
            <path d="M37 75 L70 75 L90 40 M70 75 L95 70" {...commonProps} />
          </svg>
        );
      case 'stretch_pigeon':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full text-green-600">
            <circle cx="40" cy="80" r="7" {...commonProps} />
            <path d="M47 85 L85 85 M35 85 L10 85" {...commonProps} />
            <path d="M40 73 L55 60 L80 60" {...commonProps} />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full text-slate-400">
            {head}
            <path d="M50 27 L50 70 L35 95 M50 70 L65 95" {...commonProps} />
            <path d="M50 35 L25 45 M50 35 L75 45" {...commonProps} />
          </svg>
        );
    }
  };

  return <div className="w-full h-full flex items-center justify-center p-2">{renderIcon()}</div>;
};

export default BarreIllustrator;
