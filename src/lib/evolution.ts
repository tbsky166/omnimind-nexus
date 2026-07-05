// ═══════════════════════════════════════════════════════════════════════
// Agent 进化引擎 — 基于遗传算法的 Agent 参数自动调优
// Agent Evolution Engine — genetic algorithm-based auto-tuning of Agent parameters
// ═══════════════════════════════════════════════════════════════════════

// ── 核心概念 / Core Concepts ──
// 基因（Gene）：Agent 的一个可调参数（温度、创造力、风险容忍度等）
// 染色体（Chromosome）：一组基因的完整组合 = 一个 Agent 配置
// 种群（Population）：多个 Agent 变体同时竞争
// 适应度（Fitness）：Agent 在任务中的表现评分
// 自然选择（Selection）：保留高分个体，淘汰低分个体
// 交叉（Crossover）：两个父代染色体混合产生子代
// 突变（Mutation）：随机扰动基因，引入新特性

/** 基因定义 / Gene definition */
export interface Gene {
  name: string;              // 基因名：temperature, creativity, risk_tolerance, etc.
  value: number;             // 当前值
  min: number;               // 最小值
  max: number;               // 最大值
  mutationRate: number;      // 突变概率
  mutationStrength: number;   // 突变强度（标准差）
  description: string;       // 描述
}

/** 染色体（完整 Agent 参数集）/ Chromosome (complete Agent parameter set) */
export interface Chromosome {
  id: string;                // 唯一标识
  genes: Gene[];             // 基因列表
  fitness: number;           // 适应度得分
  generation: number;        // 所属世代
  parentIds: string[];       // 父代 ID
  mutationCount: number;     // 突变次数
  age: number;               // 存活代数
  lineage: string[];         // 血统（祖先 ID 链）
}

/** 进化配置 / Evolution config */
export interface EvolutionConfig {
  populationSize: number;    // 种群大小
  eliteCount: number;        // 精英保留数（直接进入下一代）
  crossoverRate: number;     // 交叉率：0.0 ~ 1.0
  mutationRate: number;      // 基础突变率
  tournamentSize: number;    // 锦标赛选择大小
  maxGenerations: number;    // 最大代数
  targetFitness: number;     // 目标适应度（达到即停止）
  stagnationLimit: number;   // 停滞代数上限（超过则提前终止）
}

/** 进化历史 / Evolution history */
export interface EvolutionHistory {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  worstFitness: number;
  diversity: number;         // 种群多样性
  bestChromosome: Chromosome;
  timestamp: number;
}

/** 进化结果 / Evolution result */
export interface EvolutionResult {
  bestChromosome: Chromosome;
  history: EvolutionHistory[];
  totalGenerations: number;
  totalTime: number;
  convergenceReason: "target_reached" | "max_generations" | "stagnation";
  population: Chromosome[];
}

// ── 基因工厂 / Gene Factory ──

/** Agent 可进化基因模板 / Evolvable gene templates for Agent */
export const EVOLVABLE_GENES: Omit<Gene, "value">[] = [
  { name: "temperature", min: 0.0, max: 2.0, mutationRate: 0.3, mutationStrength: 0.1, description: "LLM 温度参数" },
  { name: "creativity", min: 0.0, max: 1.0, mutationRate: 0.25, mutationStrength: 0.08, description: "创造力" },
  { name: "risk_tolerance", min: 0.0, max: 1.0, mutationRate: 0.2, mutationStrength: 0.1, description: "风险容忍度" },
  { name: "verbosity", min: 0.0, max: 1.0, mutationRate: 0.15, mutationStrength: 0.05, description: "啰嗦程度" },
  { name: "confidence", min: 0.0, max: 1.0, mutationRate: 0.2, mutationStrength: 0.08, description: "自信程度" },
  { name: "empathy", min: 0.0, max: 1.0, mutationRate: 0.15, mutationStrength: 0.06, description: "共情能力" },
  { name: "detail_level", min: 0.0, max: 1.0, mutationRate: 0.2, mutationStrength: 0.1, description: "细节程度" },
  { name: "top_p", min: 0.0, max: 1.0, mutationRate: 0.2, mutationStrength: 0.05, description: "Top-P 采样" },
  { name: "max_tokens", min: 256, max: 8192, mutationRate: 0.1, mutationStrength: 256, description: "最大 Token 数" },
  { name: "retry_aggressiveness", min: 0.0, max: 1.0, mutationRate: 0.15, mutationStrength: 0.08, description: "重试激进程度" },
];

