/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Info, Egg, Flame, Save, Check, Bell, BellOff } from 'lucide-react';

// Egg Size Presets
const EGG_PRESETS = [
  { id: 'small', label: '소란 (42g)', weight: 42 },
  { id: 'medium', label: '중란 (50g)', weight: 50 },
  { id: 'large', label: '대란 (58g)', weight: 58 },
  { id: 'xlarge', label: '특대란 (66g)', weight: 66 },
  { id: 'king', label: '왕란 (74g)', weight: 74 },
];

const getScale = (weight: number) => {
  // 60g is base scale 1.0
  return weight / 60;
};

// Doneness Constants
const DONENESS_LEVELS = [
  { label: '흐르는 반숙', time: 330 },
  { label: '주르륵 반숙', time: 360 }, 
  { label: '촉촉한 반숙', time: 420 }, 
  { label: '완벽한 반숙', time: 450 },
  { label: '쫀득한 반숙', time: 480 }, 
  { label: '반완숙', time: 540 }, 
  { label: '부드러운 완숙', time: 630 }, 
  { label: '단단한 완숙', time: 720 }, 
];

const STORAGE_KEY = 'egg_timer_prefs';

const FUN_MESSAGES = [
  "점점 맛있어지고 있어요! 🥚",
  "노른자가 쫀득해지는 중... 🔥",
  "흰자가 단단해지고 있어요! ✨",
  "거의 다 왔습니다! ⏳",
  "맛있는 냄새가 여기까지 나요! 😋",
  "최고의 계란이 탄생하기 직전! 🚀"
];

// Sound URLs
const ALARM_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const BOILING_SOUND_URL = "https://www.soundjay.com/nature/sounds/boiling-water-01.mp3";

