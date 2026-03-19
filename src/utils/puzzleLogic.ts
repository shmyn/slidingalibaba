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

export const shuffleBoard = (board: Tile[], size: number, moves: number = 1000): Tile[] => {
  let currentBoard = [...board];
  let emptyIndex = currentBoard.findIndex(t => t.isEmpty);

  for (let i = 0; i < moves; i++) {
    const validMoves = getValidMoves(emptyIndex, size);
    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    
    // Swap
    const temp = currentBoard[emptyIndex];
    currentBoard[emptyIndex] = currentBoard[randomMove];
    currentBoard[randomMove] = temp;
    
    emptyIndex = randomMove;
  }

  // Ensure it's not solved initially
  const targetWord = board.filter(t => !t.isEmpty).map(t => t.char).join('');
  if (isSolved(currentBoard, targetWord)) {
    return shuffleBoard(board, size, moves);
  }

  return currentBoard;
};
