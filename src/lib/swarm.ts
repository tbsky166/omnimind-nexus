// ═══════════════════════════════════════════════════════════════════════
// 蜂群智能系统 — 受蚁群/蜂群启发的集体决策引擎
// Swarm Intelligence System — collective decision engine inspired by ant/bee colonies
// ═══════════════════════════════════════════════════════════════════════

// ── 核心概念 / Core Concepts ──
// 信息素（Pheromone）：Agent 在解决方案空间留下的"气味"标记
// 随机漫步（Random Walk）：Agent 探索未知区域的方式
// 共识涌现（Consensus Emergence）：足够的个体交互自然产生群体共识
// 舞动通信（Waggle Dance）：蜜蜂式信息传递，Agent 通过"舞蹈"分享发现

/** 信息素点 / Pheromone point */
export interface Pheromone {
  id: string;                // 唯一标识
  position: number[];        // 在解空间中的位置（N维向量）
  intensity: number;         // 强度：0.0 ~ 1.0，随时间衰减
  agentId: string;           // 留下信息素的 Agent
  timestamp: number;         // 创建时间
  quality: number;           // 解的质量：0.0 ~ 1.0
  category: string;          // 分类：solution | insight | warning | path
  ttl: number;               // 存活时间（毫秒）
}

/** 信息素场 / Pheromone field */
export interface PheromoneField {
  points: Pheromone[];
  totalIntensity: number;    // 总强度
  maxIntensity: number;      // 最高强度
  evaporationRate: number;   // 蒸发速率：0.0 ~ 1.0/秒
  dimensions: number;        // 解空间维度数
}

/** 蜂群 Agent / Swarm Agent */
export interface SwarmAgent {
  id: string;
  name: string;
  role: string;
  position: number[];         // 当前位置（解空间坐标）
  velocity: number[];         // 移动速度
  personalBest: number[];     // 个体最佳位置
  personalBestScore: number;  // 个体最佳得分
  explorationRate: number;    // 探索率：0.0 ~ 1.0
  confidence: number;         // 自信度：0.0 ~ 1.0
  energy: number;             // 能量：0.0 ~ 1.0，耗尽则退出
  memory: Array<{             // 短期记忆
    position: number[];
    score: number;
    timestamp: number;
  }>;
}

/** 共识结果 / Consensus result */
export interface ConsensusResult {
  solution: number[];         // 共识解（解空间坐标）
  quality: number;            // 共识质量：0.0 ~ 1.0
  agreement: number;          // 一致度：0.0 ~ 1.0
  participants: string[];     // 参与 Agent
  iterations: number;         // 迭代次数
  convergenceTime: number;    // 收敛时间（毫秒）
  minorityReports: Array<{    // 少数派报告
    agentId: string;
    position: number[];
    score: number;
    reason: string;
  }>;
  danceHistory: DanceRecord[]; // 舞动历史
}

/** 舞动记录 / Dance record (bee waggle dance) */
export interface DanceRecord {
  agentId: string;
  direction: number[];        // 舞动方向（指向解）
  duration: number;           // 舞动持续时间（表示质量）
  timestamp: number;
  followers: string[];        // 被吸引的 Agent
}

// ── 蜂群引擎 / Swarm Engine ──

/** 创建信息素场 / Create pheromone field */
export function createPheromoneField(dimensions: number, evaporationRate = 0.05): PheromoneField {
  return {
    points: [],
    totalIntensity: 0,
    maxIntensity: 0,
    evaporationRate,
    dimensions,
  };
}

