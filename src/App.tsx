import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Skull, Coins, Trophy, FastForward, Heart } from 'lucide-react';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const MAX_WAVE = 30;

type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';
type ZombieType = 'normal' | 'runner' | 'tank' | 'dodger' | 'boss' | 'flying' | 'disabler';

interface ZombieDef {
  type: ZombieType;
  hpMult: number;
  speedMult: number;
  sizeMult: number;
  color: string;
  coreColor: string;
  armor?: number;
  isFlying?: boolean;
}

const ZOMBIE_TYPES: Record<ZombieType, ZombieDef> = {
  normal: { type: 'normal', hpMult: 1, speedMult: 1, sizeMult: 1, color: '#166534', coreColor: '#22c55e' },
  runner: { type: 'runner', hpMult: 0.4, speedMult: 2.5, sizeMult: 0.7, color: '#b45309', coreColor: '#f59e0b' },
  tank: { type: 'tank', hpMult: 4, speedMult: 0.4, sizeMult: 1.3, color: '#374151', coreColor: '#6b7280', armor: 0.5 },
  dodger: { type: 'dodger', hpMult: 0.8, speedMult: 1.2, sizeMult: 0.9, color: '#4c1d95', coreColor: '#8b5cf6' },
  flying: { type: 'flying', hpMult: 0.6, speedMult: 1.8, sizeMult: 0.8, color: '#0369a1', coreColor: '#38bdf8', isFlying: true },
  disabler: { type: 'disabler', hpMult: 1.5, speedMult: 0.7, sizeMult: 1.1, color: '#831843', coreColor: '#f472b6' },
  boss: { type: 'boss', hpMult: 25, speedMult: 0.6, sizeMult: 2, color: '#7f1d1d', coreColor: '#ef4444' },
};

const PIXEL_ART: Record<string, string[]> = {
  'rat': [
    "  ##    ",
    " ####   ",
    "## # ## ",
    "####### ",
    " #####  ",
    "  ###   ",
    "  # #   ",
    "        "
  ],
  'ox': [
    "#    #  ",
    "##  ##  ",
    "######  ",
    " ####   ",
    " ####   ",
    "  ##    ",
    "  ##    ",
    "        "
  ],
  'tiger': [
    "  ##  ##",
    "  ######",
    "  # # ##",
    "  ######",
    "   #### ",
    "   #  # ",
    "        ",
    "        "
  ],
  'rabbit': [
    " #   #  ",
    " #   #  ",
    " ## ##  ",
    " #####  ",
    "  ###   ",
    "  # #   ",
    "        ",
    "        "
  ],
  'dragon': [
    " # # #  ",
    "########",
    " # ###  ",
    "  ####  ",
    "  #  #  ",
    "        ",
    "        ",
    "        "
  ],
  'snake': [
    "   ##   ",
    "  #  #  ",
    "   #    ",
    "    #   ",
    "   #    ",
    "  #     ",
    " ###### ",
    "        "
  ],
  'horse': [
    "   ##   ",
    "  ####  ",
    " #####  ",
    "   ###  ",
    "   # #  ",
    "        ",
    "        ",
    "        "
  ],
  'goat': [
    " ##  ## ",
    "  ####  ",
    "  ####  ",
    "   ##   ",
    "   ##   ",
    "        ",
    "        ",
    "        "
  ],
  'monkey': [
    "  ####  ",
    " # ## # ",
    " ###### ",
    "  ####  ",
    "  #  #  ",
    "        ",
    "        ",
    "        "
  ],
  'rooster': [
    "   #    ",
    "  ###   ",
    " #####  ",
    "  ###   ",
    "   #    ",
    "  # #   ",
    "        ",
    "        "
  ],
  'dog': [
    "  #  #  ",
    "  ####  ",
    " ###### ",
    "  ####  ",
    "  #  #  ",
    "        ",
    "        ",
    "        "
  ],
  'pig': [
    "  ####  ",
    " ###### ",
    " # ## # ",
    " ###### ",
    "  ####  ",
    "  #  #  ",
    "        ",
    "        "
  ]
};

type TowerEffect = 'fast_straight' | 'shockwave' | 'pierce' | 'aoe_slow' | 'explosive' | 'poison' | 'dual' | 'taunt' | 'bounce' | 'stun' | 'crit' | 'sticky';

interface TowerTemplate {
  id: string;
  name: string;
  role: 'Attack' | 'Defense';
  hp: number;
  damage: number;
  fireRate: number;
  range: number;
  effect: TowerEffect;
  effectDesc: string;
  color: string;
  rarity: Rarity;
}

const TOWER_TEMPLATES: Record<string, TowerTemplate> = {
  'rat': { id: 'rat', name: '子鼠', role: 'Attack', hp: 320, damage: 42, fireRate: 2.0, range: 300, effect: 'fast_straight', effectDesc: '极速单体', color: '#9ca3af', rarity: 'N' },
  'ox': { id: 'ox', name: '丑牛', role: 'Defense', hp: 720, damage: 15, fireRate: 0.7, range: 180, effect: 'shockwave', effectDesc: '直线击退', color: '#8b5cf6', rarity: 'R' },
  'tiger': { id: 'tiger', name: '寅虎', role: 'Attack', hp: 380, damage: 58, fireRate: 1.2, range: 320, effect: 'pierce', effectDesc: '直线穿透', color: '#f59e0b', rarity: 'SR' },
  'rabbit': { id: 'rabbit', name: '卯兔', role: 'Defense', hp: 580, damage: 18, fireRate: 1.5, range: 280, effect: 'aoe_slow', effectDesc: '范围减速', color: '#fbcfe8', rarity: 'R' },
  'dragon': { id: 'dragon', name: '辰龙', role: 'Attack', hp: 420, damage: 70, fireRate: 0.9, range: 400, effect: 'explosive', effectDesc: '范围爆炸', color: '#ef4444', rarity: 'UR' },
  'snake': { id: 'snake', name: '巳蛇', role: 'Defense', hp: 640, damage: 12, fireRate: 1.1, range: 260, effect: 'poison', effectDesc: '持续中毒', color: '#10b981', rarity: 'SR' },
  'horse': { id: 'horse', name: '午马', role: 'Attack', hp: 350, damage: 48, fireRate: 1.8, range: 270, effect: 'dual', effectDesc: '双重射击', color: '#f97316', rarity: 'SSR' },
  'goat': { id: 'goat', name: '未羊', role: 'Defense', hp: 700, damage: 10, fireRate: 0.6, range: 220, effect: 'taunt', effectDesc: '嘲讽敌人', color: '#f3f4f6', rarity: 'R' },
  'monkey': { id: 'monkey', name: '申猴', role: 'Attack', hp: 300, damage: 38, fireRate: 1.4, range: 300, effect: 'bounce', effectDesc: '弹射攻击', color: '#d97706', rarity: 'SR' },
  'rooster': { id: 'rooster', name: '酉鸡', role: 'Defense', hp: 620, damage: 14, fireRate: 1.0, range: 280, effect: 'stun', effectDesc: '概率眩晕', color: '#fcd34d', rarity: 'SSR' },
  'dog': { id: 'dog', name: '戌狗', role: 'Attack', hp: 360, damage: 52, fireRate: 1.6, range: 310, effect: 'crit', effectDesc: '高暴击率', color: '#a16207', rarity: 'SR' },
  'pig': { id: 'pig', name: '亥猪', role: 'Defense', hp: 780, damage: 8, fireRate: 0.8, range: 200, effect: 'sticky', effectDesc: '强力减速', color: '#f472b6', rarity: 'R' },
};

