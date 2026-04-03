export interface Tile {
  id: number;
  char: string;
  isEmpty: boolean;
}

export const createInitialBoard = (word: string, size: number): Tile[] => {
  const board: Tile[] = [];
  for (let i = 0; i < word.length; i++) {
    board.push({ id: i, char: word[i], isEmpty: false });
  }
  // Add empty tile at the end
  board.push({ id: word.length, char: '', isEmpty: true });
  return board;
};

export const isSolved = (board: Tile[], targetWord: string): boolean => {
  for (let i = 0; i < targetWord.length; i++) {
    if (board[i].char !== targetWord[i]) return false;
  }
  return board[board.length - 1].isEmpty;
};

export const getValidMoves = (emptyIndex: number, size: number): number[] => {
  const moves: number[] = [];
  const row = Math.floor(emptyIndex / size);
  const col = emptyIndex % size;

  if (row > 0) moves.push(emptyIndex - size); // up
  if (row < size - 1) moves.push(emptyIndex + size); // down
  if (col > 0) moves.push(emptyIndex - 1); // left
  if (col < size - 1) moves.push(emptyIndex + 1); // right

  return moves;
};

export const getManhattanDistance = (board: Tile[], size: number, targetWord: string): number => {
  let dist = 0;
  board.forEach((tile, i) => {
    if (tile.isEmpty) return;
    // Find target position of this character
    // Assuming characters are unique enough, or just use the tile's original ID
    // Since we created the board sequentially, tile.id is its target index
    const targetRow = Math.floor(tile.id / size);
    const targetCol = tile.id % size;
    const currentRow = Math.floor(i / size);
    const currentCol = i % size;
    dist += Math.abs(targetRow - currentRow) + Math.abs(targetCol - currentCol);
  });
  return dist;
};

export const shuffleBoard = (board: Tile[], size: number, moves: number = 1000): Tile[] => {
  let currentBoard = [...board];
  let emptyIndex = currentBoard.findIndex(t => t.isEmpty);
  let lastMove = -1;

  for (let i = 0; i < moves; i++) {
    const validMoves = getValidMoves(emptyIndex, size);
    // Avoid moving back to the previous position immediately to ensure better shuffling
    const filteredMoves = validMoves.filter(m => m !== lastMove);
    const possibleMoves = filteredMoves.length > 0 ? filteredMoves : validMoves;
    const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    
    // Swap
    const temp = currentBoard[emptyIndex];
    currentBoard[emptyIndex] = currentBoard[randomMove];
    currentBoard[randomMove] = temp;
    
    lastMove = emptyIndex;
    emptyIndex = randomMove;
  }

  // Ensure it's not solved initially and has a minimum Manhattan distance
  const targetWord = board.filter(t => !t.isEmpty).map(t => t.char).join('');
  const minDistance = size === 3 ? 10 : 20;
  
  if (isSolved(currentBoard, targetWord) || getManhattanDistance(currentBoard, size, targetWord) < minDistance) {
    return shuffleBoard(board, size, moves);
  }

  return currentBoard;
};
