import React from 'react';
import { motion } from 'framer-motion';
import { X, BookOpen, Heart, Zap, Target, RotateCw, Move, Flag } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

export default function RulesModal({ onClose }: RulesModalProps): React.ReactElement {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="modal-content max-w-3xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          <div className="flex justify-between items-center mb-6 sticky top-0 bg-primary-800 py-2 z-10">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Règles RoboRally
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-primary-700/50 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6 prose prose-invert max-w-none">
            <section>
              <h3 className="text-xl font-semibold flex items-center gap-2 text-primary-300">
                <Target className="w-5 h-5" />
                Objectif
              </h3>
              <p className="text-primary-200">
                RoboRally est une course de robots dans une usine chaotique. 
                L'objectif est d'être le premier à toucher les drapeaux dans l'ordre 
                strict 1→2→3→4→5.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold flex items-center gap-2 text-primary-300">
                <Flag className="w-5 h-5" />
                Installation
              </h3>
              <ul className="list-disc list-inside text-primary-200 space-y-1">
                <li>Plateau NxN procédural avec murs, tapis, lasers, engrenages, repoussoirs, puits</li>
                <li>5 drapeaux numérotés placés aléatoirement (accessibles par pathfinding A*)</li>
                <li>Quais de départ sur le bord gauche, orientés vers le centre</li>
                <li>Archive (point de respawn) = position du drapeau 1</li>
                <li>3 Vies par joueur (4 si 5+ joueurs), 0 Dégâts au départ</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold flex items-center gap-2 text-primary-300">
                <RotateCw className="w-5 h-5" />
                Tour Complet
              </h3>
              <ol className="list-decimal list-inside text-primary-200 space-y-2">
                <li><strong>Piocher:</strong> 9 cartes Programme (moins 1 par dégât subi)</li>
                <li><strong>Programmer:</strong> Placer 5 cartes dans les registres 1-5</li>
                <li><strong>PowerDown optionnel:</strong> Réparer complètement à la fin du tour</li>
                <li>
                  <strong>Résoudre 5 Phases:</strong>
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li><strong>Priorité:</strong> F3(1) &gt; F2(2) &gt; F1(3) &gt; Rotation(4) &gt; Recul(5) &gt; UTurn(6) &gt; PD(skip)</li>
                    <li><strong>Mouvement:</strong> Avancer/Reculer/Pivoter selon la carte</li>
                    <li><strong>Collisions:</strong> Poussée en chaîne récursive (max profondeur 10)</li>
                    <li><strong>Murs:</strong> Bloquent le mouvement sans dégâts</li>
                    <li><strong>Plateau Post-Move:</strong> Tapis, Engrenages, Repoussoirs</li>
                    <li><strong>Lasers:</strong> Tous les lasers tirent en fin de phase (1 dégât par hit)</li>
                    <li><strong>Drapeaux:</strong> Toucher dans l'ordre strict 1→2→3→4→5</li>
                  </ul>
                </li>
                <li><strong>Cleanup:</strong> Réparations, verrouillage, destruction, chute</li>
              </ol>
            </section>

            <section>
              <h3 className="text-xl font-semibold flex items-center gap-2 text-primary-300">
                <Zap className="w-5 h-5" />
                Système de Dégâts
              </h3>
              <ul className="list-disc list-inside text-primary-200 space-y-1">
                <li>Chaque dégât réduit la taille de la main de 1 carte (9-dégâts)</li>
                <li>5+ dégâts = 1 registre verrouillé (répète la carte précédente)</li>
                <li>10+ dégâts = Destruction du robot (vie-1, dmg=2, respawn archive)</li>
                <li>Équipements (5 max): Défaussable pour absorber 1 dégât</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold flex items-center gap-2 text-primary-300">
                <Move className="w-5 h-5" />
                Éléments du Plateau
              </h3>
              <ul className="list-disc list-inside text-primary-200 space-y-1">
                <li><strong>Tapis roulants:</strong> Poussent les robots (normal=1 case, express=3 cases)</li>
                <li><strong>Engrenages:</strong> Pivotent le robot 90° (gauche/droite)</li>
                <li><strong>Repoussoirs:</strong> Poussent dans leur direction (1 case)</li>
                <li><strong>Puits:</strong> Chute instantanée (vie-1, respawn archive)</li>
                <li><strong>Lasers:</strong> Muraux + Robot (frontal, ligne de vue, 1 dégât)</li>
                <li><strong>Murs:</strong> Bloquent mouvement et lasers</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold flex items-center gap-2 text-primary-300">
                <Heart className="w-5 h-5" />
                Victoire
              </h3>
              <p className="text-primary-200">
                Le premier joueur à toucher les 5 drapeaux dans l'ordre (1→2→3→4→5) 
                remporte la partie. L'archive se met à jour automatiquement après 
                chaque drapeau touché.
              </p>
            </section>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
