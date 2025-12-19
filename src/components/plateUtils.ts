// Utility helpers for license plate validation
export const validateSwedishRegPlate = (plate: string): boolean => {
  const cleaned = plate.replace(/\s/g, '').toUpperCase();
  if (/[ÅÄÖ]/.test(cleaned)) return false;
  const modern = /^[A-Z]{3}\d{3}$/; // ABC123
  const alternative = /^[A-Z]{3}\d{2}[A-Z0-9]$/; // ABC12D or similar
  return modern.test(cleaned) || alternative.test(cleaned);
};

export default validateSwedishRegPlate;
