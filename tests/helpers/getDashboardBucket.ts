export function getSessionBucket() {
  return Object.keys(localStorage).find(k => k.startsWith('image#'))!;
}

