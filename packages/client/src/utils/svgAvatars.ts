import type { AvatarType } from '@roborally/shared';

export const AVATAR_SVGS: Record<AvatarType, string> = {
  tank: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="20" y="35" width="60" height="40" rx="5" fill="#666" stroke="#333" stroke-width="2"/>
      <rect x="40" y="15" width="20" height="25" fill="#666" stroke="#333" stroke-width="2"/>
      <rect x="30" y="25" width="40" height="10" fill="#444"/>
      <circle cx="30" cy="75" r="12" fill="#333"/>
      <circle cx="70" cy="75" r="12" fill="#333"/>
    </svg>
  `)}`,
  wheelbot: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="35" fill="#666" stroke="#333" stroke-width="2"/>
      <circle cx="50" cy="50" r="20" fill="#444"/>
      <circle cx="50" cy="50" r="8" fill="#888"/>
      <line x1="50" y1="15" x2="50" y2="85" stroke="#333" stroke-width="2"/>
      <line x1="15" y1="50" x2="85" y2="50" stroke="#333" stroke-width="2"/>
    </svg>
  `)}`,
  flybot: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <ellipse cx="50" cy="50" rx="25" ry="20" fill="#666" stroke="#333" stroke-width="2"/>
      <circle cx="50" cy="45" r="12" fill="#444"/>
      <rect x="15" y="40" width="20" height="8" fill="#888"/>
      <rect x="65" y="40" width="20" height="8" fill="#888"/>
      <line x1="5" y1="44" x2="25" y2="44" stroke="#666" stroke-width="2"/>
      <line x1="75" y1="44" x2="95" y2="44" stroke="#666" stroke-width="2"/>
    </svg>
  `)}`,
  hovercraft: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <ellipse cx="50" cy="50" rx="40" ry="25" fill="#666" stroke="#333" stroke-width="2"/>
      <ellipse cx="50" cy="45" rx="20" ry="12" fill="#444"/>
      <rect x="20" y="60" width="60" height="8" fill="#888" rx="2"/>
    </svg>
  `)}`,
  rollerbot: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="25" y="20" width="50" height="60" rx="25" fill="#666" stroke="#333" stroke-width="2"/>
      <circle cx="50" cy="40" r="15" fill="#444"/>
      <rect x="35" y="55" width="30" height="20" fill="#555" rx="5"/>
    </svg>
  `)}`,
  spherebot: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="#666" stroke="#333" stroke-width="2"/>
      <circle cx="50" cy="45" r="18" fill="#444"/>
      <circle cx="42" cy="40" r="5" fill="#fff"/>
      <circle cx="58" cy="40" r="5" fill="#fff"/>
      <circle cx="42" cy="40" r="2" fill="#000"/>
      <circle cx="58" cy="40" r="2" fill="#000"/>
    </svg>
  `)}`,
  hammerbot: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="35" y="30" width="30" height="50" fill="#666" stroke="#333" stroke-width="2"/>
      <rect x="25" y="20" width="50" height="20" fill="#555" rx="5"/>
      <rect x="20" y="25" width="15" height="10" fill="#444"/>
      <rect x="65" y="25" width="15" height="10" fill="#444"/>
      <line x1="12" y1="30" x2="25" y2="30" stroke="#333" stroke-width="3"/>
      <line x1="75" y1="30" x2="88" y2="30" stroke="#333" stroke-width="3"/>
    </svg>
  `)}`,
  twonkybot: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="20" y="30" width="60" height="40" rx="8" fill="#666" stroke="#333" stroke-width="2"/>
      <rect x="35" y="15" width="30" height="20" fill="#555" rx="5"/>
      <circle cx="40" cy="25" r="6" fill="#fff"/>
      <circle cx="60" cy="25" r="6" fill="#fff"/>
      <circle cx="40" cy="25" r="3" fill="#000"/>
      <circle cx="60" cy="25" r="3" fill="#000"/>
      <rect x="25" y="40" width="15" height="20" fill="#444"/>
      <rect x="60" y="40" width="15" height="20" fill="#444"/>
    </svg>
  `)}`,
};
