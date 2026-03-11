/** Calculate age in whole years from a birth date. */
export function calculateAge(birthDate: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function formatDogAge(birthDate: Date): string {
  const now = new Date();
  const months =
    (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
  if (months < 12) return `${months} mesi`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} ${years === 1 ? 'anno' : 'anni'}`;
  return `${years} ${years === 1 ? 'anno' : 'anni'} e ${remainingMonths} mesi`;
}
