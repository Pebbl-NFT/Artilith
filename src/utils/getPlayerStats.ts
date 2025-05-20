export function getPlayerStats(inventory: any[]) {
  const baseStats = {
    health: 20,
    attack: 1,
    defense: 0,
  };

  inventory.forEach((item) => {
    if (item.equipped) {
      baseStats.attack += item.damage || 0;
      baseStats.defense += item.defense || 0;
    }
  });

  return baseStats;
}