const RARITY_RATES: { rarity: Rarity; rate: number }[] = [
  { rarity: 'UR', rate: 0.01 },
  { rarity: 'SSR', rate: 0.05 },
  { rarity: 'SR', rate: 0.15 },
  { rarity: 'R', rate: 0.30 },
  { rarity: 'N', rate: 0.49 },
];

const RELIC_POOL = [
  { id: 'dmg', name: '力量菠菜', desc: '所有伤害 +50%', icon: '💪', effect: (s: any) => s.relics.damageMult += 0.5 },
  { id: 'spd', name: '狂暴药水', desc: '攻击速度 +30%', icon: '⚡', effect: (s: any) => s.relics.fireRateMult += 0.3 },
  { id: 'coin', name: '招财猫', desc: '金币获取 +50%', icon: '🐱', effect: (s: any) => s.relics.coinMult += 0.5 },
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [uiCoins, setUiCoins] = useState(1000);
  const [uiWave, setUiWave] = useState(1);
  const [uiLives, setUiLives] = useState(5);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [gachaResults, setGachaResults] = useState<TowerTemplate[] | null>(null);
  const [relicChoice, setRelicChoice] = useState<any[] | null>(null);

  const [showBackpack, setShowBackpack] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [fuseAnim, setFuseAnim] = useState<string | null>(null);
  const [, forceUpdate] = useState({});

  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  const draggingTowerIndex = useRef<number | null>(null);
  const dragOffset = useRef<{x: number, y: number}>({x: 0, y: 0});

  const gameState = useRef({
    coins: 1000,
    wave: 1,
    lives: 5,
    zombies: [] as any[],
    projectiles: [] as any[],
    particles: [] as any[],
    floatingTexts: [] as any[],
    backpack: {} as Record<string, number>,
    deployed: [] as { uid: number, id: string, level: number, x: number, y: number, hp: number, maxHp: number, disabledTimer?: number }[],
    unlockedSlots: 1,
    slotFireTimes: [] as number[],
    lastSpawnTime: 0,
    zombiesSpawnedThisWave: 0,
    waveActive: true,
    isPaused: false,
    isGameOver: false,
    isVictory: false,
    pendingRelicChoice: false,
    flash: 0,
    freezeTimer: 0,
    nukeFlash: 0,
    relics: {
      damageMult: 1,
      fireRateMult: 1,
      coinMult: 1,
    }
  });

  const handle10Pull = useCallback(() => {
    if (gameState.current.coins < 100) return;
    gameState.current.coins -= 100;

    const results: TowerTemplate[] = [];
    let hasUR = false;
    let hasSSR = false;

    for (let i = 0; i < 10; i++) {
      const rand = Math.random();
      let cumulative = 0;
      let selectedRarity: Rarity = 'N';
      for (const rate of RARITY_RATES) {
        cumulative += rate.rate;
        if (rand <= cumulative) {
          selectedRarity = rate.rarity;
          break;
        }
      }
      
      if (selectedRarity === 'UR') hasUR = true;
      if (selectedRarity === 'SSR') hasSSR = true;

      const availableTowers = Object.values(TOWER_TEMPLATES).filter(t => t.rarity === selectedRarity);
      const tower = availableTowers[Math.floor(Math.random() * availableTowers.length)];
      results.push(tower);
      
      const key = `${tower.id}_1`;
      if (!gameState.current.backpack[key]) {
        gameState.current.backpack[key] = 1;
      } else {
        gameState.current.backpack[key]++;
      }
    }

    setGachaResults(results);

    // 抽卡即大招 (Pull-triggered Ultimates)
    if (hasUR) {
      gameState.current.nukeFlash = 1;
      gameState.current.zombies.forEach(z => {
        z.hp -= 5000; // 天罚巨额伤害
      });
      gameState.current.floatingTexts.push({
        x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 3,
        text: "UR降临! 天罚清屏!", color: '#ef4444', life: 3, maxLife: 3, isUltimate: true
      });
    } else if (hasSSR) {
      gameState.current.freezeTimer = 3000;
      gameState.current.floatingTexts.push({
        x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 3,
        text: "SSR降临! 全体时停!", color: '#3b82f6', life: 3, maxLife: 3, isUltimate: true
      });
    }
  }, []);

  const handleRelicSelect = (relic: any) => {
    relic.effect(gameState.current);
    gameState.current.isPaused = false;
    setRelicChoice(null);
  };

  const resolveTowerCollisions = useCallback((state: any, activeIndex: number = -1) => {
    const TOWER_RADIUS = 20;
    const MIN_Y = CANVAS_HEIGHT * (4/7) + 20;
    let resolved = false;
    let iterations = 0;
    
    while (!resolved && iterations < 10) {
      resolved = true;
      for (let i = 0; i < state.deployed.length; i++) {
        for (let j = i + 1; j < state.deployed.length; j++) {
          const t1 = state.deployed[i];
          const t2 = state.deployed[j];
          const dx = t2.x - t1.x;
          const dy = t2.y - t1.y;
          const dist = Math.hypot(dx, dy);
          
          if (dist < TOWER_RADIUS * 2) {
            resolved = false;
            const overlap = TOWER_RADIUS * 2 - dist;
            const nx = dist > 0 ? dx / dist : 1;
            const ny = dist > 0 ? dy / dist : 0;
            
            if (i === activeIndex) {
              t2.x += nx * overlap;
              t2.y += ny * overlap;
            } else if (j === activeIndex) {
              t1.x -= nx * overlap;
              t1.y -= ny * overlap;
            } else {
              t1.x -= nx * overlap / 2;
              t1.y -= ny * overlap / 2;
              t2.x += nx * overlap / 2;
              t2.y += ny * overlap / 2;
            }
            
            t1.x = Math.max(20, Math.min(CANVAS_WIDTH - 20, t1.x));
            t1.y = Math.max(MIN_Y, Math.min(CANVAS_HEIGHT - 20, t1.y));
            t2.x = Math.max(20, Math.min(CANVAS_WIDTH - 20, t2.x));
            t2.y = Math.max(MIN_Y, Math.min(CANVAS_HEIGHT - 20, t2.y));
          }
        }
      }
      iterations++;
    }
  }, []);

  const handleEquip = (key: string) => {
    const [id, levelStr] = key.split('_');
    const level = parseInt(levelStr);
    const state = gameState.current;
    
    if (state.deployed.length < state.unlockedSlots) {
      const template = TOWER_TEMPLATES[id];
      const maxHp = template.hp * (1 + (level - 1) * 0.5);
      const offsetX = (state.deployed.length % 5) * 60 - 120;
      state.deployed.push({ 
        uid: Math.random(),
        id, 
        level, 
        x: CANVAS_WIDTH / 2 + offsetX, 
        y: CANVAS_HEIGHT - 120, 
        hp: maxHp, 
        maxHp 
      });
      state.slotFireTimes.push(0);
      state.backpack[key]--;
      if (state.backpack[key] === 0) delete state.backpack[key];
      
      resolveTowerCollisions(state);
      
      setSelectedCard(null);
      forceUpdate({});
    }
  };

  const handleUnequip = (index: number) => {
    const state = gameState.current;
    const tower = state.deployed[index];
    if (tower) {
      const key = `${tower.id}_${tower.level}`;
      state.backpack[key] = (state.backpack[key] || 0) + 1;
      state.deployed.splice(index, 1);
      state.slotFireTimes.splice(index, 1);
      forceUpdate({});
    }
  };

  const handleFuse = (key: string) => {
    const [id, levelStr] = key.split('_');
    const level = parseInt(levelStr);
    const state = gameState.current;
    
    if (state.backpack[key] >= 2) {
      state.backpack[key] -= 2;
      if (state.backpack[key] === 0) delete state.backpack[key];
      
      const nextKey = `${id}_${level + 1}`;
      state.backpack[nextKey] = (state.backpack[nextKey] || 0) + 1;
      setSelectedCard(nextKey);
      setFuseAnim(nextKey);
      setTimeout(() => setFuseAnim(null), 500);
      forceUpdate({});
    }
  };

  const handleBackpackCardClick = (key: string) => {
    if (clickTimeout.current) {
      // Double click
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      handleEquip(key);
    } else {
      // Single click
      clickTimeout.current = setTimeout(() => {
        clickTimeout.current = null;
        if (selectedCard === key) {
          if (gameState.current.backpack[key] >= 2) {
            handleFuse(key);
          } else {
            setSelectedCard(null);
          }
        } else {
          setSelectedCard(key);
        }
      }, 250);
    }
  };

  const handleDeployedCardClick = (index: number) => {
    const state = gameState.current;
    const tower = state.deployed[index];
    if (!tower) return;
    
    const key = `${tower.id}_${tower.level}`;
    
    if (selectedCard === key && state.backpack[key] >= 1) {
      // Fuse backpack card into deployed card
      state.backpack[key]--;
      if (state.backpack[key] === 0) delete state.backpack[key];
      
      tower.level++;
      const template = TOWER_TEMPLATES[tower.id];
      tower.maxHp = template.hp * (1 + (tower.level - 1) * 0.5);
      tower.hp = tower.maxHp;
      
      setSelectedCard(null);
      setFuseAnim(`deployed_${index}`);
      setTimeout(() => setFuseAnim(null), 500);
      forceUpdate({});
    } else {
      // Undeploy
      handleUnequip(index);
      setSelectedCard(null);
    }
  };

  const handleUnlockSlot = () => {
    const state = gameState.current;
    if (state.unlockedSlots < 5 && state.coins >= 500) {
      state.coins -= 500;
      state.unlockedSlots++;
      forceUpdate({});
    }
  };

  const handleRestart = useCallback(() => {
    gameState.current = {
      coins: 1000,
      wave: 1,
      lives: 5,
      zombies: [],
      projectiles: [],
      particles: [],
      floatingTexts: [],
      backpack: {},
      deployed: [],
      unlockedSlots: 1,
      slotFireTimes: [],
      lastSpawnTime: 0,
      zombiesSpawnedThisWave: 0,
      waveActive: true,
      isPaused: false,
      isGameOver: false,
      isVictory: false,
      pendingRelicChoice: false,
      flash: 0,
      freezeTimer: 0,
      nukeFlash: 0,
      relics: {
        damageMult: 1,
        fireRateMult: 1,
        coinMult: 1,
      }
    };
    setGachaResults(null);
    setRelicChoice(null);
    setIsGameOver(false);
    setIsVictory(false);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const state = gameState.current;
    for (let i = state.deployed.length - 1; i >= 0; i--) {
      const tower = state.deployed[i];
      if (x >= tower.x - 20 && x <= tower.x + 20 && y >= tower.y - 20 && y <= tower.y + 20) {
        draggingTowerIndex.current = i;
        dragOffset.current = { x: x - tower.x, y: y - tower.y };
        break;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingTowerIndex.current === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const state = gameState.current;
    const tower = state.deployed[draggingTowerIndex.current];
    if (tower) {
      let newX = x - dragOffset.current.x;
      let newY = y - dragOffset.current.y;
      
      newX = Math.max(20, Math.min(CANVAS_WIDTH - 20, newX));
      const minY = CANVAS_HEIGHT * (4/7) + 20;
      newY = Math.max(minY, Math.min(CANVAS_HEIGHT - 20, newY));
      
      tower.x = newX;
      tower.y = newY;
      
      resolveTowerCollisions(state, draggingTowerIndex.current);
    }
  };

  const handlePointerUp = () => {
    draggingTowerIndex.current = null;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setUiCoins(Math.floor(gameState.current.coins));
      setUiWave(gameState.current.wave);
      setUiLives(gameState.current.lives);
      setIsGameOver(gameState.current.isGameOver);
      setIsVictory(gameState.current.isVictory);
      
      if (gameState.current.pendingRelicChoice) {
        setRelicChoice([...RELIC_POOL].sort(() => Math.random() - 0.5).slice(0, 3));
        gameState.current.pendingRelicChoice = false;
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const update = (dt: number) => {
      const state = gameState.current;
      if (state.isPaused || state.isGameOver || state.isVictory) return;

      // Spawning
      if (state.waveActive) {
        state.lastSpawnTime += dt;
        const isBossWave = state.wave % 10 === 0;
        const spawnInterval = isBossWave ? 3000 : Math.max(150, 1000 - state.wave * 30);
        const zombiesToSpawn = isBossWave ? 1 : 15 + Math.floor(state.wave * 2.5);

        if (state.zombiesSpawnedThisWave < zombiesToSpawn && state.lastSpawnTime > spawnInterval) {
          state.lastSpawnTime = 0;
          state.zombiesSpawnedThisWave++;
          
          let zType: ZombieType = 'normal';
          if (!isBossWave) {
            const availableTypes: ZombieType[] = ['normal', 'normal', 'normal']; // More normal zombies
            if (state.wave >= 2) availableTypes.push('runner', 'runner');
            if (state.wave >= 4) availableTypes.push('tank');
            if (state.wave >= 6) availableTypes.push('dodger', 'dodger');
            if (state.wave >= 8) availableTypes.push('flying', 'flying');
            if (state.wave >= 10) availableTypes.push('disabler');
            zType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
          } else {
            zType = 'boss';
          }

          const def = ZOMBIE_TYPES[zType];
          const baseHp = 50 * Math.pow(1.18, state.wave - 1); // Increased HP scaling from 1.15 to 1.18
          const hp = baseHp * def.hpMult;
          const size = 30 * def.sizeMult;
          const speed = (30 + Math.random() * 20) * (1 + state.wave * 0.05) * def.speedMult;
          
          state.zombies.push({
            id: Math.random(),
            type: zType,
            def: def,
            x: Math.random() * (CANVAS_WIDTH - size),
            y: -size,
            width: size,
            height: size,
            hp: hp,
            maxHp: hp,
            speed: speed,
            isBoss: isBossWave,
            dodgeTimer: 0,
            freezeTimer: 0,
            burnTimer: 0,
            burnDamage: 0,
            disableCooldown: 0
          });
        } else if (state.zombiesSpawnedThisWave >= zombiesToSpawn && state.zombies.length === 0) {
          if (state.wave >= MAX_WAVE) {
            state.isVictory = true;
          } else {
            state.wave++;
            state.zombiesSpawnedThisWave = 0;
            if ((state.wave - 1) % 10 === 0 && (state.wave - 1) > 0) {
              state.isPaused = true;
              state.pendingRelicChoice = true;
            }
          }
        }
      }

      // Firing
      const now = performance.now();
      state.deployed.forEach((tower, index) => {
        if (!tower) return;
        
        if (tower.disabledTimer && tower.disabledTimer > 0) {
          tower.disabledTimer -= dt;
          return; // Skip firing if disabled
        }

        const template = TOWER_TEMPLATES[tower.id];
        if (!template) return;
        const level = tower.level;

        const fireRate = (template.fireRate * state.relics.fireRateMult);
        const fireInterval = 1000 / fireRate;
        
        if (now - state.slotFireTimes[index] > fireInterval) {
          let target = null;
          let minDist = template.range;
          const slotX = tower.x;
          const slotY = tower.y;

          for (const z of state.zombies) {
            const dist = Math.hypot(z.x + z.width/2 - slotX, z.y + z.height/2 - slotY);
            if (dist < minDist) {
              minDist = dist;
              target = z;
            }
          }

          if (target) {
            state.slotFireTimes[index] = now;
            const damage = template.damage * (1 + (level - 1) * 0.5) * state.relics.damageMult;
            
            const spawnProj = (offset: number) => {
              const tx = target.x + target.width / 2;
              const ty = target.y + target.height / 2;
              const initialAngle = Math.atan2(ty - slotY, tx - slotX) + offset;
              
              let speed = 400;
              let size = 8;
              if (template.effect === 'fast_straight') speed = 800;
              if (template.effect === 'shockwave') { size = 30; speed = 300; }
              if (template.effect === 'pierce') { speed = 600; size = 10; }
              if (template.effect === 'explosive') size = 12;

              state.projectiles.push({
                id: Math.random(),
                x: slotX,
                y: slotY,
                targetId: target.id,
                sourceTowerUid: tower.uid,
                damage: damage,
                color: template.color,
                speed: speed,
                angle: initialAngle,
                size: size,
                effect: template.effect,
                pierced: []
              });
            };

            if (template.effect === 'dual') {
              spawnProj(-0.2);
              spawnProj(0.2);
            } else {
              spawnProj(0);
            }
          }
        }
      });

      // Projectiles Movement
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        const target = state.zombies.find(z => z.id === p.targetId);
        
        let angle = p.angle;
        
        // Homing for certain effects
        const isHoming = ['bounce', 'poison', 'stun', 'sticky', 'crit', 'aoe_slow', 'taunt', 'explosive'].includes(p.effect);
        
        if (isHoming && target) {
          const tx = target.x + target.width / 2;
          const ty = target.y + target.height / 2;
          angle = Math.atan2(ty - p.y, tx - p.x);
          p.angle = angle;
        }
        
        p.x += Math.cos(angle) * (p.speed * dt) / 1000;
        p.y += Math.sin(angle) * (p.speed * dt) / 1000;

        // Trail particles
        if (Math.random() < 0.4) {
          let pColor = p.color;
          if (p.effect === 'explosive') pColor = Math.random() < 0.5 ? '#ef4444' : '#f59e0b';
          if (p.effect === 'poison') pColor = '#10b981';
          if (p.effect === 'aoe_slow') pColor = '#60a5fa';
          if (p.effect === 'stun') pColor = '#fcd34d';
          state.particles.push({
            x: p.x, y: p.y,
            vx: -Math.cos(angle) * 50 + (Math.random() - 0.5) * 20,
            vy: -Math.sin(angle) * 50 + (Math.random() - 0.5) * 20,
            life: 0.3, maxLife: 0.3, color: pColor, size: Math.random() * 3 + 2
          });
        }

        // Out of bounds check
        if (p.y < -50 || p.y > CANVAS_HEIGHT + 50 || p.x < -50 || p.x > CANVAS_WIDTH + 50) {
          state.projectiles.splice(i, 1);
          continue;
        }

        // Collision
        let hitZombies = [];
        if (p.effect === 'pierce' || p.effect === 'shockwave') {
          hitZombies = state.zombies.filter(z => {
            if (z.def.isFlying && p.effect === 'shockwave') return false;
            return Math.hypot(z.x + z.width/2 - p.x, z.y + z.height/2 - p.y) < z.width/2 + p.size &&
                   !p.pierced?.includes(z.id);
          });
        } else {
          // For non-piercing, check any zombie in range that hasn't been hit
          const hitZ = state.zombies.find(z => {
            if (z.def.isFlying && p.effect === 'sticky') return false;
            return Math.hypot(z.x + z.width/2 - p.x, z.y + z.height/2 - p.y) < z.width/2 + p.size &&
                   !p.pierced?.includes(z.id);
          });
          if (hitZ) hitZombies = [hitZ];
        }

        if (hitZombies.length > 0) {
          let projDestroyed = false;

          hitZombies.forEach(z => {
            let actualDamage = p.damage;
            if (p.effect === 'crit' && Math.random() < 0.2) {
              actualDamage *= 2;
              state.floatingTexts.push({
                x: z.x, y: z.y - 30, text: "CRIT!", color: '#fbbf24', life: 1, maxLife: 1
              });
            }
            if (z.def.armor) actualDamage *= (1 - z.def.armor);
            z.hp -= actualDamage;

            p.pierced.push(z.id);
            
            // Apply effects
            if (p.effect === 'aoe_slow') {
              state.zombies.forEach(az => {
                if (!az.def.isFlying && Math.hypot(az.x - z.x, az.y - z.y) < 80) {
                  az.speed = Math.max(10, az.speed * 0.7);
                }
              });
              for (let i = 0; i < 15; i++) {
                state.particles.push({
                  x: z.x, y: z.y,
                  vx: (Math.random() - 0.5) * 150, vy: (Math.random() - 0.5) * 150,
                  life: 0.5, maxLife: 0.5, color: '#60a5fa', size: 4
                });
              }
            } else if (p.effect === 'explosive') {
              state.zombies.forEach(az => {
                if (!az.def.isFlying && az.id !== z.id && Math.hypot(az.x - z.x, az.y - z.y) < 60) {
                  az.hp -= p.damage * 0.5;
                }
              });
              for (let i = 0; i < 20; i++) {
                state.particles.push({
                  x: z.x, y: z.y,
                  vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200,
                  life: 0.4, maxLife: 0.4, color: '#ef4444', size: 5
                });
              }
            } else if (p.effect === 'poison') {
              z.burnTimer = 3000;
              z.burnDamage = p.damage * 0.5;
              for (let i = 0; i < 8; i++) {
                state.particles.push({
                  x: z.x, y: z.y,
                  vx: (Math.random() - 0.5) * 50, vy: -50 - Math.random() * 50,
                  life: 0.6, maxLife: 0.6, color: '#10b981', size: 3
                });
              }
            } else if (p.effect === 'stun') {
              if (Math.random() < 0.5) {
                z.freezeTimer = 800;
                for (let i = 0; i < 10; i++) {
                  state.particles.push({
                    x: z.x, y: z.y - 20,
                    vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 100,
                    life: 0.3, maxLife: 0.3, color: '#fcd34d', size: 2
                  });
                }
              }
            } else if (p.effect === 'sticky') {
              z.speed = Math.max(10, z.speed * 0.5);
              for (let i = 0; i < 10; i++) {
                state.particles.push({
                  x: z.x, y: z.y + z.height/2,
                  vx: (Math.random() - 0.5) * 80, vy: -20 - Math.random() * 30,
                  life: 0.5, maxLife: 0.5, color: '#f472b6', size: 4
                });
              }
            } else if (p.effect === 'shockwave') {
              z.y = Math.max(0, z.y - 20);
              for (let i = 0; i < 5; i++) {
                state.particles.push({
                  x: z.x, y: z.y,
                  vx: (Math.random() - 0.5) * 100, vy: -100 - Math.random() * 50,
                  life: 0.3, maxLife: 0.3, color: '#8b5cf6', size: 3
                });
              }
            } else if (p.effect === 'taunt') {
              z.tauntTargetUid = p.sourceTowerUid;
              z.tauntTimer = 2000;
              for (let i = 0; i < 5; i++) {
                state.particles.push({
                  x: z.x, y: z.y - 20,
                  vx: (Math.random() - 0.5) * 50, vy: -50 - Math.random() * 50,
                  life: 0.5, maxLife: 0.5, color: '#f3f4f6', size: 2
                });
              }
            } else if (p.effect === 'bounce') {
              if (!p.bounces) p.bounces = 0;
              if (p.bounces < 3) {
                p.bounces++;
                p.damage *= 0.7;
                const newTarget = state.zombies.find(nz => !p.pierced.includes(nz.id) && Math.hypot(nz.x - z.x, nz.y - z.y) < 150);
                if (newTarget) {
                  p.targetId = newTarget.id;
                } else {
                  projDestroyed = true;
                }
              } else {
                projDestroyed = true;
              }
            }

            // Generic hit particles for all projectiles
            for (let i = 0; i < 3; i++) {
              state.particles.push({
                x: z.x, y: z.y,
                vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 100,
                life: 0.2, maxLife: 0.2, color: p.color, size: 2
              });
            }

            if (p.effect !== 'pierce' && p.effect !== 'shockwave' && p.effect !== 'bounce') {
              projDestroyed = true;
            }

            state.floatingTexts.push({
              x: z.x + (Math.random() - 0.5) * 20,
              y: z.y - 20,
              text: Math.floor(actualDamage).toString(),
              color: z.def.armor ? '#9ca3af' : p.color,
              life: 0.8, maxLife: 0.8
            });

            for(let j=0; j<5; j++) {
              state.particles.push({
                x: p.x, y: p.y,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150,
                life: 0.4, maxLife: 0.4,
                color: p.color,
                size: 3 + Math.random() * 3
              });
            }

            if (z.hp <= 0) {
              const zIndex = state.zombies.findIndex(findZ => findZ.id === z.id);
              if (zIndex !== -1) {
                state.zombies.splice(zIndex, 1);
                const coinsEarned = Math.floor((z.isBoss ? 200 : 10) * state.relics.coinMult);
                state.coins += coinsEarned;
                
                state.floatingTexts.push({
                  x: z.x, y: z.y,
                  text: `+${coinsEarned}`,
                  color: '#fde047',
                  life: 1.2, maxLife: 1.2
                });

                for(let j=0; j<20; j++) {
                  state.particles.push({
                    x: z.x, y: z.y,
                    vx: (Math.random() - 0.5) * 250,
                    vy: (Math.random() - 0.5) * 250,
                    life: 0.8, maxLife: 0.8,
                    color: z.isBoss ? '#ef4444' : '#22c55e',
                    size: 4 + Math.random() * 4
                  });
                }
              }
            }
          });

          if (projDestroyed) {
            state.projectiles.splice(i, 1);
          }
        } else if (p.x < 0 || p.x > CANVAS_WIDTH || p.y < 0 || p.y > CANVAS_HEIGHT) {
           state.projectiles.splice(i, 1);
        }
      }

      // Zombie Movement
      if (state.freezeTimer > 0) {
        state.freezeTimer -= dt;
      }
      
      for (let i = state.zombies.length - 1; i >= 0; i--) {
        const z = state.zombies[i];
        
        if (z.burnTimer > 0) {
          z.burnTimer -= dt;
          z.hp -= (z.burnDamage * dt) / 1000;
          if (Math.random() < 0.1) {
            state.particles.push({
              x: z.x + z.width/2, y: z.y + z.height/2,
              vx: (Math.random() - 0.5) * 50,
              vy: -50 - Math.random() * 50,
              life: 0.5, maxLife: 0.5,
              color: '#f97316',
              size: 2 + Math.random() * 2
            });
          }
        }

        if (z.hp <= 0) {
          state.zombies.splice(i, 1);
          const coinsEarned = Math.floor((z.isBoss ? 200 : 10) * state.relics.coinMult);
          state.coins += coinsEarned;
          continue;
        }

        if (state.freezeTimer <= 0) {
          if (z.freezeTimer > 0) {
            z.freezeTimer -= dt;
          } else {
            let collidingTower = null;
            for (let j = 0; j < state.deployed.length; j++) {
              const t = state.deployed[j];
              if (Math.hypot(z.x + z.width/2 - t.x, z.y + z.height/2 - t.y) < z.width/2 + 20) {
                collidingTower = t;
                break;
              }
            }

            if (collidingTower) {
              collidingTower.hp -= (z.def.hpMult * 10 * dt) / 1000;
              if (collidingTower.hp <= 0) {
                const idx = state.deployed.indexOf(collidingTower);
                if (idx > -1) {
                  const key = `${collidingTower.id}_${collidingTower.level}`;
                  state.backpack[key] = (state.backpack[key] || 0) + 1;
                  state.deployed.splice(idx, 1);
                  state.slotFireTimes.splice(idx, 1);
                }
              }
            } else {
              if (z.tauntTimer > 0) {
                z.tauntTimer -= dt;
                const tauntTower = state.deployed.find(t => t.uid === z.tauntTargetUid);
                if (tauntTower) {
                  const angle = Math.atan2(tauntTower.y - (z.y + z.height/2), tauntTower.x - (z.x + z.width/2));
                  z.x += Math.cos(angle) * (z.speed * dt) / 1000;
                  z.y += Math.sin(angle) * (z.speed * dt) / 1000;
                } else {
                  z.y += (z.speed * dt) / 1000;
                }
              } else {
                z.y += (z.speed * dt) / 1000;
              }
              
              if (z.type === 'dodger') {
                z.dodgeTimer += dt;
                if (z.dodgeTimer > 2000) {
                  z.dodgeTimer = 0;
                  const dir = Math.random() > 0.5 ? 1 : -1;
                  z.x += dir * 50;
                  z.x = Math.max(0, Math.min(CANVAS_WIDTH - z.width, z.x));
                  
                  for(let j=0; j<8; j++) {
                    state.particles.push({
                      x: z.x + z.width/2, y: z.y + z.height/2,
                      vx: (Math.random() - 0.5) * 150,
                      vy: (Math.random() - 0.5) * 150,
                      life: 0.4, maxLife: 0.4,
                      color: z.def.coreColor,
                      size: 2 + Math.random() * 3
                    });
                  }
                }
              }

              if (z.type === 'disabler') {
                z.disableCooldown += dt;
                if (z.disableCooldown > 4000) {
                  z.disableCooldown = 0;
                  const activeTowers = state.deployed.filter(t => !t.disabledTimer || t.disabledTimer <= 0);
                  if (activeTowers.length > 0) {
                    const targetTower = activeTowers[Math.floor(Math.random() * activeTowers.length)];
                    targetTower.disabledTimer = 3000; // Disable for 3 seconds
                    
                    // Visual effect for disabling
                    state.floatingTexts.push({
                      x: targetTower.x, y: targetTower.y - 40,
                      text: "SILENCED!", color: '#f472b6', life: 1.5, maxLife: 1.5
                    });
                    
                    // Beam effect from zombie to tower
                    for(let j=0; j<15; j++) {
                      const t = j / 15;
                      state.particles.push({
                        x: z.x + z.width/2 + (targetTower.x - (z.x + z.width/2)) * t,
                        y: z.y + z.height/2 + (targetTower.y - (z.y + z.height/2)) * t,
                        vx: (Math.random() - 0.5) * 20,
                        vy: (Math.random() - 0.5) * 20,
                        life: 0.5, maxLife: 0.5,
                        color: '#f472b6',
                        size: 3
                      });
                    }
                  }
                }
              }
            }
          }
        }
        
        if (z.y > CANVAS_HEIGHT - 20) {
          state.zombies.splice(i, 1);
          state.lives -= 1;
          state.flash = 0.5;
          if (state.lives <= 0) {
            state.isGameOver = true;
          }
        }
      }

      // Particles & Texts
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += (p.vx * dt) / 1000;
        p.y += (p.vy * dt) / 1000;
        p.life -= dt / 1000;
        if (p.life <= 0) state.particles.splice(i, 1);
      }

      for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.floatingTexts[i];
        ft.y -= (40 * dt) / 1000;
        ft.life -= dt / 1000;
        if (ft.life <= 0) state.floatingTexts.splice(i, 1);
      }
    };

    const draw = () => {
      const state = gameState.current;

      // Background
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Flash
      if (state.flash > 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${state.flash})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        state.flash -= 0.02;
      }

      // Nuke Flash
      if (state.nukeFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${state.nukeFlash})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        state.nukeFlash -= 0.02;
      }

      // Sun
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH - 60, 60, 40, 0, Math.PI * 2);
      ctx.fill();

      // Zombies
      state.zombies.forEach(z => {
        const isFrozen = state.freezeTimer > 0 || z.freezeTimer > 0;
        const isBurned = z.burnTimer > 0;

        let drawY = z.y;
        if (z.def.isFlying) {
          // Draw shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.ellipse(z.x + z.width/2, z.y + z.height, z.width/2, z.width/4, 0, 0, Math.PI*2);
          ctx.fill();
          
          // Offset flying zombie upwards
          drawY = z.y - 20 + Math.sin(Date.now() / 200) * 5;
        }

        ctx.fillStyle = isFrozen ? '#60a5fa' : (isBurned ? '#f97316' : z.def.color);
        ctx.fillRect(z.x, drawY, z.width, z.height);
        
        ctx.fillStyle = isFrozen ? '#93c5fd' : (isBurned ? '#fdba74' : z.def.coreColor);
        ctx.fillRect(z.x + 2, drawY + 2, z.width - 4, z.height - 4);

        if (z.type === 'tank') {
          ctx.fillStyle = '#9ca3af';
          ctx.fillRect(z.x - 2, drawY + z.height/2 - 4, z.width + 4, 8);
          ctx.fillRect(z.x + z.width/2 - 4, drawY - 2, 8, z.height + 4);
        }

        ctx.fillStyle = '#fff';
        ctx.fillRect(z.x + z.width * 0.2, drawY + z.height * 0.2, z.width * 0.2, z.height * 0.2);
        ctx.fillRect(z.x + z.width * 0.6, drawY + z.height * 0.2, z.width * 0.2, z.height * 0.2);
        
        ctx.fillStyle = z.type === 'dodger' ? '#fde047' : '#000';
        ctx.fillRect(z.x + z.width * 0.3, drawY + z.height * 0.3, z.width * 0.1, z.height * 0.1);
        ctx.fillRect(z.x + z.width * 0.7, drawY + z.height * 0.3, z.width * 0.1, z.height * 0.1);

        ctx.fillStyle = '#000';
        ctx.fillRect(z.x, drawY - 12, z.width, 6);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(z.x + 1, drawY - 11, (z.width - 2) * Math.max(0, z.hp / z.maxHp), 4);
      });

      // Valid Placement Area
      const placementAreaY = CANVAS_HEIGHT * (4/7);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, placementAreaY, CANVAS_WIDTH, CANVAS_HEIGHT - placementAreaY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, placementAreaY);
      ctx.lineTo(CANVAS_WIDTH, placementAreaY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '16px VT323';
      ctx.textAlign = 'center';
      ctx.fillText('▼ 塔防部署区域 ▼', CANVAS_WIDTH / 2, placementAreaY + 20);

      // Deployed Towers
      state.deployed.forEach((tower, index) => {
        const template = TOWER_TEMPLATES[tower.id];
        const isDragging = draggingTowerIndex.current === index;
        
        ctx.save();
        ctx.translate(tower.x, tower.y);
        
        if (isDragging) {
          ctx.scale(1.1, 1.1);
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 10;
        }

        // Draw Tower Base
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 15, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw Pixel Art
        const art = PIXEL_ART[tower.id as keyof typeof PIXEL_ART] || PIXEL_ART.rat;
        const pixelSize = 4;
        const artWidth = art[0].length * pixelSize;
        const artHeight = art.length * pixelSize;
        const startX = -artWidth / 2;
        const startY = -artHeight / 2;

        const isDisabled = tower.disabledTimer && tower.disabledTimer > 0;
        if (isDisabled) {
          ctx.filter = 'grayscale(100%) brightness(50%)';
        }

        for (let r = 0; r < art.length; r++) {
          for (let c = 0; c < art[r].length; c++) {
            const colorCode = art[r][c];
            if (colorCode !== ' ') {
              ctx.fillStyle = colorCode === '#' ? template.color : (colorCode === 'D' ? '#000' : '#fff');
              ctx.fillRect(startX + c * pixelSize, startY + r * pixelSize, pixelSize, pixelSize);
            }
          }
        }

        if (isDisabled) {
          ctx.filter = 'none';
          ctx.fillStyle = '#f472b6';
          ctx.font = 'bold 16px VT323';
          ctx.textAlign = 'center';
          ctx.fillText('SILENCED', 0, -artHeight/2 - 5);
        }

        // Level Badge
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(15, -15, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px VT323';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`L${tower.level}`, 15, -15);

        // HP Bar
        ctx.fillStyle = '#000';
        ctx.fillRect(-20, 20, 40, 6);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-19, 21, 38 * Math.max(0, tower.hp / tower.maxHp), 4);

        ctx.restore();
      });

      // Projectiles
      state.projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        const size = p.size || 8;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        
        switch (p.effect) {
          case 'fast_straight': // Rat - Dart
            ctx.beginPath();
            ctx.moveTo(size, 0);
            ctx.lineTo(-size, size/1.5);
            ctx.lineTo(-size/2, 0);
            ctx.lineTo(-size, -size/1.5);
            ctx.fill();
            break;
          case 'shockwave': // Ox - Crescent
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.5, -Math.PI/3, Math.PI/3);
            ctx.lineWidth = 4;
            ctx.strokeStyle = p.color;
            ctx.stroke();
            break;
          case 'pierce': // Tiger - Spear
            ctx.fillRect(-size*1.5, -size/4, size*3, size/2);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(size*1.5, -size/4);
            ctx.lineTo(size*2, 0);
            ctx.lineTo(size*1.5, size/4);
            ctx.fill();
            break;
          case 'aoe_slow': // Rabbit - Snowflake
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              ctx.moveTo(0, 0);
              ctx.lineTo(size * Math.cos(i * Math.PI / 3), size * Math.sin(i * Math.PI / 3));
            }
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, size/3, 0, Math.PI*2);
            ctx.fill();
            break;
          case 'explosive': // Dragon - Fireball
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.2, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; // Outer aura
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.7, 0, Math.PI*2);
            ctx.fillStyle = '#f59e0b'; // Inner core
            ctx.fill();
            break;
          case 'poison': // Snake - Venom drop
            ctx.beginPath();
            ctx.moveTo(size, 0);
            ctx.quadraticCurveTo(0, size, -size, 0);
            ctx.quadraticCurveTo(0, -size, size, 0);
            ctx.fill();
            break;
          case 'dual': // Horse - Two arrows
            ctx.fillRect(-size, -size, size*1.5, size/3);
            ctx.fillRect(-size, size/1.5, size*1.5, size/3);
            break;
          case 'taunt': // Goat - Soundwave
            ctx.beginPath();
            ctx.arc(0, 0, size, -Math.PI/4, Math.PI/4);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, size*1.5, -Math.PI/4, Math.PI/4);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.stroke();
            break;
          case 'bounce': // Monkey - Boomerang
            ctx.rotate(Date.now() / 50); // Spinning
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI, true);
            ctx.quadraticCurveTo(0, -size/2, size, 0);
            ctx.fill();
            break;
          case 'stun': // Rooster - Lightning
            ctx.beginPath();
            ctx.moveTo(-size, -size);
            ctx.lineTo(0, -size/2);
            ctx.lineTo(size, -size);
            ctx.lineTo(size/2, 0);
            ctx.lineTo(size, size);
            ctx.lineTo(0, size/2);
            ctx.lineTo(-size, size);
            ctx.lineTo(-size/2, 0);
            ctx.fill();
            break;
          case 'crit': // Dog - Bone/Claw
            ctx.beginPath();
            ctx.arc(-size/2, -size/2, size/2, 0, Math.PI*2);
            ctx.arc(size/2, -size/2, size/2, 0, Math.PI*2);
            ctx.arc(0, size/2, size/1.5, 0, Math.PI*2);
            ctx.fill();
            break;
          case 'sticky': // Pig - Mud blob
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI*2);
            ctx.arc(-size/2, size/2, size/1.5, 0, Math.PI*2);
            ctx.arc(size/2, size/2, size/1.5, 0, Math.PI*2);
            ctx.fill();
            break;
          default:
            ctx.fillRect(-size/2, -size/2, size, size);
        }
        ctx.restore();
      });

      // Particles
      state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
      });
      ctx.globalAlpha = 1.0;

      // Floating Texts
      state.floatingTexts.forEach(ft => {
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = ft.life / ft.maxLife;
        ctx.font = ft.isUltimate ? 'bold 40px VT323' : '22px VT323';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = ft.isUltimate ? 5 : 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
      });
      ctx.globalAlpha = 1.0;
    };

    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      update(dt);
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#1a1a2e] flex justify-center items-center overflow-hidden font-pixel">
      {/* Game Container */}
      <div className="relative w-full max-w-md h-full shadow-2xl bg-[#87CEEB] flex flex-col overflow-hidden">
        
        {/* Top UI */}
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-10">
          <div className="flex flex-col gap-2">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2 border border-white/20">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-2xl text-white font-bold tracking-wider">{uiCoins}</span>
            </div>
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2 border border-white/20">
              <Heart className="w-5 h-5 text-pink-500" />
              <span className="text-2xl text-white font-bold tracking-wider">{uiLives}</span>
            </div>
          </div>
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2 border border-white/20">
            <Skull className="w-5 h-5 text-red-400" />
            <span className="text-2xl text-white font-bold tracking-wider">Wave {uiWave}</span>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative w-full overflow-hidden flex justify-center items-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="max-w-full max-h-full touch-none"
            style={{ objectFit: 'contain' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>
        
        {/* Bottom UI */}
        <div className="w-full bg-[#1a1a2e] p-4 flex justify-center gap-4 z-10 border-t-4 border-black/20 shrink-0">
          <button 
            onClick={() => setShowBackpack(true)}
            className="flex-1 py-3 rounded-xl font-bold text-xl shadow-[0_4px_0_rgb(0,0,0)] transition-transform active:translate-y-1 active:shadow-none flex justify-center items-center gap-2 border-2 border-black bg-blue-400 text-black hover:bg-blue-300"
          >
            🎒 背包
          </button>
          <button 
            onClick={handle10Pull}
            disabled={uiCoins < 100}
            className={`flex-1 py-3 rounded-xl font-bold text-xl shadow-[0_4px_0_rgb(0,0,0)] transition-transform active:translate-y-1 active:shadow-none flex justify-center items-center gap-2 border-2 border-black
              ${uiCoins >= 100 ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-gray-400 text-gray-600 cursor-not-allowed border-gray-600 shadow-[0_4px_0_rgb(75,85,99)]'}`}
          >
            <Sparkles className="w-5 h-5" />
            十连抽 (100)
          </button>
        </div>
      </div>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4 backdrop-blur-md"
          >
            <motion.h2 
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="text-6xl text-red-500 mb-4 font-black tracking-widest drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]"
            >
              GAME OVER
            </motion.h2>
            <p className="text-white/80 text-2xl mb-12">你防守到了第 <span className="text-yellow-400 font-bold text-3xl">{uiWave}</span> 波</p>
            
            <button 
              onClick={handleRestart}
              className="px-8 py-4 bg-white text-black rounded-xl font-bold text-3xl shadow-[0_6px_0_rgb(156,163,175)] transition-transform active:translate-y-2 active:shadow-none hover:bg-gray-200"
            >
              重新开始
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory Overlay */}
      <AnimatePresence>
        {isVictory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-50 p-4 backdrop-blur-md"
          >
            <motion.h2 
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="text-6xl text-yellow-500 mb-4 font-black tracking-widest drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]"
            >
              VICTORY!
            </motion.h2>
            <p className="text-black/80 text-2xl mb-12 font-bold">恭喜你通关了全部 {MAX_WAVE} 波！</p>
            
            <button 
              onClick={handleRestart}
              className="px-8 py-4 bg-yellow-400 text-black rounded-xl font-bold text-3xl shadow-[0_6px_0_rgb(202,138,4)] transition-transform active:translate-y-2 active:shadow-none hover:bg-yellow-300"
            >
              再爽一次
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Relic Choice Overlay */}
      <AnimatePresence>
        {relicChoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40 p-4 backdrop-blur-sm"
          >
            <motion.h2 
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              className="text-4xl text-yellow-400 mb-8 font-bold tracking-widest drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] flex items-center gap-3"
            >
              <Trophy className="w-10 h-10" />
              Boss 击破! 选择奖励
            </motion.h2>
            <div className="flex flex-col gap-4 w-full max-w-sm">
              {relicChoice.map((relic, i) => (
                <motion.button
                  key={i}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleRelicSelect(relic)}
                  className="bg-white/10 hover:bg-white/20 border-2 border-white/30 rounded-xl p-4 flex items-center gap-4 text-left transition-colors"
                >
                  <span className="text-4xl">{relic.icon}</span>
                  <div>
                    <h3 className="text-2xl text-white font-bold">{relic.name}</h3>
                    <p className="text-lg text-white/70">{relic.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gacha Results Overlay */}
      <AnimatePresence>
        {gachaResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4 backdrop-blur-sm cursor-pointer"
            onClick={() => setGachaResults(null)}
          >
            <motion.h2 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="text-5xl text-yellow-400 mb-12 font-bold tracking-widest drop-shadow-[0_0_15px_rgba(250,204,21,1)]"
            >
              欧气爆发!
            </motion.h2>
            <div className="grid grid-cols-5 gap-3 w-full max-w-md">
              {gachaResults.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, y: 100, rotate: -20 }}
                  animate={{ scale: 1, y: 0, rotate: 0 }}
                  transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 15 }}
                  className="aspect-[3/4] rounded-lg border-2 border-white/50 flex flex-col items-center justify-center relative shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden"
                  style={{ backgroundColor: card.color }}
                >
                  <motion.div 
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.1 }}
                    className="absolute inset-0 w-1/2 h-full bg-white/30 skew-x-12"
                  />
                  <span className="text-white font-black text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] relative z-10">
                    {card.rarity}
                  </span>
                  <span className="text-white/90 text-sm font-bold mt-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] relative z-10">
                    {card.name}
                  </span>
                  {(card.rarity === 'UR' || card.rarity === 'SSR') && (
                    <Sparkles className="absolute top-1 right-1 text-white w-4 h-4 animate-pulse z-10" />
                  )}
                </motion.div>
              ))}
            </div>
            <p className="text-white/80 mt-12 text-2xl animate-pulse">点击任意位置收下全部 10 个塔防碎片</p>
            <p className="text-white/50 mt-2 text-lg">（可在背包中查看并上阵塔防）</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backpack Overlay */}
      <AnimatePresence>
        {showBackpack && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-0 bg-[#1a1a2e]/95 flex flex-col z-50 p-4 overflow-y-auto font-pixel max-w-md mx-auto shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6 mt-4">
              <h2 className="text-4xl text-white font-bold">塔防背包</h2>
              <button 
                onClick={() => setShowBackpack(false)}
                className="text-white/50 hover:text-white text-3xl"
              >
                ✕
              </button>
            </div>

            {/* Deployed Slots */}
            <div className="mb-8">
              <h3 className="text-2xl text-white/80 mb-4">上阵塔防 (单击卸下/融合)</h3>
              <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, i) => {
                  const tower = gameState.current.deployed[i];
                  const isUnlocked = i < gameState.current.unlockedSlots;
                  const isSelected = selectedCard === `deployed_${i}`;
                  
                  return (
                    <div 
                      key={i}
                      onClick={() => {
                        if (isUnlocked) {
                          if (tower) {
                            handleDeployedCardClick(i);
                          }
                        } else {
                          handleUnlockSlot();
                        }
                      }}
                      className={`flex-1 aspect-[3/4] rounded-lg border-2 flex flex-col items-center justify-center relative cursor-pointer transition-transform
                        ${isUnlocked ? (tower ? (isSelected ? 'border-yellow-400 scale-105 z-10' : 'border-white/50 hover:border-white/70') : 'border-white/20 bg-white/5') : 'border-red-500/50 bg-red-500/10'}`}
                      style={{ backgroundColor: tower ? TOWER_TEMPLATES[tower.id].color : undefined }}
                    >
                      {!isUnlocked ? (
                        <div className="text-center">
                          <div className="text-2xl mb-1">🔒</div>
                          <div className="text-red-400 text-sm">500金币</div>
                        </div>
                      ) : tower ? (
                        <>
                          <span className="text-white font-black text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                            {TOWER_TEMPLATES[tower.id].rarity}
                          </span>
                          <span className="text-white/90 text-xs font-bold mt-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                            {TOWER_TEMPLATES[tower.id].name}
                          </span>
                          <span className="text-white font-bold text-sm mt-1">Lv.{tower.level}</span>
                        </>
                      ) : (
                        <span className="text-white/30 text-sm">空闲</span>
                      )}

                      {/* Fusion Animation */}
                      <AnimatePresence>
                        {fuseAnim === `deployed_${i}` && (
                          <motion.div
                            initial={{ scale: 0.5, opacity: 1 }}
                            animate={{ scale: 2, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                          >
                            <div className="text-yellow-300 font-black text-2xl drop-shadow-[0_0_10px_rgba(255,255,0,0.8)]">
                              升级!
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inventory */}
            <div>
              <h3 className="text-2xl text-white/80 mb-4">拥有塔防碎片 (双击上阵，单击融合)</h3>
              <div className="grid grid-cols-4 gap-3 pb-20">
                {Object.entries(gameState.current.backpack).map(([key, count]) => {
                  const [id, levelStr] = key.split('_');
                  const template = TOWER_TEMPLATES[id];
                  const isSelected = selectedCard === key;
                  
                  return (
                    <div key={key} className="relative">
                      <div 
                        onClick={() => handleBackpackCardClick(key)}
                        className={`aspect-[3/4] rounded-lg border-2 flex flex-col items-center justify-center relative cursor-pointer transition-transform
                          ${isSelected ? 'border-yellow-400 scale-105 z-10' : 'border-white/30 hover:border-white/50'}`}
                        style={{ backgroundColor: template.color }}
                      >
                        <span className="text-white font-black text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                          {template.rarity}
                        </span>
                        <span className="text-white/90 text-xs font-bold mt-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                          {template.name}
                        </span>
                        <span className="text-white font-bold text-sm mt-1">Lv.{levelStr}</span>
                        
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-black">
                          x{count}
                        </div>
                      </div>

                      {/* Action Menu */}
                      {isSelected && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-black border border-white/20 rounded-lg p-2 flex flex-col gap-1 z-20 w-40 shadow-xl">
                          <div className="text-white/70 text-xs text-center border-b border-white/10 pb-1 mb-1">
                            {template.effectDesc}
                          </div>
                          
                          <div className="text-white/90 text-xs flex flex-col gap-1 mb-1 px-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">攻击:</span> 
                              <span>{Math.floor(template.damage * (1 + (parseInt(levelStr) - 1) * 0.5))} <span className="text-green-400 text-[10px]">(+{Math.floor(template.damage * 0.5)}/级)</span></span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">生命:</span> 
                              <span>{Math.floor(template.hp * (1 + (parseInt(levelStr) - 1) * 0.5))} <span className="text-green-400 text-[10px]">(+{Math.floor(template.hp * 0.5)}/级)</span></span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">攻速:</span> 
                              <span>{template.fireRate}/s</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">范围:</span> 
                              <span>{template.range}</span>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleEquip(key)}
                            disabled={gameState.current.deployed.length >= gameState.current.unlockedSlots}
                            className="bg-blue-500 hover:bg-blue-400 disabled:bg-gray-600 text-white text-sm py-1 rounded mt-1"
                          >
                            上阵
                          </button>
                          <button 
                            onClick={() => handleFuse(key)}
                            disabled={(count as number) < 2}
                            className="bg-purple-500 hover:bg-purple-400 disabled:bg-gray-600 text-white text-sm py-1 rounded"
                          >
                            融合升级 (需2张)
                          </button>
                        </div>
                      )}

                      {/* Fusion Animation */}
                      <AnimatePresence>
                        {fuseAnim === key && (
                          <motion.div
                            initial={{ scale: 0.5, opacity: 1 }}
                            animate={{ scale: 2, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                          >
                            <div className="text-yellow-300 font-black text-2xl drop-shadow-[0_0_10px_rgba(255,255,0,0.8)]">
                              升级!
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
                {Object.keys(gameState.current.backpack).length === 0 && (
                  <div className="col-span-4 text-center text-white/30 py-8 text-xl">
                    背包空空如也，快去抽卡吧！
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