/** 沉积信息素 / Deposit pheromone */
export function depositPheromone(
  field: PheromoneField,
  position: number[],
  intensity: number,
  agentId: string,
  quality: number,
  category: Pheromone["category"],
  ttl = 30000,
): Pheromone {
  const point: Pheromone = {
    id: `pheromone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    position,
    intensity: Math.min(1, Math.max(0, intensity)),
    agentId,
    timestamp: Date.now(),
    quality: Math.min(1, Math.max(0, quality)),
    category,
    ttl,
  };
  field.points.push(point);
  field.totalIntensity += point.intensity;
  field.maxIntensity = Math.max(field.maxIntensity, point.intensity);
  return point;
}

/** 蒸发信息素（时间衰减）/ Evaporate pheromones (time decay) */
export function evaporatePheromones(field: PheromoneField, deltaMs: number): void {
  const now = Date.now();
  const decayFactor = Math.exp(-field.evaporationRate * (deltaMs / 1000));

  field.points = field.points.filter((p) => {
    // TTL 过期 / TTL expired
    if (now - p.timestamp > p.ttl) return false;
    // 强度衰减 / Intensity decay
    p.intensity *= decayFactor;
    // 强度过低则移除 / Remove if too weak
    return p.intensity > 0.001;
  });

  field.totalIntensity = field.points.reduce((sum, p) => sum + p.intensity, 0);
  field.maxIntensity = field.points.reduce((max, p) => Math.max(max, p.intensity), 0);
}

/** 查询信息素梯度（在指定位置周围）/ Query pheromone gradient (around a position) */
export function queryPheromoneGradient(
  field: PheromoneField,
  position: number[],
  radius: number,
): { direction: number[]; intensity: number; count: number } {
  const nearby = field.points.filter((p) => {
    const dist = euclideanDistance(p.position, position);
    return dist <= radius;
  });

  if (nearby.length === 0) {
    return {
      direction: position.map(() => 0),
      intensity: 0,
      count: 0,
    };
  }

  // 加权平均方向 / Weighted average direction
  const direction = position.map((_, i) => {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const p of nearby) {
      const weight = p.intensity * p.quality;
      weightedSum += p.position[i] * weight;
      totalWeight += weight;
    }
    return totalWeight > 0 ? weightedSum / totalWeight - position[i] : 0;
  });

  const avgIntensity = nearby.reduce((s, p) => s + p.intensity, 0) / nearby.length;

  return { direction, intensity: avgIntensity, count: nearby.length };
}

/** 随机漫步步长 / Random walk step */
export function randomWalk(position: number[], stepSize: number): number[] {
  return position.map((p) => {
    // 高斯随机漫步 / Gaussian random walk
    const u1 = Math.random();
    const u2 = Math.random();
    const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return p + gaussian * stepSize;
  });
}

/** 欧几里得距离 / Euclidean distance */
export function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
}

// ── 蜂群共识算法 / Swarm Consensus Algorithm ──

/** 蜂群共识配置 / Swarm consensus config */
export interface SwarmConfig {
  populationSize: number;       // 蜂群规模
  maxIterations: number;        // 最大迭代次数
  convergenceThreshold: number; // 收敛阈值：Agent 间最大距离
  explorationRatio: number;     // 探索比例：多少 Agent 专注探索
  pheromoneWeight: number;      // 信息素权重
  socialWeight: number;         // 社会学习权重（跟随全局最优）
  cognitiveWeight: number;      // 认知权重（跟随个体最优）
  inertiaWeight: number;        // 惯性权重（保持当前方向）
  dimensions: number;           // 解空间维度
  bounds: [number, number];     // 每维度的边界 [min, max]
}

/** 初始化蜂群 / Initialize swarm */
export function initializeSwarm(config: SwarmConfig, agentNames: string[]): SwarmAgent[] {
  const agents: SwarmAgent[] = [];
  for (let i = 0; i < config.populationSize; i++) {
    const position = Array.from(
      { length: config.dimensions },
      () => config.bounds[0] + Math.random() * (config.bounds[1] - config.bounds[0]),
    );
    const velocity = Array.from({ length: config.dimensions }, () => (Math.random() - 0.5) * 0.2);
    agents.push({
      id: `swarm_${i}`,
      name: agentNames[i % agentNames.length] || `Agent ${i}`,
      role: "swarm_member",
      position,
      velocity,
      personalBest: [...position],
      personalBestScore: -Infinity,
      explorationRate: i < config.populationSize * config.explorationRatio ? 0.8 : 0.2,
      confidence: 0.5 + Math.random() * 0.3,
      energy: 1.0,
      memory: [],
    });
  }
  return agents;
}

/** 蜂群迭代（单步）/ Swarm iteration (single step) */
export function swarmIteration(
  agents: SwarmAgent[],
  field: PheromoneField,
  globalBest: number[],
  globalBestScore: number,
  config: SwarmConfig,
  fitnessFn: (position: number[]) => number,
): { agents: SwarmAgent[]; globalBest: number[]; globalBestScore: number; converged: boolean } {
  let newGlobalBest = [...globalBest];
  let newGlobalBestScore = globalBestScore;

  for (const agent of agents) {
    if (agent.energy <= 0) continue;

    // 1. 计算三个方向分量 / Calculate three direction components
    const pheromoneGradient = queryPheromoneGradient(field, agent.position, 0.5);
    const pheromoneDir = pheromoneGradient.direction;

    const cognitiveDir = agent.personalBest.map((pb, i) => pb - agent.position[i]);
    const socialDir = newGlobalBest.map((gb, i) => gb - agent.position[i]);

    // 2. 更新速度 / Update velocity
    const r1 = Math.random();
    const r2 = Math.random();
    const r3 = Math.random();

    agent.velocity = agent.velocity.map((v, i) => {
      const inertia = config.inertiaWeight * v;
      const cognitive = config.cognitiveWeight * r1 * cognitiveDir[i];
      const social = config.socialWeight * r2 * socialDir[i];
      const pheromone = config.pheromoneWeight * r3 * pheromoneDir[i] * pheromoneGradient.intensity;
      return inertia + cognitive + social + pheromone;
    });

    // 3. 更新位置 / Update position
    agent.position = agent.position.map((p, i) => {
      const newPos = p + agent.velocity[i];
      return Math.max(config.bounds[0], Math.min(config.bounds[1], newPos));
    });

    // 4. 评估适应度 / Evaluate fitness
    const score = fitnessFn(agent.position);
    if (score > agent.personalBestScore) {
      agent.personalBest = [...agent.position];
      agent.personalBestScore = score;
      agent.confidence = Math.min(1, agent.confidence + 0.05);
    } else {
      agent.confidence = Math.max(0.1, agent.confidence - 0.02);
    }

    if (score > newGlobalBestScore) {
      newGlobalBest = [...agent.position];
      newGlobalBestScore = score;
      // 沉积高质量信息素 / Deposit high-quality pheromone
      depositPheromone(field, agent.position, 0.8, agent.id, score / 10, "solution", 60000);
    }

    // 5. 更新记忆 / Update memory
    agent.memory.push({ position: [...agent.position], score, timestamp: Date.now() });
    if (agent.memory.length > 10) agent.memory.shift();

    // 6. 能量消耗 / Energy consumption
    agent.energy -= 0.01 + Math.random() * 0.01;
  }

  // 7. 蒸发信息素 / Evaporate pheromones
  evaporatePheromones(field, 1000);

  // 8. 检查收敛 / Check convergence
  const maxDist = agents.reduce((max, a) => {
    const dist = euclideanDistance(a.position, newGlobalBest);
    return Math.max(max, dist);
  }, 0);
  const converged = maxDist < config.convergenceThreshold;

  return { agents, globalBest: newGlobalBest, globalBestScore: newGlobalBestScore, converged };
}

/** 运行完整蜂群共识 / Run full swarm consensus */
export function runSwarmConsensus(
  config: SwarmConfig,
  agentNames: string[],
  fitnessFn: (position: number[]) => number,
  onIteration?: (iteration: number, best: number[], score: number, converged: boolean) => void,
): ConsensusResult {
  const startTime = Date.now();
  const field = createPheromoneField(config.dimensions, 0.03);
  let agents = initializeSwarm(config, agentNames);
  let globalBest = agents[0].position;
  let globalBestScore = -Infinity;
  const danceHistory: DanceRecord[] = [];
  let converged = false;
  let iteration = 0;

  // 初始评估 / Initial evaluation
  for (const agent of agents) {
    const score = fitnessFn(agent.position);
    if (score > agent.personalBestScore) {
      agent.personalBest = [...agent.position];
      agent.personalBestScore = score;
    }
    if (score > globalBestScore) {
      globalBest = [...agent.position];
      globalBestScore = score;
    }
  }

  for (iteration = 0; iteration < config.maxIterations && !converged; iteration++) {
    const result = swarmIteration(agents, field, globalBest, globalBestScore, config, fitnessFn);
    agents = result.agents;
    globalBest = result.globalBest;
    globalBestScore = result.globalBestScore;
    converged = result.converged;

    // 舞动通信 / Waggle dance communication
    if (iteration % 5 === 0) {
      const bestAgent = agents.reduce((best, a) => a.personalBestScore > best.personalBestScore ? a : best);
      const dance: DanceRecord = {
        agentId: bestAgent.id,
        direction: bestAgent.position.map((p, i) => p - globalBest[i]),
        duration: Math.round(bestAgent.personalBestScore * 100),
        timestamp: Date.now(),
        followers: agents.filter((a) => euclideanDistance(a.position, bestAgent.position) < 0.3).map((a) => a.id),
      };
      danceHistory.push(dance);
    }

    if (onIteration) {
      onIteration(iteration, globalBest, globalBestScore, converged);
    }
  }

  // 少数派报告 / Minority reports
  const minorityReports = agents
    .filter((a) => euclideanDistance(a.personalBest, globalBest) > config.convergenceThreshold * 2)
    .map((a) => ({
      agentId: a.id,
      position: a.personalBest,
      score: a.personalBestScore,
      reason: `与共识解偏差 ${euclideanDistance(a.personalBest, globalBest).toFixed(2)}，置信度 ${a.confidence.toFixed(2)}`,
    }));

  // 一致度 / Agreement
  const agreement = 1 - minorityReports.length / agents.length;

  return {
    solution: globalBest,
    quality: globalBestScore,
    agreement,
    participants: agents.map((a) => a.name),
    iterations: iteration,
    convergenceTime: Date.now() - startTime,
    minorityReports,
    danceHistory,
  };
}

// ── 蜂群记忆（Stigmergy 空间）/ Swarm Memory (Stigmergy Space) ──

/** 蜂群共享记忆 / Swarm shared memory */
export interface SwarmMemory {
  field: PheromoneField;
  consensusHistory: ConsensusResult[];
  topSolutions: Array<{ position: number[]; score: number; timestamp: number }>;
  totalIterations: number;
}

/** 创建蜂群记忆 / Create swarm memory */
export function createSwarmMemory(dimensions: number): SwarmMemory {
  return {
    field: createPheromoneField(dimensions),
    consensusHistory: [],
    topSolutions: [],
    totalIterations: 0,
  };
}

/** 更新蜂群记忆 / Update swarm memory */
export function updateSwarmMemory(memory: SwarmMemory, result: ConsensusResult): void {
  memory.consensusHistory.push(result);
  if (memory.consensusHistory.length > 50) memory.consensusHistory.shift();

  memory.topSolutions.push({
    position: result.solution,
    score: result.quality,
    timestamp: Date.now(),
  });
  memory.topSolutions.sort((a, b) => b.score - a.score);
  if (memory.topSolutions.length > 10) memory.topSolutions = memory.topSolutions.slice(0, 10);

  memory.totalIterations += result.iterations;
}