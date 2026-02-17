export const setMemory = (item: Record<string, any>) => {
  localStorage.setItem('minecraft-memory', JSON.stringify(item));
}

export const getMemory = () => {
  const memory = localStorage.getItem('minecraft-memory');
  return memory ? JSON.parse(memory) : undefined
}
