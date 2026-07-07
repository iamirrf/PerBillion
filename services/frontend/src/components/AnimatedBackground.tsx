import { useEffect, useRef } from 'react'

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Optional: Add any canvas-based animations here if needed
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base dark background */}
      <div className="absolute inset-0 bg-black" />
      
      {/* Smooth moving gradient overlay - like trapped light in matt glass */}
      <div 
        ref={canvasRef}
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1810 25%, #1a1410 50%, #1a1a1a 75%, #1a1a1a 100%)',
          backgroundSize: '200% 200%',
          animation: 'smoothFlow 20s ease-in-out infinite',
        }}
      />
      
      {/* Subtle glass blur effect */}
      <div 
        className="absolute inset-0 backdrop-blur-sm"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }}
      />

      {/* Gold accent lights - reduced blur */}
      <div 
        className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, transparent 70%)',
          animation: 'gentleFloat 25s ease-in-out infinite',
          filter: 'blur(40px)',
        }}
      />
      
      <div 
        className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(255, 193, 7, 0.3) 0%, transparent 70%)',
          animation: 'gentleFloat 30s ease-in-out infinite reverse',
          filter: 'blur(40px)',
        }}
      />

      <style>{`
        @keyframes smoothFlow {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes gentleFloat {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(20px, -20px) scale(1.05);
          }
        }
      `}</style>
    </div>
  )
}
