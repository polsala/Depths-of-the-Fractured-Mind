/**
 * Mobile touch controls - Virtual D-pad for movement
 */

export interface MobileControls {
  container: HTMLElement;
  cleanup: () => void;
}

export interface ControlCallbacks {
  onMoveForward: () => void;
  onMoveBackward: () => void;
  onStrafeLeft: () => void;
  onStrafeRight: () => void;
  onTurnLeft: () => void;
  onTurnRight: () => void;
}

/**
 * Create mobile touch controls with a virtual D-pad
 */
export function createMobileControls(callbacks: ControlCallbacks): MobileControls {
  const container = document.createElement('div');
  container.className = 'mobile-controls';
  
  // Movement D-pad
  const movementPad = document.createElement('div');
  movementPad.className = 'movement-pad';
  
  // Forward button
  const forwardBtn = createControlButton('↑', 'control-btn forward-btn');
  forwardBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    callbacks.onMoveForward();
  });
  forwardBtn.addEventListener('click', (e) => {
    e.preventDefault();
    callbacks.onMoveForward();
  });
  
  // Backward button
  const backBtn = createControlButton('↓', 'control-btn back-btn');
  backBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    callbacks.onMoveBackward();
  });
  backBtn.addEventListener('click', (e) => {
    e.preventDefault();
    callbacks.onMoveBackward();
  });
  
  // Left button
  const leftBtn = createControlButton('←', 'control-btn left-btn');
  leftBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    callbacks.onStrafeLeft();
  });
  leftBtn.addEventListener('click', (e) => {
    e.preventDefault();
    callbacks.onStrafeLeft();
  });
  
  // Right button
  const rightBtn = createControlButton('→', 'control-btn right-btn');
  rightBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    callbacks.onStrafeRight();
  });
  rightBtn.addEventListener('click', (e) => {
    e.preventDefault();
    callbacks.onStrafeRight();
  });
  
  // Center placeholder
  const centerPlaceholder = document.createElement('div');
  centerPlaceholder.className = 'control-center';
  
  // Arrange D-pad in grid
  movementPad.appendChild(createEmptyCell());
  movementPad.appendChild(forwardBtn);
  movementPad.appendChild(createEmptyCell());
  movementPad.appendChild(leftBtn);
  movementPad.appendChild(centerPlaceholder);
  movementPad.appendChild(rightBtn);
  movementPad.appendChild(createEmptyCell());
  movementPad.appendChild(backBtn);
  movementPad.appendChild(createEmptyCell());
  
  container.appendChild(movementPad);
  
  // Rotation controls (separate section on the right)
  const rotationPad = document.createElement('div');
  rotationPad.className = 'rotation-pad';
  
  const turnLeftBtn = createControlButton('Q', 'control-btn turn-btn');
  turnLeftBtn.title = 'Turn Left';
  turnLeftBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    callbacks.onTurnLeft();
  });
  turnLeftBtn.addEventListener('click', (e) => {
    e.preventDefault();
    callbacks.onTurnLeft();
  });
  
  const turnRightBtn = createControlButton('E', 'control-btn turn-btn');
  turnRightBtn.title = 'Turn Right';
  turnRightBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    callbacks.onTurnRight();
  });
  turnRightBtn.addEventListener('click', (e) => {
    e.preventDefault();
    callbacks.onTurnRight();
  });
  
  const rotationLabel = document.createElement('div');
  rotationLabel.className = 'rotation-label';
  rotationLabel.textContent = 'Turn';
  
  rotationPad.appendChild(rotationLabel);
  rotationPad.appendChild(turnLeftBtn);
  rotationPad.appendChild(turnRightBtn);
  
  container.appendChild(rotationPad);
  
  const cleanup = () => {
    container.remove();
  };
  
  return { container, cleanup };
}

function createControlButton(text: string, className: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = text;
  button.className = className;
  // Prevent default touch behavior
  button.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  return button;
}

function createEmptyCell(): HTMLDivElement {
  const cell = document.createElement('div');
  cell.className = 'control-empty';
  return cell;
}
