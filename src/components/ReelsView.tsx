import { useState, useRef, useEffect } from "react";
import { Reel, User } from "../types";
import { Heart, MessageCircle, Music, Volume2, VolumeX, Play, Pause, Compass, ShieldCheck, CornerUpRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ReelsViewProps {
  reels: Reel[];
  users: User[];
  currentUser: User;
  onLikeReel: (reelId: string) => void;
}

export default function ReelsView({ reels, users, currentUser, onLikeReel }: ReelsViewProps) {
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [activeCommentsReelId, setActiveCommentsReelId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const currentReel = reels[currentReelIndex];

  // Sync isPlaying state with video
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(err => {
          console.log("Auto-play blocked or failed, resuming muted:", err);
          setIsPlaying(false);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentReelIndex]);

  // Handle double tap like trigger
  let lastTap = 0;
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTap < DOUBLE_PRESS_DELAY) {
      // Like the reel!
      onLikeReel(currentReel.id);
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 900);
    } else {
      // Single tap -> toggle play/pause
      setIsPlaying(!isPlaying);
    }
    lastTap = now;
  };

  const handleNextReel = () => {
    if (currentReelIndex < reels.length - 1) {
      setCurrentReelIndex(prev => prev + 1);
      setIsPlaying(true);
    } else {
      // Loop back to start
      setCurrentReelIndex(0);
      setIsPlaying(true);
    }
  };

  const handlePrevReel = () => {
    if (currentReelIndex > 0) {
      setCurrentReelIndex(prev => prev - 1);
      setIsPlaying(true);
    }
  };

  const hasLiked = currentReel?.likes.includes(currentUser.id) || false;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] md:min-h-screen bg-neutral-950 font-sans text-neutral-50 px-4 pb-20 md:pb-6 relative select-none">
      
      {/* BACKGROUND ACCENTS */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* REELS VIEW CONTAINER */}
      <div className="w-full max-w-[420px] aspect-[9/16] h-[72vh] sm:h-[78vh] md:h-[82vh] bg-black border border-neutral-800 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col justify-end">
        
        {/* Interactive Video Element */}
        {currentReel && (
          <div className="absolute inset-0 w-full h-full cursor-pointer bg-neutral-900" onClick={handleDoubleTap}>
            <video
              ref={videoRef}
              src={currentReel.videoUrl}
              autoPlay
              loop
              playsInline
              muted={isMuted}
              className="w-full h-full object-cover"
            />
            
            {/* Dark gradient overlay at the bottom for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
          </div>
        )}

        {/* E2EE Info banner top header */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-neutral-950/40 backdrop-blur-md px-2.5 py-1 border border-neutral-800/50 rounded-full text-[10px] text-emerald-400 font-mono tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>REEL DIRECT AVEC CHIFFrEMENT</span>
        </div>

        {/* PLAY/PAUSE CENTER UTILITY COMPONENT */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/50 backdrop-blur-md border border-neutral-800 flex items-center justify-center z-20 pointer-events-none"
            >
              <Play className="w-7 h-7 text-white fill-current translate-x-0.5" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* DOUBLE TAP HEART POP ANIMATION */}
        <AnimatePresence>
          {showHeartPop && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.2, 1], opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 m-auto w-24 h-24 flex items-center justify-center z-20 pointer-events-none"
            >
              <Heart className="w-20 h-20 text-red-500 fill-current drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM METADATA CONTROLS (INSTAGRAM INSPIRED OVERLAYS) */}
        {currentReel && (
          <div className="relative p-5 z-10 flex flex-col gap-3 w-10/12">
            
            {/* User credentials */}
            <div className="flex items-center gap-2.5">
              {(() => {
                const reelCreator = users.find(u => u.id === currentReel.userId);
                const isPriorityCreator = reelCreator?.email?.toLowerCase() === "mahdiyacoubali2004@gmail.com";
                return (
                  <>
                    <img
                      src={currentReel.userAvatar}
                      alt={currentReel.username}
                      className={`w-9 h-9 rounded-full object-cover shadow ${
                        isPriorityCreator
                          ? "border-2 border-amber-400 ring-2 ring-pink-500/50"
                          : "border-2 border-pink-500"
                      }`}
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold tracking-wide">@{currentReel.username}</span>
                        {isPriorityCreator && (
                          <span className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm border border-pink-400/20 animate-pulse">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>PRIORITAIRE</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-pink-400 font-medium font-mono">
                        {isPriorityCreator ? "Membre Prioritaire • E2EE" : "Simulé via E2EE Direct"}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Reel Caption */}
            <p className="text-xs text-neutral-200 line-clamp-3 leading-relaxed mt-1 font-sans">
              {currentReel.caption}
            </p>

            {/* Audio Track Ticker */}
            <div className="flex items-center gap-1.5 bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/40 py-1.5 px-2.5 rounded-lg text-[10px] text-neutral-300 w-fit max-w-full">
              <Music className="w-3.5 h-3.5 text-pink-500 rotate-12 flex-shrink-0 animate-pulse" />
              <div className="overflow-hidden whitespace-nowrap scroll-smooth font-mono">
                <span className="inline-block animate-marquee">{currentReel.musicName}</span>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT ACTION COLUMN - BUTTON BAR */}
        {currentReel && (
          <div className="absolute right-3.5 bottom-16 z-20 flex flex-col items-center gap-4.5">
            {/* Like */}
            <button
              id={`reel-like-btn-${currentReel.id}`}
              onClick={() => onLikeReel(currentReel.id)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`p-3 rounded-full bg-neutral-950/40 backdrop-blur-md border border-neutral-800/80 group-hover:bg-neutral-900 transition-colors ${
                hasLiked ? "text-red-500" : "text-neutral-300"
              }`}>
                <Heart className={`w-[21px] h-[21px] ${hasLiked ? "fill-red-500 text-red-500" : ""}`} />
              </div>
              <span className="text-[10px] font-mono select-none font-semibold text-neutral-200">{currentReel.likes.length}</span>
            </button>

            {/* Comments Display */}
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 rounded-full bg-neutral-950/40 backdrop-blur-md border border-neutral-800/80 text-neutral-300">
                <MessageCircle className="w-[21px] h-[21px]" />
              </div>
              <span className="text-[10px] font-mono font-semibold text-neutral-200">{currentReel.commentsCount}</span>
            </div>

            {/* Volume Toggler */}
            <button
              id="reel-mute-toggler"
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 rounded-full bg-neutral-950/40 backdrop-blur-md border border-neutral-800/80 text-neutral-300 hover:bg-neutral-900 transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-neutral-400" /> : <Volume2 className="w-5 h-5 text-pink-500" />}
            </button>

            {/* Share / Next arrow */}
            <button
              id="reel-forward-button"
              onClick={handleNextReel}
              className="p-3 rounded-full bg-gradient-to-r from-pink-500 to-red-500 border border-pink-500 text-white hover:opacity-95 transition-all hover:scale-105 shadow-lg"
            >
              <CornerUpRight className="w-4.5 h-4.5 rotate-90" />
            </button>
          </div>
        )}

        {/* PROGRESS METER */}
        <div className="absolute bottom-1 w-full flex items-center px-4 z-20">
          <div className="w-full bg-neutral-900 h-[3px] rounded-full overflow-hidden">
            <motion.div
              key={currentReelIndex}
              initial={{ width: "0%" }}
              animate={{ width: isPlaying ? "100%" : "0%" }}
              transition={{ duration: 12.5, repeat: Infinity, ease: "linear" }}
              className="bg-pink-500 h-full"
            />
          </div>
        </div>

      </div>

      {/* SWIPER / SCROLL CONTROLLER GUIDES */}
      <div className="flex items-center gap-6 mt-4">
        <button
          id="btn-prev-reel"
          onClick={handlePrevReel}
          disabled={currentReelIndex === 0}
          className={`px-4.5 py-2 rounded-xl text-xs font-semibold font-mono border transition-all ${
            currentReelIndex === 0
              ? "border-neutral-900 text-neutral-600 bg-neutral-950/50 cursor-not-allowed"
              : "border-neutral-800 text-neutral-300 bg-neutral-900 hover:bg-neutral-800 cursor-pointer"
          }`}
        >
          Précédent
        </button>
        <span className="text-xs text-neutral-500 font-mono">Reel {currentReelIndex + 1} / {reels.length}</span>
        <button
          id="btn-next-reel"
          onClick={handleNextReel}
          className="px-4.5 py-2 rounded-xl text-xs font-semibold font-mono border border-neutral-800 text-neutral-300 bg-neutral-900 hover:bg-neutral-800 cursor-pointer transition-all"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