/** 创建随机染色体 / Create random chromosome */
export function createRandomChromosome(generation: number, parentIds: string[] = []): Chromosome {
  const genes: Gene[] = EVOLVABLE_GENES.map((template) => ({
    ...template,
    value: template.min + Math.random() * (template.max - template.min),
  }));

  return {
    id: `chr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    genes,
    fitness: 0,
    generation,
    parentIds,
    mutationCount: 0,
    age: 0,
    lineage: [],
  };
}

/** 初始化种群 / Initialize population */
export function initializePopulation(config: EvolutionConfig): Chromosome[] {
  return Array.from({ length: config.populationSize }, () => createRandomChromosome(0));
}

// ── 遗传操作 / Genetic Operations ──

/** 锦标赛选择 / Tournament selection */
export function tournamentSelection(population: Chromosome[], tournamentSize: number): Chromosome {
  const tournament = Array.from(
    { length: tournamentSize },
    () => population[Math.floor(Math.random() * population.length)],
  );
  return tournament.reduce((best, curr) => (curr.fitness > best.fitness ? curr : best));
}

/** 交叉操作（算术交叉）/ Crossover operation (arithmetic crossover) */
export function crossover(parent1: Chromosome, parent2: Chromosome, generation: number): Chromosome {
  const childGenes: Gene[] = parent1.genes.map((gene, i) => {
    const parent2Gene = parent2.genes[i];
    // 算术交叉：在两者之间随机插值 / Arithmetic crossover: random interpolation
    const alpha = Math.random();
    const newValue = gene.value * alpha + parent2Gene.value * (1 - alpha);
    return {
      ...gene,
      value: Math.max(gene.min, Math.min(gene.max, newValue)),
    };
  });

  return {
    id: `chr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    genes: childGenes,
    fitness: 0,
    generation,
    parentIds: [parent1.id, parent2.id],
    mutationCount: 0,
    age: 0,
    lineage: [...parent1.lineage, parent1.id, parent2.id],
  };
}

/** 突变操作 / Mutation operation */
export function mutate(chromosome: Chromosome): Chromosome {
  let mutationCount = 0;
  const mutatedGenes = chromosome.genes.map((gene) => {
    if (Math.random() < gene.mutationRate) {
      mutationCount++;
      // 高斯突变 / Gaussian mutation
      const u1 = Math.random();
      const u2 = Math.random();
      const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const newValue = gene.value + gaussian * gene.mutationStrength * (gene.max - gene.min);
      return {
        ...gene,
        value: Math.max(gene.min, Math.min(gene.max, newValue)),
      };
    }
    return gene;
  });

  return {
    ...chromosome,
    genes: mutatedGenes,
    mutationCount: chromosome.mutationCount + mutationCount,
  };
}

