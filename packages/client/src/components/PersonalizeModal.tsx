import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, User, Palette } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';
import { AVATAR_SVGS } from '../utils/svgAvatars';
import type { AvatarType, ColorType } from '@roborally/shared';

const AVATAR_OPTIONS: AvatarType[] = [
  'tank', 'wheelbot', 'flybot', 'hovercraft',
  'rollerbot', 'spherebot', 'hammerbot', 'twonkybot',
];

const COLOR_OPTIONS: ColorType[] = [
  '#FF4444', '#44FF44', '#4444FF', '#FFFF44', '#FF44FF',
  '#44FFFF', '#FFAA00', '#AAFF00', '#00FFAA', '#AA00FF',
];

interface PersonalizeModalProps {
  onClose: () => void;
}

export default function PersonalizeModal({ onClose }: PersonalizeModalProps): React.ReactElement {
  const { playerSettings, setPlayerSettings } = useGameStore();
  const [name, setName] = useState(playerSettings.name);
  const [avatar, setAvatar] = useState<AvatarType>(playerSettings.avatar);
  const [color, setColor] = useState<ColorType>(playerSettings.color);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 100 * dpr;
    canvas.height = 100 * dpr;
    canvas.style.width = '100px';
    canvas.style.height = '100px';
    ctx.scale(dpr, dpr);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(50, 50, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 30, 30, 40, 40);
    };
    img.src = AVATAR_SVGS[avatar];

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(50, 10);
    ctx.lineTo(45, 20);
    ctx.lineTo(55, 20);
    ctx.closePath();
    ctx.fill();
  }, [avatar, color]);

  const handleSave = (): void => {
    if (name.trim().length >= 1 && name.trim().length <= 12) {
      setPlayerSettings({
        name: name.trim(),
        avatar,
        color,
      });
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="modal-content max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6" />
              Personnaliser
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-primary-700/50 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex justify-center mb-6">
            <canvas
              ref={canvasRef}
              className="rounded-full shadow-lg border-4 border-primary-500"
              style={{ width: '100px', height: '100px' }}
            />
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Pseudo (1-12 caractères)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 12))}
                className="w-full px-4 py-3 rounded-lg bg-primary-900/50 border border-primary-600 focus:border-primary-400 focus:outline-none"
                placeholder="Votre pseudo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Avatar</label>
              <div className="grid grid-cols-4 gap-3">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    onClick={() => setAvatar(av)}
                    className={`aspect-square rounded-lg p-2 transition-all ${
                      avatar === av
                        ? 'bg-primary-500 ring-2 ring-white'
                        : 'bg-primary-800/50 hover:bg-primary-700/50'
                    }`}
                  >
                    <img
                      src={AVATAR_SVGS[av]}
                      alt={av}
                      className="w-full h-full"
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Couleur
              </label>
              <div className="flex flex-wrap gap-3">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`color-swatch ${color === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={name.trim().length < 1}
              className="w-full py-4 rounded-lg bg-primary-500 hover:bg-primary-400 disabled:bg-primary-800 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              Sauvegarder
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
