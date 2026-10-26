import React from 'react';
import { PieceSymbol, PlayerColor } from '../types/chess';

interface ChessPieceProps {
  type: PieceSymbol;
  color: PlayerColor;
  className?: string;
}

export const ChessPiece: React.FC<ChessPieceProps> = React.memo(({ type, color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';

  // Crisp SVG colors for gentle depth & tournament clarity
  const whiteFill = '#f8fafc';
  const whiteStroke = '#0f172a';
  const whiteInner = '#e2e8f0';

  const blackFill = '#18181b';
  const blackStroke = '#e2e8f0';
  const blackInner = '#27272a';

  const svgClass = `${className} select-none pointer-events-none drop-shadow-sm`;

  switch (type) {
    case 'k': // KING
      return (
        <svg
          viewBox="0 0 45 45"
          className={svgClass}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isWhite ? (
            <g fill={whiteFill} stroke={whiteStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22.5 11.63V6M20 8h5" stroke={whiteStroke} strokeWidth="1.5" />
              <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill={whiteInner} />
              <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23.5M11.5 30s-9-4.5-6-10.5c4-6.5 13.5-3.5 16 4V23.5" />
              <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0" />
            </g>
          ) : (
            <g fill={blackFill} stroke={blackStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22.5 11.63V6M20 8h5" stroke={blackStroke} strokeWidth="1.5" />
              <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill={blackInner} />
              <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23.5M11.5 30s-9-4.5-6-10.5c4-6.5 13.5-3.5 16 4V23.5" />
              <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0" stroke={blackStroke} />
            </g>
          )}
        </svg>
      );

    case 'q': // QUEEN
      return (
        <svg
          viewBox="0 0 45 45"
          className={svgClass}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isWhite ? (
            <g fill={whiteFill} stroke={whiteStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm9-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm9 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm9 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-13.5-4a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
              <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11-7.5-14-7.5 14-7-11 2 12z" />
              <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" fill={whiteInner} />
              <path d="M11 38.5a35 35 1 0 0 23 0" />
              <path d="M11 29a35 35 1 0 1 23 0M12.5 31.5a35 35 1 0 1 20 0M11.5 34.5a35 35 1 0 1 22 0M10.5 37.5a35 35 1 0 1 24 0" />
            </g>
          ) : (
            <g fill={blackFill} stroke={blackStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm9-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm9 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm9 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-13.5-4a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
              <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11-7.5-14-7.5 14-7-11 2 12z" fill={blackInner} />
              <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
              <path d="M11 38.5a35 35 1 0 0 23 0M11 29a35 35 1 0 1 23 0M12.5 31.5a35 35 1 0 1 20 0M11.5 34.5a35 35 1 0 1 22 0M10.5 37.5a35 35 1 0 1 24 0" stroke={blackStroke} />
            </g>
          )}
        </svg>
      );

    case 'r': // ROOK
      return (
        <svg
          viewBox="0 0 45 45"
          className={svgClass}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isWhite ? (
            <g fill={whiteFill} stroke={whiteStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 39h27v-3H9v3zm3.5-7l1.5-12.5h17l1.5 12.5h-20zm-1-15.5l.5-4.5h26l.5 4.5H11.5zm.5-4.5V9h4v3h4.5V9h5v3h4.5V9h4v3" />
              <path d="M14 29.5v-6h17v6H14z" fill={whiteInner} />
              <path d="M11 14h23M9 36h27" />
            </g>
          ) : (
            <g fill={blackFill} stroke={blackStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 39h27v-3H9v3zm3.5-7l1.5-12.5h17l1.5 12.5h-20zm-1-15.5l.5-4.5h26l.5 4.5H11.5zm.5-4.5V9h4v3h4.5V9h5v3h4.5V9h4v3" />
              <path d="M14 29.5v-6h17v6H14z" fill={blackInner} />
              <path d="M11 14h23M9 36h27" stroke={blackStroke} />
            </g>
          )}
        </svg>
      );

    case 'b': // BISHOP
      return (
        <svg
          viewBox="0 0 45 45"
          className={svgClass}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isWhite ? (
            <g fill={whiteFill} stroke={whiteStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
              <path d="M17.5 26h10M15 30h15" fill="none" />
              <path d="M22.5 15.5v5M20 18h5" stroke={whiteStroke} strokeWidth="1.5" />
            </g>
          ) : (
            <g fill={blackFill} stroke={blackStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
              <path d="M17.5 26h10M15 30h15" stroke={blackStroke} fill="none" />
              <path d="M22.5 15.5v5M20 18h5" stroke={blackStroke} strokeWidth="1.5" />
            </g>
          )}
        </svg>
      );

    case 'n': // KNIGHT
      return (
        <svg
          viewBox="0 0 45 45"
          className={svgClass}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isWhite ? (
            <g fill={whiteFill} stroke={whiteStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
              <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-4.04 0-5-1-1.5-3.5 1.5-3.5-1.5 0-4 4.5-5 4.5-9 0-3.5-1.5-6-6-6-2.5 0-5 3.5-5 3.5C2.5 9 6.5 5 13 5c5 0 9 2 9 5z" fill={whiteInner} />
              <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z" fill={whiteStroke} />
              <path d="M15 15.5c2.5 0 4.5 1 5.5 3" />
            </g>
          ) : (
            <g fill={blackFill} stroke={blackStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
              <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-4.04 0-5-1-1.5-3.5 1.5-3.5-1.5 0-4 4.5-5 4.5-9 0-3.5-1.5-6-6-6-2.5 0-5 3.5-5 3.5C2.5 9 6.5 5 13 5c5 0 9 2 9 5z" fill={blackInner} />
              <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z" fill={blackStroke} />
              <path d="M15 15.5c2.5 0 4.5 1 5.5 3" stroke={blackStroke} />
            </g>
          )}
        </svg>
      );

    case 'p': // PAWN
    default:
      return (
        <svg
          viewBox="0 0 45 45"
          className={svgClass}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isWhite ? (
            <g fill={whiteFill} stroke={whiteStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.21-3.28 5.62 0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h25c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" />
              <path d="M17.5 26c2.5 1 7.5 1 10 0" />
            </g>
          ) : (
            <g fill={blackFill} stroke={blackStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.21-3.28 5.62 0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h25c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" />
              <path d="M17.5 26c2.5 1 7.5 1 10 0" stroke={blackStroke} />
            </g>
          )}
        </svg>
      );
  }
});
