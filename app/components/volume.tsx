"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CONSTANTS = {
  VOLUME_BOX_WIDTH: 80,
  VOLUME_BOX_HEIGHT: 400,
  MOVING_AREA_WIDTH: 300,
  BLOCK_SIZE: 24,
  BLOCK_GAP: 2,
  MOVE_SPEED: 3,
  MAX_BLOCKS: 15,
  FALL_DURATION: 1500,
  DROP_DURATION: 600,
  SPILL_DURATION: 1200,
  BALANCE_THRESHOLD: 150,
  MAX_TILT_ANGLE: 30,
  DROP_AREA_WIDTH: 300,
  STACK_THRESHOLD: 12,
} as const;

interface Block {
  id: number;
  x: number;
  y: number;
  isDropping: boolean;
  color: string;
  stackIndex?: number;
  isStacked: boolean;
}

const getBlockColor = (index: number): string => {
  const colors = ["rgb(59, 130, 246)", "rgb(37, 99, 235)", "rgb(29, 78, 216)"];
  return colors[index % colors.length];
};

const getSnapPosition = (x: number): number => {
  const halfBox = CONSTANTS.VOLUME_BOX_WIDTH / 2;
  const snapPoints = [
    -halfBox + CONSTANTS.BLOCK_SIZE / 2,
    0,
    halfBox - CONSTANTS.BLOCK_SIZE / 2,
  ];

  return snapPoints.reduce((closest, current) =>
    Math.abs(current - x) < Math.abs(closest - x) ? current : closest
  );
};

