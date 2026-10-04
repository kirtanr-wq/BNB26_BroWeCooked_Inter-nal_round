'use client';

import React, { useRef, useState, ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import './TiltedCard.css';

const springValues = {
  damping: 30,
  stiffness: 100,
  mass: 2
};

export interface TiltedCardProps {
  imageSrc?: string;
  altText?: string;
  captionText?: string;
  containerHeight?: string | number;
  containerWidth?: string | number;
  imageHeight?: string | number;
  imageWidth?: string | number;
  scaleOnHover?: number;
  rotateAmplitude?: number;
  showMobileWarning?: boolean;
  showTooltip?: boolean;
  overlayContent?: ReactNode;
  displayOverlayContent?: boolean;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function TiltedCard({
  imageSrc,
  altText = 'Tilted card image',
  captionText = '',
  containerHeight = '300px',
  containerWidth = '100%',
  imageHeight = '300px',
  imageWidth = '300px',
  scaleOnHover = 1.1,
  rotateAmplitude = 14,
  showMobileWarning = false,
  showTooltip = true,
  overlayContent = null,
  displayOverlayContent = false,
  children,
  onClick,
  className = ''
}: TiltedCardProps) {
  const ref = useRef<HTMLElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const rotateX = useSpring(rotX, springValues);
  const rotateY = useSpring(rotY, springValues);
  const scale = useSpring(1, springValues);
  const opacity = useSpring(0);
  const rotateFigcaption = useSpring(0, {
    stiffness: 350,
    damping: 30,
    mass: 1
  });

  const [lastY, setLastY] = useState(0);

  function handleMouse(e: React.MouseEvent<HTMLElement>) {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude;

    rotX.set(rotationX);
    rotY.set(rotationY);

    x.set(e.clientX - rect.left + 14);
    y.set(e.clientY - rect.top + 14);

    const velocityY = offsetY - lastY;
    rotateFigcaption.set(-velocityY * 0.6);
    setLastY(offsetY);
  }

  function handleMouseEnter() {
    scale.set(scaleOnHover);
    opacity.set(1);
  }

  function handleMouseLeave() {
    opacity.set(0);
    scale.set(1);
    rotX.set(0);
    rotY.set(0);
    rotateFigcaption.set(0);
  }

  const effectiveOverlay = displayOverlayContent && overlayContent ? overlayContent : children;

  return (
    <figure
      ref={ref}
      className={`tilted-card-figure ${className}`.trim()}
      style={{
        height: containerHeight,
        width: containerWidth,
        cursor: onClick ? 'pointer' : 'default'
      }}
      onMouseMove={handleMouse}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {showMobileWarning && (
        <div className="tilted-card-mobile-alert">This effect is not optimized for mobile. Check on desktop.</div>
      )}

      <motion.div
        className="tilted-card-inner"
        style={{
          width: imageWidth,
          height: imageHeight,
          rotateX,
          rotateY,
          scale
        }}
      >
        {imageSrc && (
          <motion.img
            src={imageSrc}
            alt={altText}
            className="tilted-card-img"
            style={{
              width: imageWidth,
              height: imageHeight
            }}
          />
        )}

        {effectiveOverlay && (
          <motion.div className="tilted-card-overlay">{effectiveOverlay}</motion.div>
        )}
      </motion.div>

      {showTooltip && captionText && (
        <motion.figcaption
          className="tilted-card-caption"
          style={{
            x,
            y,
            opacity,
            rotate: rotateFigcaption
          }}
        >
          {captionText}
        </motion.figcaption>
      )}
    </figure>
  );
}

export { TiltedCard };
