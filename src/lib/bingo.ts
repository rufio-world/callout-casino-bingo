// Bingo game logic utilities

export interface BingoNumber {
  letter: 'B' | 'I' | 'N' | 'G' | 'O';
  number: number;
  range: [number, number];
}

// Generate a complete draw sequence for a bingo round
export const generateDrawSequence = (): number[] => {
  const numbers: number[] = [];
  
  // B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
  for (let i = 1; i <= 75; i++) {
    numbers.push(i);
  }
  
  // Shuffle the array using Fisher-Yates algorithm
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  
  return numbers;
};

// Generate a single bingo card with unique numbers
export const generateBingoCard = (freeCenter: boolean = true): number[] => {
  const card: number[] = [];
  
  // B column: 1-15 (5 numbers)
  const bNumbers = generateUniqueNumbers(1, 15, 5);
  card.push(...bNumbers);
  
  // I column: 16-30 (5 numbers)  
  const iNumbers = generateUniqueNumbers(16, 30, 5);
  card.push(...iNumbers);
  
  // N column: 31-45 (4 or 5 numbers depending on free center)
  const nNumbers = generateUniqueNumbers(31, 45, freeCenter ? 4 : 5);
  if (freeCenter) {
    // Insert 0 at position 2 (middle of N column)
    nNumbers.splice(2, 0, 0); // 0 represents FREE space
  }
  card.push(...nNumbers);
  
  // G column: 46-60 (5 numbers)
  const gNumbers = generateUniqueNumbers(46, 60, 5);
  card.push(...gNumbers);
  
  // O column: 61-75 (5 numbers)
  const oNumbers = generateUniqueNumbers(61, 75, 5);
  card.push(...oNumbers);
  
  return card;
};

// Generate unique random numbers within a range
const generateUniqueNumbers = (min: number, max: number, count: number): number[] => {
  const numbers: number[] = [];
  const available: number[] = [];
  
  for (let i = min; i <= max; i++) {
    available.push(i);
  }
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    numbers.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }
  
  return numbers.sort((a, b) => a - b);
};

// Get the bingo letter for a number
export const getBingoLetter = (number: number): 'B' | 'I' | 'N' | 'G' | 'O' => {
  if (number >= 1 && number <= 15) return 'B';
  if (number >= 16 && number <= 30) return 'I';
  if (number >= 31 && number <= 45) return 'N';
  if (number >= 46 && number <= 60) return 'G';
  if (number >= 61 && number <= 75) return 'O';
  throw new Error(`Invalid bingo number: ${number}`);
};

// Check if a position is on the card (5x5 grid, 0-indexed)
export const getGridPosition = (index: number): { row: number; col: number } => {
  return {
    row: Math.floor(index / 5),
    col: index % 5
  };
};

// Check for bingo patterns (lines, full card, corners)
export const checkBingoPatterns = (markedPositions: boolean[]) => {
  const patterns = {
    lines: 0,
    bingo: false,
    corners: false
  };
  
  // Check rows
  for (let row = 0; row < 5; row++) {
    const rowComplete = Array.from({ length: 5 }, (_, col) => markedPositions[row * 5 + col]).every(Boolean);
    if (rowComplete) patterns.lines++;
  }
  
  // Check columns
  for (let col = 0; col < 5; col++) {
    const colComplete = Array.from({ length: 5 }, (_, row) => markedPositions[row * 5 + col]).every(Boolean);
    if (colComplete) patterns.lines++;
  }
  
  // Check diagonals
  const diagonal1 = [0, 6, 12, 18, 24].every(pos => markedPositions[pos]);
  const diagonal2 = [4, 8, 12, 16, 20].every(pos => markedPositions[pos]);
  
  if (diagonal1) patterns.lines++;
  if (diagonal2) patterns.lines++;
  
  // Check full card
  patterns.bingo = markedPositions.every(Boolean);
  
  // Check corners (0, 4, 20, 24)
  patterns.corners = [0, 4, 20, 24].every(pos => markedPositions[pos]);
  
  return patterns;
};

// Calculate points based on game rules
export const calculatePoints = (
  linesCompleted: number,
  hasBingo: boolean,
  hasCorners: boolean,
  multiCardBonus: number
): number => {
  let points = 0;
  
  // 2 points per line
  points += linesCompleted * 2;
  
  // 4 points for full bingo
  if (hasBingo) points += 4;
  
  // 1 point for corners bonus
  if (hasCorners) points += 1;
  
  // Multi-card bonus points
  points += multiCardBonus;
  
  return points;
};

// Generate a room code (5 alphanumeric characters)
export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Format time remaining in MM:SS format
export const formatTimeRemaining = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Announce number with proper formatting
export const announceNumber = (number: number): string => {
  const letter = getBingoLetter(number);
  return `${letter} ${number}`;
};