const VolumeControl: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0);
  const [movingBlockX, setMovingBlockX] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isFalling, setIsFalling] = useState<boolean>(false);
  const [fallDirection, setFallDirection] = useState<"left" | "right">("left");
  const [currentTilt, setCurrentTilt] = useState<number>(0);

  const calculateTorque = useCallback((blockList: Block[]): number => {
    return blockList
      .filter((block) => block.isStacked)
      .reduce((acc, block) => {
        const height = (block.stackIndex || 0) + 1;
        return acc + block.x * height * 0.8;
      }, 0);
  }, []);

  const getStackHeight = useCallback(
    (x: number, currentBlocks: Block[]): number => {
      return currentBlocks.filter(
        (b) => b.isStacked && Math.abs(b.x - x) < CONSTANTS.STACK_THRESHOLD
      ).length;
    },
    []
  );

  const handleClick = useCallback(() => {
    if (isFalling) return;

    const relativeX = movingBlockX - CONSTANTS.VOLUME_BOX_WIDTH / 2;
    const snappedX = getSnapPosition(relativeX);
    const stackHeight = getStackHeight(snappedX, blocks);

    const newBlock: Block = {
      id: Date.now(),
      x: snappedX,
      y: 0,
      isDropping: true,
      color: getBlockColor(blocks.length),
      stackIndex: stackHeight,
      isStacked: true,
    };

    setBlocks((prev) => {
      const newBlocks = [...prev, newBlock];
      const stackedCount = newBlocks.filter((b) => b.isStacked).length;
      setVolume(Math.round((stackedCount / CONSTANTS.MAX_BLOCKS) * 100));

      const torque = calculateTorque(newBlocks);
      const newTilt =
        (torque / CONSTANTS.BALANCE_THRESHOLD) * CONSTANTS.MAX_TILT_ANGLE;

      setCurrentTilt((prev) => {
        const smoothTilt = prev * 0.7 + newTilt * 0.3;
        if (Math.abs(smoothTilt) >= CONSTANTS.MAX_TILT_ANGLE) {
          setFallDirection(smoothTilt > 0 ? "right" : "left");
          triggerFall();
        }
        return smoothTilt;
      });

      return newBlocks;
    });

    setTimeout(() => {
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === newBlock.id ? { ...block, isDropping: false } : block
        )
      );
    }, CONSTANTS.DROP_DURATION);
  }, [blocks, movingBlockX, isFalling, calculateTorque, getStackHeight]);

  const getBlockStyle = useCallback(
    (block: Block): React.CSSProperties => {
      const baseStyle = {
        width: CONSTANTS.BLOCK_SIZE - CONSTANTS.BLOCK_GAP,
        height: CONSTANTS.BLOCK_SIZE - CONSTANTS.BLOCK_GAP,
        position: "absolute" as const,
        backgroundColor: block.color,
        transform: "translate(-50%, 0)",
        left: "50%",
      };

      if (isFalling) {
        const fallRotation =
          (Math.random() * 720 - 360) * (fallDirection === "right" ? 1 : -1);
        const fallX =
          (Math.random() * 200 + 100) * (fallDirection === "right" ? 1 : -1);
        return {
          ...baseStyle,
          left: `calc(50% + ${block.x}px)`,
          bottom: (block.stackIndex || 0) * CONSTANTS.BLOCK_SIZE,
          transform: `translate(-50%, 0) translate(${fallX}px, ${200}px) rotate(${fallRotation}deg)`,
          opacity: 0,
          transition: `all ${CONSTANTS.SPILL_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
        };
      }

      return {
        ...baseStyle,
        left: `calc(50% + ${block.x}px)`,
        bottom: block.isDropping
          ? CONSTANTS.VOLUME_BOX_HEIGHT
          : (block.stackIndex || 0) * CONSTANTS.BLOCK_SIZE,
        transition: block.isDropping
          ? `all ${CONSTANTS.DROP_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)`
          : "all 0.3s ease",
        transform: `translate(-50%, 0) rotate(${currentTilt}deg)`,
      };
    },
    [isFalling, fallDirection, currentTilt]
  );

  const triggerFall = useCallback(() => {
    setIsFalling(true);
    setTimeout(() => {
      setBlocks([]);
      setVolume(0);
      setIsFalling(false);
      setCurrentTilt(0);
    }, CONSTANTS.FALL_DURATION);
  }, []);

  useEffect(() => {
    if (!isOpen || isFalling) return;

    const moveBlock = () => {
      setMovingBlockX((prev) => {
        let newX = prev + direction * CONSTANTS.MOVE_SPEED;

        if (newX <= 0) {
          newX = 0;
          setDirection(1);
        } else if (newX >= CONSTANTS.VOLUME_BOX_WIDTH - CONSTANTS.BLOCK_SIZE) {
          newX = CONSTANTS.VOLUME_BOX_WIDTH - CONSTANTS.BLOCK_SIZE;
          setDirection(-1);
        }

        return newX;
      });
    };

    const intervalId = setInterval(moveBlock, 16);
    return () => clearInterval(intervalId);
  }, [isOpen, direction, isFalling]);

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="relative flex flex-col items-center gap-6">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="relative cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{
                width: CONSTANTS.DROP_AREA_WIDTH,
                height: CONSTANTS.VOLUME_BOX_HEIGHT + CONSTANTS.BLOCK_SIZE * 2,
              }}
              onClick={handleClick}
            >
              {!isFalling && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                  style={{
                    width: CONSTANTS.VOLUME_BOX_WIDTH,
                    height: CONSTANTS.BLOCK_SIZE,
                    marginTop: CONSTANTS.BLOCK_SIZE,
                  }}
                >
                  <div className="absolute inset-0 bg-blue-50/30 backdrop-blur-sm rounded-full" />
                  <motion.div
                    className="absolute top-0 left-0 bg-blue-400 rounded-sm shadow-lg"
                    style={{
                      width: CONSTANTS.BLOCK_SIZE - CONSTANTS.BLOCK_GAP,
                      height: CONSTANTS.BLOCK_SIZE - CONSTANTS.BLOCK_GAP,
                      left: movingBlockX,
                    }}
                  />
                </div>
              )}

              <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                <motion.div
                  className="relative rounded-xl backdrop-blur-md"
                  style={{
                    width: CONSTANTS.VOLUME_BOX_WIDTH,
                    height: CONSTANTS.VOLUME_BOX_HEIGHT,
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    transformOrigin: "bottom center",
                  }}
                  animate={{ rotate: currentTilt }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-full border-t border-blue-200/30"
                      style={{ bottom: `${(i + 1) * 10}%` }}
                    />
                  ))}

                  <motion.div
                    className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 px-3 py-1 rounded-full text-xs font-medium shadow-sm text-blue-600"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    key={volume}
                  >
                    {volume}%
                  </motion.div>
                </motion.div>

                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="rounded-sm"
                    style={getBlockStyle(block)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 rounded-full hover:bg-blue-50 transition-colors relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ scale: isOpen ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
          >
            {volume === 0 ? (
              <VolumeX size={24} className="text-gray-600" />
            ) : (
              <Volume2 size={24} className="text-blue-600" />
            )}
          </motion.div>
          <motion.span
            className="absolute -top-1 -right-1 min-w-[28px] h-[20px] flex items-center justify-center bg-blue-500 text-white text-xs rounded-full font-medium px-1 shadow-sm"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            key={volume}
          >
            {volume}%
          </motion.span>
        </motion.button>
      </div>
    </div>
  );
};

export default VolumeControl;
