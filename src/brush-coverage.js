// Cobertura espacial dels traços del pinzell dins d'un mateix gest.
// Evita tornar a omplir zones ja pintades quan el punter es solapa o torna enrere;
// un gest nou comença amb una cobertura buida i pot afegir de nou.

export function createGestureCoverage(cellSize = 8) {
  if (!Number.isFinite(cellSize) || cellSize < 1 || cellSize > 64) {
    throw new RangeError('createGestureCoverage: cellSize ha de ser entre 1 i 64 mm');
  }
  const grid = new Map(), seen = new Set();
  const keyOf = (cx, cy) => (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) | 0;
  return {
    covers(x, y) {
      if (![x,y].every(v=>Number.isFinite(v)&&Math.abs(v)<=1000)) return false;
      const bin = grid.get(keyOf(Math.floor(x / cellSize), Math.floor(y / cellSize)));
      if (!bin) return false;
      for (let i = 0; i < bin.length; i += 1) {
        const c = bin[i];
        const dx = c[0] - x;
        const dy = c[1] - y;
        if (dx * dx + dy * dy < c[2] * c[2]) return true;
      }
      return false;
    },
    addCircle(x, y, radius) {
      if (![x,y].every(v=>Number.isFinite(v)&&Math.abs(v)<=1000) || !Number.isFinite(radius) || radius <= 0 || radius > 30) return false;
      const signature = `${x},${y},${radius}`;
      if (seen.has(signature)) return false;
      seen.add(signature);
      const circle = [x, y, radius];
      const x0 = Math.floor((x - radius) / cellSize);
      const x1 = Math.floor((x + radius) / cellSize);
      const y0 = Math.floor((y - radius) / cellSize);
      const y1 = Math.floor((y + radius) / cellSize);
      for (let cx = x0; cx <= x1; cx += 1) {
        for (let cy = y0; cy <= y1; cy += 1) {
          const key = keyOf(cx, cy);
          const bin = grid.get(key);
          if (bin) bin.push(circle);
          else grid.set(key, [circle]);
        }
      }
      return true;
    },
  };
}

// Desfés de gest sencer: retorna els traços sense l'últim gest (mateix identificador).
export function withoutLastGesture(strokes) {
  const result = strokes.slice();
  const last = result.at(-1)?.gesture;
  do {
    result.pop();
  } while (result.length && last !== undefined && result.at(-1).gesture === last);
  return result;
}
