export function formatDogAge(birthDate: Date): string {
  const now = new Date();
  const months = (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth());
  if (months < 12) return `${months} mesi`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} ${years === 1 ? 'anno' : 'anni'}`;
  return `${years} ${years === 1 ? 'anno' : 'anni'} e ${remainingMonths} mesi`;
}
