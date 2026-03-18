'use client';

import React from 'react';
import type { IllustrationType } from '../lib/types';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Shared SVG props                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */
// Shared stroke props — no fill, so circles can set their own
const S = {
  stroke: '#6366f1',          // indigo-500
  strokeWidth: 3.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// For lines/paths that need fill:none
const LINE = { ...S, fill: 'none' };

const HEAD_FILL = '#e0e7ff'; // indigo-100

/** Thin vertical barre on the right side */
const Barre = () => (
  <>
    <line x1="88" y1="8" x2="88" y2="92" stroke="#c7d2fe" strokeWidth="4" strokeLinecap="round" />
    <line x1="82" y1="32" x2="88" y2="32" stroke="#c7d2fe" strokeWidth="3" strokeLinecap="round" />
  </>
);

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Individual pose components                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

/** 1. STANDING — slight sway side to side */
const Standing = () => (
  <g style={{ animation: 'sway 2s ease-in-out infinite' }}>
    <circle cx="50" cy="16" r="8" fill={HEAD_FILL} {...S} />
    {/* torso */}
    <line x1="50" y1="24" x2="50" y2="58" {...LINE} />
    {/* arms wide */}
    <line x1="50" y1="34" x2="22" y2="46" {...LINE} />
    <line x1="50" y1="34" x2="78" y2="46" {...LINE} />
    {/* legs wide stance */}
    <line x1="50" y1="58" x2="32" y2="88" {...LINE} />
    <line x1="50" y1="58" x2="68" y2="88" {...LINE} />
  </g>
);

/** 2. WARMUP_ARMS — arms circling overhead */
const WarmupArms = () => (
  <g>
    <circle cx="50" cy="18" r="8" fill={HEAD_FILL} {...S} />
    <line x1="50" y1="26" x2="50" y2="60" {...LINE} />
    {/* legs */}
    <line x1="50" y1="60" x2="35" y2="88" {...LINE} />
    <line x1="50" y1="60" x2="65" y2="88" {...LINE} />
    {/* left arm rotating */}
    <g style={{ transformOrigin: '50px 32px', animation: 'spinCCW 1.6s linear infinite' }}>
      <line x1="50" y1="32" x2="24" y2="14" {...LINE} />
      <circle cx="24" cy="14" r="3" fill="#6366f1" stroke="none" />
    </g>
    {/* right arm rotating (offset) */}
    <g style={{ transformOrigin: '50px 32px', animation: 'spinCW 1.6s linear infinite' }}>
      <line x1="50" y1="32" x2="76" y2="14" {...LINE} />
      <circle cx="76" cy="14" r="3" fill="#6366f1" stroke="none" />
    </g>
  </g>
);

/** 3. BARRE_KICK — leg kicking forward at barre */
const BarreKick = () => (
  <g>
    <Barre />
    <circle cx="48" cy="16" r="8" fill={HEAD_FILL} {...S} />
    {/* torso */}
    <line x1="48" y1="24" x2="48" y2="56" {...LINE} />
    {/* right arm to barre */}
    <line x1="48" y1="34" x2="82" y2="32" {...LINE} />
    {/* left arm out */}
    <line x1="48" y1="34" x2="24" y2="42" {...LINE} />
    {/* standing leg */}
    <line x1="48" y1="56" x2="52" y2="88" {...LINE} />
    {/* kicking leg */}
    <g style={{ transformOrigin: '48px 56px', animation: 'kick 1.8s ease-in-out infinite' }}>
      <line x1="48" y1="56" x2="16" y2="50" {...LINE} />
    </g>
  </g>
);

/** 4. BARRE_RELEVE — rising on toes */
const BarreReleve = () => (
  <g style={{ animation: 'riseUp 1.6s ease-in-out infinite' }}>
    <Barre />
    <circle cx="46" cy="15" r="8" fill={HEAD_FILL} {...S} />
    <line x1="46" y1="23" x2="46" y2="55" {...LINE} />
    {/* arm to barre */}
    <line x1="46" y1="32" x2="82" y2="32" {...LINE} />
    {/* free arm up */}
    <line x1="46" y1="32" x2="26" y2="16" {...LINE} />
    {/* legs together on toes */}
    <line x1="46" y1="55" x2="42" y2="84" {...LINE} />
    <line x1="46" y1="55" x2="50" y2="84" {...LINE} />
    {/* toe lines */}
    <line x1="38" y1="84" x2="46" y2="84" {...LINE} />
    <line x1="46" y1="84" x2="54" y2="84" {...LINE} />
  </g>
);

/** 5. BARRE_TENDU — leg sliding out to the side */
const BarreTendu = () => (
  <g>
    <Barre />
    <circle cx="48" cy="16" r="8" fill={HEAD_FILL} {...S} />
    <line x1="48" y1="24" x2="48" y2="56" {...LINE} />
    <line x1="48" y1="34" x2="82" y2="32" {...LINE} />
    <line x1="48" y1="34" x2="24" y2="40" {...LINE} />
    {/* standing leg */}
    <line x1="48" y1="56" x2="52" y2="88" {...LINE} />
    {/* tendu leg slides out */}
    <g style={{ transformOrigin: '48px 56px', animation: 'tendu 2s ease-in-out infinite' }}>
      <line x1="48" y1="56" x2="14" y2="72" {...LINE} />
    </g>
  </g>
);

/** 6. BARRE_PLIE — wide squat pulsing down */
const BarrePlie = () => (
  <g style={{ animation: 'plieDown 1.6s ease-in-out infinite' }}>
    <Barre />
    <circle cx="46" cy="18" r="8" fill={HEAD_FILL} {...S} />
    <line x1="46" y1="26" x2="46" y2="54" {...LINE} />
    <line x1="46" y1="34" x2="82" y2="32" {...LINE} />
    {/* free arm out */}
    <line x1="46" y1="34" x2="20" y2="28" {...LINE} />
    {/* wide bent legs */}
    <line x1="46" y1="54" x2="22" y2="72" {...LINE} />
    <line x1="22" y1="72" x2="18" y2="88" {...LINE} />
    <line x1="46" y1="54" x2="68" y2="72" {...LINE} />
    <line x1="68" y1="72" x2="66" y2="88" {...LINE} />
  </g>
);

/** 7. STANDING_KICKBACK — torso leaning, leg kicking back */
const StandingKickback = () => (
  <g>
    {/* torso tilted forward */}
    <circle cx="36" cy="20" r="8" fill={HEAD_FILL} {...S} />
    <line x1="36" y1="28" x2="46" y2="56" {...LINE} />
    {/* arms forward for balance */}
    <line x1="40" y1="38" x2="18" y2="34" {...LINE} />
    <line x1="40" y1="38" x2="62" y2="34" {...LINE} />
    {/* standing leg */}
    <line x1="46" y1="56" x2="44" y2="88" {...LINE} />
    {/* kicking leg back */}
    <g style={{ transformOrigin: '46px 56px', animation: 'kickBack 2s ease-in-out infinite' }}>
      <line x1="46" y1="56" x2="76" y2="44" {...LINE} />
    </g>
  </g>
);

/** 8. STANDING_CIRCLES — leg doing circles */
const StandingCircles = () => (
  <g>
    <circle cx="44" cy="16" r="8" fill={HEAD_FILL} {...S} />
    <line x1="44" y1="24" x2="44" y2="56" {...LINE} />
    <line x1="44" y1="34" x2="20" y2="42" {...LINE} />
    <line x1="44" y1="34" x2="68" y2="42" {...LINE} />
    {/* standing leg */}
    <line x1="44" y1="56" x2="42" y2="88" {...LINE} />
    {/* circling leg */}
    <g style={{ transformOrigin: '44px 60px', animation: 'legCircle 2s linear infinite' }}>
      <line x1="44" y1="60" x2="70" y2="72" {...LINE} />
      <circle cx="70" cy="72" r="3" fill="#6366f1" stroke="none" />
    </g>
  </g>
);

/** 9. STANDING_ARMS — bicep curls */
const StandingArms = () => (
  <g>
    <circle cx="50" cy="16" r="8" fill={HEAD_FILL} {...S} />
    <line x1="50" y1="24" x2="50" y2="58" {...LINE} />
    {/* legs */}
    <line x1="50" y1="58" x2="36" y2="88" {...LINE} />
    <line x1="50" y1="58" x2="64" y2="88" {...LINE} />
    {/* left arm curling */}
    <g style={{ transformOrigin: '50px 34px', animation: 'curlLeft 1.6s ease-in-out infinite' }}>
      <line x1="50" y1="34" x2="26" y2="40" {...LINE} />
      <line x1="26" y1="40" x2="28" y2="24" {...LINE} />
    </g>
    {/* right arm curling (offset) */}
    <g style={{ transformOrigin: '50px 34px', animation: 'curlRight 1.6s ease-in-out infinite 0.8s' }}>
      <line x1="50" y1="34" x2="74" y2="40" {...LINE} />
      <line x1="74" y1="40" x2="72" y2="24" {...LINE} />
    </g>
  </g>
);

/** 10. STANDING_LEAN_ARMS — torso leaning, arms reaching back */
const StandingLeanArms = () => (
  <g>
    <circle cx="36" cy="22" r="8" fill={HEAD_FILL} {...S} />
    {/* torso leaning */}
    <line x1="36" y1="30" x2="50" y2="58" {...LINE} />
    {/* arms back */}
    <g style={{ transformOrigin: '42px 40px', animation: 'reachBack 2s ease-in-out infinite' }}>
      <line x1="42" y1="40" x2="68" y2="32" {...LINE} />
      <line x1="42" y1="40" x2="72" y2="50" {...LINE} />
    </g>
    <line x1="50" y1="58" x2="44" y2="88" {...LINE} />
    <line x1="50" y1="58" x2="60" y2="88" {...LINE} />
  </g>
);

/** 11. FLOOR_DONKEY — on all fours, leg kicking up */
const FloorDonkey = () => (
  <g>
    {/* head */}
    <circle cx="18" cy="52" r="7" fill={HEAD_FILL} {...S} />
    {/* torso horizontal */}
    <line x1="24" y1="52" x2="62" y2="52" {...LINE} />
    {/* front arms down */}
    <line x1="28" y1="52" x2="26" y2="72" {...LINE} />
    <line x1="38" y1="52" x2="36" y2="72" {...LINE} />
    {/* back knee down */}
    <line x1="58" y1="52" x2="56" y2="72" {...LINE} />
    {/* kicking leg */}
    <g style={{ transformOrigin: '62px 52px', animation: 'donkeyKick 1.8s ease-in-out infinite' }}>
      <line x1="62" y1="52" x2="80" y2="36" {...LINE} />
    </g>
  </g>
);

/** 12. FLOOR_HYDRANT — on all fours, leg opening to side */
const FloorHydrant = () => (
  <g>
    <circle cx="18" cy="52" r="7" fill={HEAD_FILL} {...S} />
    <line x1="24" y1="52" x2="62" y2="52" {...LINE} />
    <line x1="28" y1="52" x2="26" y2="72" {...LINE} />
    <line x1="38" y1="52" x2="36" y2="72" {...LINE} />
    <line x1="58" y1="52" x2="56" y2="72" {...LINE} />
    {/* hydrant leg opens up/side */}
    <g style={{ transformOrigin: '62px 52px', animation: 'hydrant 2s ease-in-out infinite' }}>
      <line x1="62" y1="52" x2="82" y2="40" {...LINE} />
      <line x1="82" y1="40" x2="84" y2="58" {...LINE} />
    </g>
  </g>
);

/** 13. PLANK_CUBE — inclined plank on block */
const PlankCube = () => (
  <g style={{ animation: 'plankBounce 2s ease-in-out infinite' }}>
    {/* cube */}
    <rect x="10" y="70" width="14" height="12" rx="2" stroke="#6366f1" strokeWidth="2.5" fill="#e0e7ff" />
    {/* head */}
    <circle cx="18" cy="52" r="7" fill={HEAD_FILL} {...S} />
    {/* body diagonal */}
    <line x1="24" y1="56" x2="74" y2="72" {...LINE} />
    {/* arms to block */}
    <line x1="24" y1="56" x2="20" y2="70" {...LINE} />
    <line x1="34" y1="60" x2="30" y2="70" {...LINE} />
    {/* feet */}
    <line x1="74" y1="72" x2="76" y2="88" {...LINE} />
    <line x1="74" y1="72" x2="82" y2="86" {...LINE} />
  </g>
);

/** 14. PLANK_KNEES — mountain climber */
const PlankKnees = () => (
  <g>
    <circle cx="18" cy="46" r="7" fill={HEAD_FILL} {...S} />
    {/* body diagonal */}
    <line x1="24" y1="50" x2="74" y2="64" {...LINE} />
    {/* arms down */}
    <line x1="24" y1="50" x2="22" y2="68" {...LINE} />
    <line x1="36" y1="54" x2="34" y2="68" {...LINE} />
    {/* right leg back */}
    <line x1="74" y1="64" x2="82" y2="86" {...LINE} />
    {/* left knee driving in */}
    <g style={{ transformOrigin: '74px 64px', animation: 'mountainClimber 1.4s ease-in-out infinite' }}>
      <line x1="74" y1="64" x2="54" y2="68" {...LINE} />
      <line x1="54" y1="68" x2="52" y2="84" {...LINE} />
    </g>
  </g>
);

/** 15. BRIDGE_BALL — glute bridge with ball */
const BridgeBall = () => (
  <g style={{ animation: 'bridgeLift 1.8s ease-in-out infinite' }}>
    {/* head on ground */}
    <circle cx="78" cy="72" r="7" fill={HEAD_FILL} {...S} />
    {/* upper body flat */}
    <line x1="72" y1="72" x2="46" y2="72" {...LINE} />
    {/* arms flat */}
    <line x1="72" y1="72" x2="80" y2="84" {...LINE} />
    <line x1="60" y1="72" x2="58" y2="84" {...LINE} />
    {/* hips up */}
    <line x1="46" y1="72" x2="34" y2="54" {...LINE} />
    {/* upper legs */}
    <line x1="34" y1="54" x2="26" y2="72" {...LINE} />
    {/* lower legs vertical */}
    <line x1="26" y1="72" x2="24" y2="88" {...LINE} />
    <line x1="34" y1="54" x2="44" y2="72" {...LINE} />
    <line x1="44" y1="72" x2="42" y2="88" {...LINE} />
    {/* ball */}
    <circle cx="35" cy="66" r="6" stroke="#6366f1" strokeWidth="2.5" fill="#c7d2fe" />
  </g>
);

/** 16. BRIDGE_PULSES — smaller pulse bridge */
const BridgePulses = () => (
  <g style={{ animation: 'bridgePulse 0.8s ease-in-out infinite' }}>
    <circle cx="78" cy="74" r="7" fill={HEAD_FILL} {...S} />
    <line x1="72" y1="74" x2="46" y2="70" {...LINE} />
    <line x1="72" y1="74" x2="80" y2="86" {...LINE} />
    <line x1="60" y1="72" x2="58" y2="86" {...LINE} />
    {/* hips elevated */}
    <line x1="46" y1="70" x2="32" y2="56" {...LINE} />
    <line x1="32" y1="56" x2="24" y2="74" {...LINE} />
    <line x1="24" y1="74" x2="22" y2="88" {...LINE} />
    <line x1="32" y1="56" x2="44" y2="74" {...LINE} />
    <line x1="44" y1="74" x2="42" y2="88" {...LINE} />
  </g>
);

/** 17. ABS_CRUNCH — crunch with ring */
const AbsCrunch = () => (
  <g>
    {/* head rises */}
    <g style={{ animation: 'crunchUp 1.6s ease-in-out infinite' }}>
      <circle cx="68" cy="58" r="7" fill={HEAD_FILL} {...S} />
      {/* upper torso */}
      <line x1="62" y1="62" x2="46" y2="68" {...LINE} />
      {/* arms holding ring */}
      <line x1="54" y1="65" x2="44" y2="58" {...LINE} />
      <line x1="54" y1="65" x2="62" y2="56" {...LINE} />
      {/* ring */}
      <ellipse cx="53" cy="57" rx="10" ry="7" stroke="#6366f1" strokeWidth="2.5" fill="none" />
    </g>
    {/* lower body static */}
    <line x1="46" y1="68" x2="36" y2="52" {...LINE} />
    <line x1="36" y1="52" x2="22" y2="68" {...LINE} />
    <line x1="46" y1="68" x2="56" y2="52" {...LINE} />
    <line x1="56" y1="52" x2="70" y2="66" {...LINE} />
  </g>
);

/** 18. ABS_SCISSORS — leg scissors */
const AbsScissors = () => (
  <g>
    <circle cx="76" cy="60" r="7" fill={HEAD_FILL} {...S} />
    {/* torso flat */}
    <line x1="70" y1="64" x2="40" y2="68" {...LINE} />
    {/* arms behind head */}
    <line x1="70" y1="60" x2="80" y2="54" {...LINE} />
    <line x1="70" y1="60" x2="82" y2="66" {...LINE} />
    {/* scissoring legs */}
    <g style={{ transformOrigin: '40px 68px', animation: 'scissorUp 1.4s ease-in-out infinite' }}>
      <line x1="40" y1="68" x2="14" y2="56" {...LINE} />
    </g>
    <g style={{ transformOrigin: '40px 68px', animation: 'scissorDown 1.4s ease-in-out infinite' }}>
      <line x1="40" y1="68" x2="14" y2="72" {...LINE} />
    </g>
  </g>
);

/** 19. STRETCH_PIGEON — pigeon pose, folding forward */
const StretchPigeon = () => (
  <g>
    {/* head folds forward */}
    <g style={{ animation: 'pigeonFold 3s ease-in-out infinite' }}>
      <circle cx="50" cy="32" r="7" fill={HEAD_FILL} {...S} />
      <line x1="50" y1="40" x2="46" y2="58" {...LINE} />
      {/* arms reaching forward */}
      <line x1="48" y1="48" x2="20" y2="58" {...LINE} />
      <line x1="48" y1="48" x2="22" y2="68" {...LINE} />
    </g>
    {/* front bent leg */}
    <line x1="46" y1="58" x2="24" y2="66" {...LINE} />
    <line x1="24" y1="66" x2="42" y2="76" {...LINE} />
    {/* back extended leg */}
    <line x1="46" y1="58" x2="76" y2="64" {...LINE} />
    <line x1="76" y1="64" x2="88" y2="78" {...LINE} />
  </g>
);

/** 20. STRETCH_CHILD — child's pose */
const StretchChild = () => (
  <g style={{ animation: 'breathe 4s ease-in-out infinite' }}>
    {/* head down */}
    <circle cx="20" cy="64" r="7" fill={HEAD_FILL} {...S} />
    {/* back/torso forward */}
    <line x1="26" y1="62" x2="62" y2="56" {...LINE} />
    {/* arms stretched forward */}
    <line x1="26" y1="62" x2="12" y2="76" {...LINE} />
    <line x1="20" y1="60" x2="10" y2="54" {...LINE} />
    {/* hips back */}
    <line x1="62" y1="56" x2="68" y2="70" {...LINE} />
    {/* thighs folded */}
    <line x1="68" y1="70" x2="62" y2="82" {...LINE} />
    <line x1="68" y1="70" x2="74" y2="82" {...LINE} />
    {/* feet */}
    <line x1="62" y1="82" x2="58" y2="88" {...LINE} />
    <line x1="74" y1="82" x2="76" y2="88" {...LINE} />
  </g>
);

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Pose map                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
const POSES: Record<IllustrationType, React.ReactNode> = {
  standing:           <Standing />,
  warmup_arms:        <WarmupArms />,
  barre_kick:         <BarreKick />,
  barre_releve:       <BarreReleve />,
  barre_tendu:        <BarreTendu />,
  barre_plie:         <BarrePlie />,
  standing_kickback:  <StandingKickback />,
  standing_circles:   <StandingCircles />,
  standing_arms:      <StandingArms />,
  standing_lean_arms: <StandingLeanArms />,
  floor_donkey:       <FloorDonkey />,
  floor_hydrant:      <FloorHydrant />,
  plank_cube:         <PlankCube />,
  plank_knees:        <PlankKnees />,
  bridge_ball:        <BridgeBall />,
  bridge_pulses:      <BridgePulses />,
  abs_crunch:         <AbsCrunch />,
  abs_scissors:       <AbsScissors />,
  stretch_pigeon:     <StretchPigeon />,
  stretch_child:      <StretchChild />,
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
const BarreIllustrator = ({ type }: { type?: IllustrationType }) => {
  const pose = type ? POSES[type] : null;

  return (
    <div className="w-full h-full flex items-center justify-center p-1">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        aria-hidden="true"
      >
        {pose ?? (
          /* fallback */
          <g>
            <circle cx="50" cy="16" r="8" fill={HEAD_FILL} {...S} />
            <line x1="50" y1="24" x2="50" y2="58" {...LINE} />
            <line x1="50" y1="34" x2="26" y2="44" {...LINE} />
            <line x1="50" y1="34" x2="74" y2="44" {...LINE} />
            <line x1="50" y1="58" x2="34" y2="88" {...LINE} />
            <line x1="50" y1="58" x2="66" y2="88" {...LINE} />
          </g>
        )}
      </svg>
    </div>
  );
};

export default BarreIllustrator;
