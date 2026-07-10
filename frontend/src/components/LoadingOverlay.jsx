import { motion, AnimatePresence } from 'framer-motion';
import { useLoading } from '../context/LoadingContext';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import logo from '../assets/logo-samurai-loader.png';

/**
 * LoadingOverlay — premium full-screen branded loading transition.
 *
 * Timeline (1700ms total), driven by a single Framer Motion keyframe
 * sequence per element rather than React state machines, so there are no
 * extra re-renders mid-animation:
 *
 *   Phase 1  0    - 300ms   overlay + logo fade/scale in
 *   Phase 2  300  - 900ms   ring rotation, glow pulse, shine sweep, gentle pulse
 *   Phase 3  900  - 1400ms  expanding pink energy pulse
 *   Phase 4  1400 - 1700ms  everything fades out
 *
 * All animated properties are transform/opacity only (GPU-accelerated,
 * no layout thrash). Respects `prefers-reduced-motion`: rotation, shine,
 * and pulse are skipped entirely, leaving only a simple fade.
 */

// Normalized breakpoints for the 1700ms timeline, used by every keyframe
// array below so the phases stay in sync with each other.
const T = [0, 300 / 1700, 900 / 1700, 1400 / 1700, 1];

export default function LoadingOverlay() {
  const { isVisible } = useLoading();
  const reducedMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-white/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
          aria-label="Loading"
        >
          {reducedMotion ? (
            // Reduced motion: simple fade only, no rotation/pulse/shine.
            <motion.img
              src={logo}
              alt="Loading"
              className="h-24 w-24 object-contain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          ) : (
            <div className="relative flex h-40 w-40 items-center justify-center">
              {/* Soft pink glow, pulses during phase 2 */}
              <motion.div
                className="absolute h-full w-full rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255,43,138,0.35) 0%, rgba(255,43,138,0) 70%)',
                  willChange: 'transform, opacity',
                }}
                animate={{
                  opacity: [0, 0, 0.7, 0.35, 0],
                  scale: [0.8, 0.8, 1.15, 1.05, 0.95],
                }}
                transition={{ duration: 1.7, times: T, ease: 'easeInOut' }}
              />

              {/* Expanding energy pulse ring — phase 3 (900-1400ms) */}
              <motion.div
                className="absolute h-20 w-20 rounded-full border-2"
                style={{ borderColor: '#FF2B8A', willChange: 'transform, opacity' }}
                animate={{
                  opacity: [0, 0, 0, 0.6, 0],
                  scale: [1, 1, 1, 2.6, 3],
                }}
                transition={{ duration: 1.7, times: T, ease: 'easeOut' }}
              />

              {/* Outer rotating arc */}
              <motion.svg
                className="absolute h-32 w-32"
                viewBox="0 0 100 100"
                style={{ willChange: 'transform' }}
                animate={{ rotate: [0, 0, 360, 360, 360] }}
                transition={{ duration: 1.7, times: T, ease: 'linear' }}
              >
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="#FF2B8A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="80 180"
                  opacity="0.6"
                />
              </motion.svg>

              {/* Logo + shine sweep, clipped to the logo's own bounds */}
              <motion.div
                className="relative h-24 w-24 overflow-hidden rounded-full"
                style={{
                  boxShadow: '0 8px 30px rgba(255, 43, 138, 0.25)',
                  willChange: 'transform, opacity',
                }}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{
                  opacity: [0, 1, 1, 1, 0],
                  scale: [0.7, 1, 1.04, 1, 0.95],
                }}
                transition={{ duration: 1.7, times: T, ease: 'easeOut' }}
              >
                <img src={logo} alt="Loading" className="h-full w-full object-contain" />
                {/* Shine sweep — moves across the logo once during phase 2 */}
                <motion.div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.75) 50%, transparent 60%)',
                    mixBlendMode: 'overlay',
                    willChange: 'transform',
                  }}
                  animate={{ x: ['-120%', '-120%', '130%', '130%', '130%'] }}
                  transition={{ duration: 1.7, times: T, ease: 'easeInOut' }}
                />
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
