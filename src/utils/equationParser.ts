/**
 * Parse une équation linéaire en différentes formes
 * Supporte les formats :
 * - y = mx + b
 * - ax + by = c
 * - ax + by + c = 0
 */
export function parseEquation(equation: string): { a: number; b: number; c: number } | null {
  // Nettoyer l'équation
  let eq = equation.replace(/\s+/g, '').toLowerCase();
  
  // Si l'équation est sous la forme y = mx + b
  if (eq.startsWith('y=')) {
    const rightSide = eq.substring(2);
    const parts = rightSide.split(/[+-]/);
    let m = 0, b = 0;
    
    for (const part of parts) {
      if (part.includes('x')) {
        const coeff = part.replace('x', '') || '1';
        m = parseFloat(coeff);
      } else if (part) {
        b = parseFloat(part);
      }
    }
    
    // Convertir en forme standard ax + by + c = 0
    return { a: m, b: -1, c: b };
  }
  
  // Si l'équation est sous la forme ax + by = c ou similaire
  if (eq.includes('=')) {
    const [left, right] = eq.split('=');
    
    // Déplacer tout à gauche pour avoir ax + by + c = 0
    const leftTerms = parseTerms(left);
    const rightTerms = parseTerms(right);
    
    // Soustraire les termes de droite
    const a = (leftTerms.x || 0) - (rightTerms.x || 0);
    const b = (leftTerms.y || 0) - (rightTerms.y || 0);
    const c = (leftTerms.constant || 0) - (rightTerms.constant || 0);
    
    return { a, b, c };
  }
  
  return null;
}

function parseTerms(expression: string): { x?: number; y?: number; constant?: number } {
  const terms = { x: 0, y: 0, constant: 0 };
  
  // Ajouter un signe + si nécessaire pour le premier terme
  const expr = expression.startsWith('-') ? expression : `+${expression}`;
  
  // Trouver tous les termes avec leurs signes
  const termPattern = /([+-]?\s*\d*\.?\d*[xy]?)/g;
  let match;
  
  while ((match = termPattern.exec(expr)) !== null) {
    const term = match[0].trim();
    if (!term) continue;
    
    const sign = term.startsWith('-') ? -1 : 1;
    const value = term.replace(/[+-]/g, '') || '1';
    
    if (value.includes('x')) {
      const coeff = parseFloat(value.replace('x', '') || '1');
      terms.x = (terms.x || 0) + sign * coeff;
    } else if (value.includes('y')) {
      const coeff = parseFloat(value.replace('y', '') || '1');
      terms.y = (terms.y || 0) + sign * coeff;
    } else if (value) {
      terms.constant = (terms.constant || 0) + sign * parseFloat(value);
    }
  }
  
  return terms;
}

/**
 * Convertit les coefficients d'une équation en format lisible
 */
export function formatEquation(equation: { a: number; b: number; c: number }): string {
  const { a, b, c } = equation;
  const parts = [];
  
  if (a !== 0) {
    const xTerm = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
    parts.push(xTerm);
  }
  
  if (b !== 0) {
    const sign = b > 0 ? ' + ' : ' - ';
    const absB = Math.abs(b);
    const yTerm = absB === 1 ? 'y' : `${absB}y`;
    parts.push(sign + yTerm);
  }
  
  if (c !== 0) {
    const sign = c > 0 ? ' + ' : ' - ';
    parts.push(sign + Math.abs(c));
  }
  
  if (parts.length === 0) return '0 = 0';
  
  return parts.join('') + ' = 0';
}

/**
 * Vérifie si une solution est correcte pour une équation donnée
 */
export function checkSolution(
  equation: { a: number; b: number; c: number },
  x: number,
  y: number
): boolean {
  const { a, b, c } = equation;
  const result = a * x + b * y + c;
  // Vérifier si le résultat est proche de zéro (pour gérer les erreurs d'arrondi)
  return Math.abs(result) < 0.0001;
}
