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
 *   Phase 2  300  - 900ms   glow pulse, shine sweep across the wordmark
 *   Phase 3  900  - 1400ms  glow intensifies
 *   Phase 4  1400 - 1700ms  everything fades out
 *
 * All animated properties are transform/opacity only (GPU-accelerated,
 * no layout thrash). Respects `prefers-reduced-motion`: the glow and
 * shine sweep are skipped entirely, leaving only a simple fade.
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
            // Reduced motion: simple fade only, no glow/shine.
            <motion.img
              src={logo}
              alt="Loading"
              className="h-10 w-auto max-w-[70vw] object-contain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          ) : (
            <div className="relative flex items-center justify-center">
              {/* Soft pink glow behind the wordmark, pulses during phase 2-3 */}
              <motion.div
                className="absolute h-28 w-full max-w-[26rem] rounded-full"
                style={{
                  background: 'radial-gradient(ellipse, rgba(255,43,138,0.30) 0%, rgba(255,43,138,0) 70%)',
                  willChange: 'transform, opacity',
                }}
                animate={{
                  opacity: [0, 0, 0.8, 0.4, 0],
                  scale: [0.85, 0.85, 1.15, 1.05, 0.95],
                }}
                transition={{ duration: 1.7, times: T, ease: 'easeInOut' }}
              />

              {/* Logo + shine sweep, clipped to the logo's own bounds */}
              <motion.div
                className="relative h-16 w-64 max-w-[70vw] overflow-hidden rounded-lg"
                style={{ willChange: 'transform, opacity' }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{
                  opacity: [0, 1, 1, 1, 0],
                  scale: [0.85, 1, 1.03, 1, 0.96],
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
