/* A grid model for the STEM chapter's programmable flight simulator.
   Coordinates are cells, north is +y, and heading is clockwise from north. */
(() => {
  'use strict';
  const limits = Object.freeze({ bound:10, maxDistance:10, maxCommands:24 });
  const vectors = [[0,1],[1,0],[0,-1],[-1,0]];

  function compile(commands) {
    let x = 0, y = 0, heading = 0;
    const states = [{ x, y, heading }];
    const reject = (code,index) => ({ ok:false, states, error:{ code, index } });
    if (!Array.isArray(commands) || !commands.length) return reject('empty',0);
    if (commands.length > limits.maxCommands) return reject('limit',limits.maxCommands);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const op = command?.op, amount = command?.amount;
      if (op === 'forward' || op === 'back') {
        if (!Number.isInteger(amount) || amount < 1 || amount > limits.maxDistance) return reject('amount',i);
        const [dx,dy] = vectors[heading / 90], distance = op === 'forward' ? amount : -amount;
        const nextX = x + dx * distance, nextY = y + dy * distance;
        if (Math.abs(nextX) > limits.bound || Math.abs(nextY) > limits.bound) return reject('bounds',i);
        x = nextX; y = nextY;
      } else if (op === 'left' || op === 'right') {
        if (amount !== 90 && amount !== 180 && amount !== 270) return reject('amount',i);
        heading = (heading + (op === 'right' ? amount : -amount) + 360) % 360;
      } else return reject('op',i);
      states.push({ x, y, heading });
    }
    return { ok:true, states, error:null };
  }

  const engine = Object.freeze({ limits, compile });
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  else globalThis.PORTFOLIO_FLIGHT_ENGINE = engine;
})();
