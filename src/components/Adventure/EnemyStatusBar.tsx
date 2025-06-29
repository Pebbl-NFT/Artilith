// src/components/Adventure/EnemyStatusBar.tsx
import React, { CSSProperties } from 'react';

interface Enemy {
  name: string;
  health: number;
  maxHealth: number;
  attack?: number;
  defense?: number;
}

interface EnemyStatusBarProps {
  enemy: Enemy | null;
  stage: number;
}

const styles: { [key: string]: CSSProperties } = {
  container: {
    padding: '10px 15px',
    marginBottom: '10px',
    backgroundColor: 'rgba(120, 20, 20, 0.4)',
    border: '1px solid rgba(255, 100, 100, 0.3)',
    borderRadius: '12px',
    color: '#fff',
    textAlign: 'center',
    animation: 'fadeIn 0.5s ease',
  },
  enemyName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
    textShadow: '1px 1px 3px rgba(0,0,0,0.7)',
  },
  statsContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    marginTop: '8px',
  },
  stat: {
    fontSize: '14px',
  }
};

export const EnemyStatusBar: React.FC<EnemyStatusBarProps> = ({ enemy, stage }) => {
  if (!enemy) return null;

  return (
    <div style={styles.container}>
      <h3 style={styles.enemyName}>{enemy.name} (Етап {stage})</h3>
      <div style={styles.statsContainer}>
        <span style={styles.stat}>❤️ {enemy.health ?? '?'} / {enemy.maxHealth ?? '?'}</span>
        <span style={styles.stat}>🗡️ {enemy.attack ?? '?'}</span>
        <span style={styles.stat}>🛡️ {enemy.defense ?? '?'}</span>
      </div>
    </div>
  );
}; 