// Egg Icon Component for the Button
const EggButtonIcon = ({ isFinished, doneness, isActive, size = 36 }: { isFinished: boolean; doneness: number; isActive: boolean; size?: number }) => {
  const isSoftBoiled = doneness <= 1; // "흐르는 반숙" or "주르륵 반숙"
  
  return (
    <motion.div 
      className="relative flex items-center justify-center"
      animate={isFinished ? { rotate: -25, y: 1 } : isActive ? { scale: [1, 1.03, 1] } : { rotate: 0, y: 0 }}
      transition={isActive ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      <svg width={size} height={size} viewBox="0 0 32 32">
        {/* Egg Shape - Removed stroke to avoid "dots" */}
        <path 
          d="M16,4 C10,4 6,12 6,20 C6,26 10,30 16,30 C22,30 26,26 26,20 C26,12 22,4 16,4 Z" 
          fill="white" 
        />
        
        {/* Runny Yolk for Soft Boiled - Further Reduced */}
        {isFinished && isSoftBoiled && (
          <motion.path 
            d="M16,20 Q16,25 14,25" 
            fill="none" 
            stroke="#F1C40F" 
            strokeWidth="2.5" 
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
          />
        )}
        
        {/* Standard Yolk */}
        {isFinished && (
          <motion.circle 
            cx="16" 
            cy="20" 
            r="5" 
            fill={isSoftBoiled ? "#F39C12" : "#F1C40F"}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          />
        )}
      </svg>
    </motion.div>
  );
};

export default function App() {
  const [weight, setWeight] = useState(60); 
  const [doneness, setDoneness] = useState(1); 
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [eggMessage, setEggMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const boilingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio(ALARM_SOUND_URL);
    
    const boilingAudio = new Audio(BOILING_SOUND_URL);
    boilingAudio.loop = true;
    boilingAudioRef.current = boilingAudio;
  }, []);

  // Handle Boiling Sound
  useEffect(() => {
    if (isActive && !isMuted && !isFinished) {
      boilingAudioRef.current?.play().catch(e => console.log("Boiling sound blocked", e));
    } else {
      boilingAudioRef.current?.pause();
    }
  }, [isActive, isMuted, isFinished]);

  // Load preferences
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { weight: w, doneness: d } = JSON.parse(saved);
        if (w) setWeight(w);
        setDoneness(d);
      } catch (e) {
        console.error('Failed to load preferences', e);
      }
    }
  }, []);

  const savePreferences = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ weight, doneness }));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const calculateTime = () => {
    const baseTime = DONENESS_LEVELS[doneness].time;
    const sizeScale = getScale(weight);
    const adjustedTime = baseTime * sizeScale; 
    return Math.floor(adjustedTime);
  };

  useEffect(() => {
    if (!isActive && !isFinished) {
      const newTime = calculateTime();
      setTimeLeft(newTime);
      setTotalTime(newTime);
    }
  }, [weight, doneness]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleFinish();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handleFinish = () => {
    setIsActive(false);
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isMuted && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Audio play blocked", e));
    }
    setEggMessage("완성되었습니다! 맛있게 드세요! 🎉");
  };

  const toggleTimer = () => {
    if (isFinished) {
      resetTimer();
    } else {
      setIsActive(!isActive);
    }
  };
  
  const resetTimer = () => {
    setIsActive(false);
    setIsFinished(false);
    const newTime = calculateTime();
    setTimeLeft(newTime);
    setTotalTime(newTime);
    setEggMessage("");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleEggClick = () => {
    if (isFinished) {
      setEggMessage("냠냠! 정말 맛있어 보여요! 🍴");
    } else if (!isActive) {
      setEggMessage("타이머를 시작하면 요리가 시작돼요! 🍳");
    } else {
      const randomMsg = FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)];
      setEggMessage(randomMsg);
    }
    
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(() => setEggMessage(""), 3000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;

  return (
    <div className="h-screen bg-[#FDFBF7] text-[#4A4238] font-sans selection:bg-blue-100/50 overflow-hidden antialiased select-none">
      <main className="max-w-6xl mx-auto h-screen flex flex-col md:grid md:grid-cols-3 md:divide-x divide-[#E8E2D9] relative overflow-hidden">
        
        {/* Left Section: Controls (Desktop Only) */}
        <section className="hidden md:flex p-8 flex-col justify-center space-y-8 relative z-20 bg-transparent">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xs uppercase tracking-widest font-semibold text-[#A89F91] flex items-center gap-2">
                <Egg size={14} /> Egg Configuration
              </h2>
            </div>
            
            <div className="flex flex-col gap-4">
              {/* Preset Buttons */}
              <div className="space-y-2">
                <label className="text-sm font-medium uppercase tracking-wider">크기 프리셋</label>
                <div className="flex flex-wrap gap-2">
                  {EGG_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setWeight(preset.weight)}
                      disabled={isActive || isFinished}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        weight === preset.weight
                          ? 'bg-[#D4A373] text-white border-[#D4A373]'
                          : 'bg-white text-[#4A4238] border-[#E8E2D9] hover:border-[#D4A373]'
                      } disabled:opacity-50`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-medium uppercase tracking-wider">크기 조절 (무게)</label>
                  <span className="text-[10px] font-mono bg-[#E8E2D9] px-1.5 py-0.5 rounded">
                    {weight}g
                  </span>
                </div>
                <input
                  type="range"
                  min="35"
                  max="85"
                  step="1"
                  value={weight}
                  onChange={(e) => setWeight(parseInt(e.target.value))}
                  disabled={isActive || isFinished}
                  className="w-full h-1 bg-[#E8E2D9] rounded-lg appearance-none cursor-pointer accent-[#D4A373] disabled:opacity-50"
                />
              </div>

              {/* Doneness Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-medium uppercase tracking-wider">익힘 정도</label>
                  <span className="text-[10px] font-mono bg-[#E8E2D9] px-1.5 py-0.5 rounded">
                    {DONENESS_LEVELS[doneness].label}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={DONENESS_LEVELS.length - 1}
                  step="1"
                  value={doneness}
                  onChange={(e) => setDoneness(parseInt(e.target.value))}
                  disabled={isActive || isFinished}
                  className="w-full h-1 bg-[#E8E2D9] rounded-lg appearance-none cursor-pointer accent-[#D4A373] disabled:opacity-50"
                />
              </div>
            </div>

            <button
              onClick={savePreferences}
              disabled={isActive || isFinished}
              className="w-full py-3 px-4 rounded-xl border border-[#D4A373] text-[#D4A373] text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#D4A373] hover:text-white transition-all active:scale-[0.98] disabled:opacity-30"
            >
              {isSaved ? <Check size={14} /> : <Save size={14} />}
              {isSaved ? '저장됨' : '설정 저장하기'}
            </button>
          </div>

          <div className="bg-[#FFF4E0] p-4 rounded-2xl border border-[#FFE4B5] gap-3 flex items-start">
            <Info className="text-[#D4A373] shrink-0 mt-0.5" size={18} />
            <p className="text-[11px] leading-relaxed text-[#8B7355]">
              <strong className="block mb-1">끓는 물에서 시작하세요!</strong>
              물이 팔팔 끓기 시작할 때 달걀을 조심스럽게 넣어주세요. 
              냉장고에서 바로 꺼낸 달걀은 깨지기 쉬우니 주의하세요.
            </p>
          </div>
        </section>

        {/* Center Section: Visualization & Mobile Controls */}
        <section className="absolute inset-0 md:relative md:h-full flex items-center justify-center bg-[#F0F7FF] overflow-hidden z-0">
          {/* Boiling Water Background Effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {isActive && [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <motion.div
                key={`bg-bubble-${i}`}
                className="absolute rounded-full bg-white/40 blur-[1px]"
                style={{
                  width: 10 + Math.random() * 30,
                  height: 10 + Math.random() * 30,
                  left: `${Math.random() * 100}%`,
                  bottom: '-50px'
                }}
                animate={{
                  y: [-50, -800],
                  x: [0, (Math.random() - 0.5) * 100],
                  opacity: [0, 0.6, 0],
                  scale: [0.5, 1.5, 0.5]
                }}
                transition={{
                  duration: 2 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                  ease: "linear"
                }}
              />
            ))}
          </div>
          
          <div className="relative scale-110 md:scale-100">
            {/* Mobile Controls Overlay */}
            <div className="md:hidden absolute inset-x-0 -top-28 z-30 space-y-6 px-6">
              <div className="space-y-4 bg-white/30 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-sm">
                {/* Size Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4238]/60">Egg Weight</label>
                    <span className="text-[10px] font-mono bg-[#4A4238] text-white px-1.5 py-0.5 rounded-full">
                      {weight}g
                    </span>
                  </div>
                  <input
                    type="range"
                    min="35"
                    max="85"
                    step="1"
                    value={weight}
                    onChange={(e) => setWeight(parseInt(e.target.value))}
                    disabled={isActive || isFinished}
                    className="w-full h-1 bg-[#4A4238]/10 rounded-full appearance-none cursor-pointer accent-[#D4A373] disabled:opacity-50"
                  />
                </div>

                {/* Doneness Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4238]/60">Doneness</label>
                    <span className="text-[10px] font-mono bg-[#4A4238] text-white px-1.5 py-0.5 rounded-full">
                      {DONENESS_LEVELS[doneness].label}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={DONENESS_LEVELS.length - 1}
                    step="1"
                    value={doneness}
                    onChange={(e) => setDoneness(parseInt(e.target.value))}
                    disabled={isActive || isFinished}
                    className="w-full h-1 bg-[#4A4238]/10 rounded-full appearance-none cursor-pointer accent-[#D4A373] disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Speech Bubble */}
            <AnimatePresence>
              {eggMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: -120, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute left-1/2 -translate-x-1/2 z-20 whitespace-nowrap bg-[#4A4238] text-white px-4 py-2 rounded-2xl text-sm shadow-xl pointer-events-none"
                >
                  {eggMessage}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#4A4238]" />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div 
              className="relative cursor-pointer"
              onClick={handleEggClick}
              animate={{ 
                scale: getScale(weight),
                rotate: isActive ? [0, -1.5 - (progress * 2), 1.5 + (progress * 2), -1.5 - (progress * 2), 1.5 + (progress * 2), 0] : 0,
                x: isActive ? [0, -2 - (progress * 3), 2 + (progress * 3), -2 - (progress * 3), 2 + (progress * 3), 0] : 0,
                y: isActive ? [0, -1 - (progress * 2), 1 + (progress * 2), -1 - (progress * 2), 1 + (progress * 2), 0] : 0
              }}
              transition={{ 
                scale: { type: 'spring', stiffness: 100 },
                rotate: { duration: 0.3 - (progress * 0.1), repeat: Infinity, ease: "easeInOut" },
                x: { duration: 0.3 - (progress * 0.1), repeat: Infinity, ease: "easeInOut" },
                y: { duration: 0.4 - (progress * 0.1), repeat: Infinity, ease: "easeInOut" }
              }}
            >
              {/* The Egg SVG */}
              <svg width="240" height="320" viewBox="0 0 240 320" className="drop-shadow-2xl">
              <defs>
                <clipPath id="eggClip">
                  <path d="M120,20 C60,20 20,100 20,180 C20,260 60,300 120,300 C180,300 220,260 220,180 C220,100 180,20 120,20 Z" />
                </clipPath>
                
                {/* More dramatic gradient for cooking white */}
                <radialGradient id="cookGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  {/* Raw center - starts yellowish/translucent, becomes solid white */}
                  <stop offset="0%" stopColor={progress > 0.8 ? "#FFFFFF" : "#FFF9E0"} stopOpacity={1} />
                  {/* Transition zone - moves from edge to center */}
                  <stop offset={`${Math.min(100, progress * 120)}%`} stopColor="#FFFFFF" />
                  {/* Cooked edge - always white */}
                  <stop offset="100%" stopColor="#FFFFFF" />
                </radialGradient>

                <filter id="glow">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Egg White - Base raw state with dynamic gradient */}
              <path 
                d="M120,20 C60,20 20,100 20,180 C20,260 60,300 120,300 C180,300 220,260 220,180 C220,100 180,20 120,20 Z" 
                fill="url(#cookGradient)"
              />
              
              {/* Yolk Visualization - Reversed color progression (Orange to Yellow) */}
              <motion.circle 
                cx="120" 
                cy="185" 
                initial={false}
                animate={{ 
                  r: 45 + (progress * 12),
                  fill: progress > 0.8 ? '#F1C40F' : progress > 0.5 ? '#F39C12' : progress > 0.2 ? '#E67E22' : '#D35400',
                  opacity: 0.95,
                  scale: 1 + (progress * 0.2)
                }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                filter={progress > 0.7 ? "url(#glow)" : "none"}
              />

              {/* Yolk Texture/Highlight */}
              <motion.circle 
                cx="105" 
                cy="170" 
                r="12"
                fill="white"
                animate={{ 
                  opacity: 0.4 - (progress * 0.35),
                  scale: 1 - (progress * 0.6)
                }}
              />

              {/* Cooking Bubbles (Visualizing heat) */}
              {isActive && [1, 2, 3, 4, 5].map((i) => (
                <motion.circle
                  key={i}
                  r={2 + Math.random() * 3}
                  fill="white"
                  opacity="0.4"
                  animate={{
                    cx: [100 + Math.random() * 40, 100 + Math.random() * 40],
                    cy: [200 + Math.random() * 50, 150 + Math.random() * 50],
                    opacity: [0, 0.4, 0],
                    scale: [0.5, 1.2, 0.5]
                  }}
                  transition={{
                    duration: 1 + Math.random(),
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}

              {/* Egg Shell Outline - "Peeled" look when finished */}
              <path 
                d="M120,20 C60,20 20,100 20,180 C20,260 60,300 120,300 C180,300 220,260 220,180 C220,100 180,20 120,20 Z" 
                fill="none" 
                stroke={isFinished ? "rgba(255,255,255,0.8)" : "#E8E2D9"}
                strokeWidth={isFinished ? "1" : "2"}
                className="transition-all duration-500"
              />
            </svg>

            {/* Steam Animation - More intense */}
            <AnimatePresence>
              {isActive && (
                <motion.div 
                  className="absolute -top-16 left-1/2 -translate-x-1/2 flex gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-12 bg-[#E8E2D9]/60 rounded-full blur-[2px]"
                      animate={{ 
                        y: [-10, -50],
                        opacity: [0, 0.6, 0],
                        scaleX: [1, 2],
                        rotate: [0, i % 2 === 0 ? 10 : -10]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        delay: i * 0.4,
                        ease: "easeOut"
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Celebration Effect when finished */}
            <AnimatePresence>
              {isFinished && (
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 1 }}
                  exit={{ scale: 2, opacity: 0 }}
                >
                  <div className="w-full h-full border-4 border-[#D4A373] rounded-full animate-ping opacity-20" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

          <div className="absolute bottom-4 md:bottom-12 text-center">
            <p className="text-[8px] md:text-[10px] uppercase tracking-[0.3em] text-[#A89F91] font-bold">Actual Size Reference</p>
          </div>
        </section>

        {/* Right Section: Timer & Status */}
        <section className="p-6 md:p-8 flex flex-col justify-between md:justify-center items-center relative z-20 md:bg-transparent pointer-events-none">
          <div className="w-full flex justify-between items-start pointer-events-auto">
            {/* Mobile Bottom-Center: Timer & Start Button */}
            <div className="md:hidden fixed bottom-32 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white/80 backdrop-blur-xl p-3.5 pl-6 rounded-full border border-white/40 shadow-2xl">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold uppercase tracking-widest text-[#A89F91]">Time</span>
                <span className={`text-3xl font-black tabular-nums tracking-tighter leading-none ${isFinished ? 'text-[#D4A373]' : 'text-[#2D2823]'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              
              <div className="h-10 w-[1px] bg-[#E8E2D9]" />

              <button
                onClick={toggleTimer}
                className="relative w-14 h-14 rounded-full flex items-center justify-center overflow-hidden group"
              >
                {/* Progress Ring Background */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
                  <circle
                    cx="24"
                    cy="24"
                    r="21"
                    fill="none"
                    stroke="#E8E2D9"
                    strokeWidth="3"
                  />
                  <motion.circle
                    cx="24"
                    cy="24"
                    r="21"
                    fill="none"
                    stroke="#D4A373"
                    strokeWidth="3"
                    strokeDasharray="131.9"
                    animate={{ strokeDashoffset: 131.9 - (131.9 * progress) }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-[#4A4238] text-white' : 'bg-[#D4A373] text-white'}`}>
                  <EggButtonIcon isFinished={isFinished} doneness={doneness} isActive={isActive} size={24} />
                </div>
              </button>
            </div>

            <div className="hidden md:block">
              <h1 className="text-sm font-black uppercase tracking-tighter text-[#4A4238]">Egg Timer</h1>
            </div>

            <div className="flex flex-col items-end gap-2">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="p-2.5 rounded-full bg-white/80 md:bg-transparent shadow-sm md:shadow-none hover:bg-[#E8E2D9] transition-colors text-[#A89F91]"
              >
                {isMuted ? <BellOff size={20} /> : <Bell size={20} />}
              </button>
              
              <div className="md:hidden">
                {!isFinished && (
                  <button
                    onClick={resetTimer}
                    className="p-2 rounded-full bg-white/80 shadow-sm text-[#4A4238]"
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Timer Center */}
          <div className="hidden md:block text-center relative py-12 md:py-0">
            <div className="relative z-10">
              <h2 className="text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold text-[#A89F91] mb-1">
                {isFinished ? "Cooking Complete!" : "Remaining Time"}
              </h2>
              <motion.div 
                className={`text-7xl md:text-8xl font-black tracking-tighter tabular-nums ${isFinished ? 'text-[#D4A373]' : 'text-[#2D2823]'}`}
                animate={isFinished ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                {formatTime(timeLeft)}
              </motion.div>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center gap-6 md:gap-8 pointer-events-auto mb-24 md:mb-0">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTimer}
                className={`w-20 h-20 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl relative ${
                  isActive 
                  ? 'bg-[#4A4238] text-white' 
                  : 'bg-[#D4A373] text-white'
                }`}
              >
                <EggButtonIcon isFinished={isFinished} doneness={doneness} isActive={isActive} />
              </button>
              
              {!isFinished && (
                <button
                  onClick={resetTimer}
                  className="w-14 h-14 md:w-14 md:h-14 rounded-full bg-white md:bg-[#E8E2D9] text-[#4A4238] flex items-center justify-center shadow-md md:shadow-none hover:bg-[#DCD4C9] transition-colors"
                  title="Reset"
                >
                  <RotateCcw size={24} />
                </button>
              )}
            </div>

            <div className="w-full max-w-xs space-y-4">
              {/* Desktop Progress Bar */}
              <div className="hidden md:block space-y-4">
                <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold text-[#A89F91]">
                  <span>Cooking Progress</span>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <div className="h-1 w-full bg-[#E8E2D9] rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-[#D4A373]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-[#D4A373]">
                {isActive ? (
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex items-center gap-2"
                  >
                    <Flame size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest italic">Cooking...</span>
                  </motion.div>
                ) : isFinished ? (
                  <div className="flex items-center gap-2 text-[#D4A373]">
                    <Check size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Done!</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer / Credits */}
      <footer className="fixed bottom-6 left-8 text-[10px] text-[#A89F91] uppercase tracking-widest">
        Perfect Egg Timer v2.0
      </footer>
    </div>
  );
}