/** 种群多样性计算 / Population diversity calculation */
export function calculateDiversity(population: Chromosome[]): number {
  if (population.length < 2) return 0;
  const avgGeneValues = population[0].genes.map((_, i) => {
    const values = population.map((c) => c.genes[i].value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  });
  return avgGeneValues.reduce((s, v) => s + v, 0) / avgGeneValues.length;
}

// ── 进化引擎 / Evolution Engine ──

/** 运行进化 / Run evolution */
export function runEvolution(
  config: EvolutionConfig,
  fitnessFn: (chromosome: Chromosome) => Promise<number>,
  onGeneration?: (history: EvolutionHistory) => void,
): Promise<EvolutionResult> {
  return new Promise(async (resolve) => {
    const startTime = Date.now();
    let population = initializePopulation(config);
    const history: EvolutionHistory[] = [];
    let stagnationCount = 0;
    let bestEverFitness = -Infinity;

    for (let gen = 0; gen < config.maxGenerations; gen++) {
      // 1. 评估适应度 / Evaluate fitness
      for (const chr of population) {
        if (chr.fitness === 0) {
          chr.fitness = await fitnessFn(chr);
        }
      }

      // 2. 排序 / Sort
      population.sort((a, b) => b.fitness - a.fitness);
      const best = population[0];
      const avgFitness = population.reduce((s, c) => s + c.fitness, 0) / population.length;
      const worstFitness = population[population.length - 1].fitness;
      const diversity = calculateDiversity(population);

      // 3. 记录历史 / Record history
      const genHistory: EvolutionHistory = {
        generation: gen,
        bestFitness: best.fitness,
        avgFitness,
        worstFitness,
        diversity,
        bestChromosome: { ...best },
        timestamp: Date.now(),
      };
      history.push(genHistory);

      if (onGeneration) onGeneration(genHistory);

      // 4. 检查终止条件 / Check termination conditions
      if (best.fitness >= config.targetFitness) {
        resolve({
          bestChromosome: best,
          history,
          totalGenerations: gen + 1,
          totalTime: Date.now() - startTime,
          convergenceReason: "target_reached",
          population,
        });
        return;
      }

      if (best.fitness > bestEverFitness) {
        bestEverFitness = best.fitness;
        stagnationCount = 0;
      } else {
        stagnationCount++;
      }

      if (stagnationCount >= config.stagnationLimit) {
        resolve({
          bestChromosome: best,
          history,
          totalGenerations: gen + 1,
          totalTime: Date.now() - startTime,
          convergenceReason: "stagnation",
          population,
        });
        return;
      }

      // 5. 生成下一代 / Generate next generation
      const nextGen: Chromosome[] = [];

      // 精英保留 / Elite preservation
      for (let i = 0; i < config.eliteCount; i++) {
        nextGen.push({ ...population[i], age: population[i].age + 1 });
      }

      // 交叉 + 突变 / Crossover + mutation
      while (nextGen.length < config.populationSize) {
        const parent1 = tournamentSelection(population, config.tournamentSize);
        const parent2 = tournamentSelection(population, config.tournamentSize);

        let child: Chromosome;
        if (Math.random() < config.crossoverRate) {
          child = crossover(parent1, parent2, gen + 1);
        } else {
          child = createRandomChromosome(gen + 1, [parent1.id]);
        }

        child = mutate(child);
        nextGen.push(child);
      }

      population = nextGen;
    }

    // 达到最大代数 / Max generations reached
    population.sort((a, b) => b.fitness - a.fitness);
    resolve({
      bestChromosome: population[0],
      history,
      totalGenerations: config.maxGenerations,
      totalTime: Date.now() - startTime,
      convergenceReason: "max_generations",
      population,
    });
  });
}

/** 基因表达 → Agent 配置参数 / Gene expression → Agent config parameters */
export function expressGenes(genes: Gene[]): Record<string, number> {
  const params: Record<string, number> = {};
  for (const gene of genes) {
    params[gene.name] = gene.value;
  }
  return params;
}

/** 从染色体创建 Agent 提示词补丁 / Create Agent prompt patch from chromosome */
export function chromosomeToPromptPatch(chromosome: Chromosome): string {
  const params = expressGenes(chromosome.genes);
  return `
## 进化优化参数（第 ${chromosome.generation} 代）
- 温度: ${params.temperature?.toFixed(2)}
- 创造力: ${params.creativity?.toFixed(2)}
- 风险容忍度: ${params.risk_tolerance?.toFixed(2)}
- 啰嗦程度: ${params.verbosity?.toFixed(2)}
- 自信程度: ${params.confidence?.toFixed(2)}
- 共情能力: ${params.empathy?.toFixed(2)}
- 细节程度: ${params.detail_level?.toFixed(2)}
- 重试激进程度: ${params.retry_aggressiveness?.toFixed(2)}
- 适应度得分: ${chromosome.fitness.toFixed(4)}
- 血统: ${chromosome.lineage.length} 代
`;
}