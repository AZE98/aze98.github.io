/**
 * Game 游戏管理类
 * 管理多轮游戏逻辑、状态和历史
 */

import { Board } from './Board.js';
import { Robot } from './Robot.js';
import { Encoder } from '../utils/Encoder.js';

export class Game {
  /**
   * @param {string|Object} gameCode - 完整游戏编码或配置对象
   * @param {Array<SmallBoard>} smallBoards - 小棋盘数组
   */
  constructor(gameCode, smallBoards) {
    this.smallBoards = smallBoards;
    
    // 解析游戏编码
    if (typeof gameCode === 'string') {
      const decoded = Encoder.decodeGame(gameCode);
      this.boardConfig = decoded.boardConfig;
      this.initialPositions = decoded.robotPositions;
      this.gameCode = gameCode;
    } else {
      this.boardConfig = gameCode.boardConfig;
      this.initialPositions = gameCode.robotPositions;
      this.gameCode = Encoder.encodeGame(
        Encoder.encodeBoardConfig(this.boardConfig),
        this.initialPositions
      );
    }
    
    // 创建棋盘
    this.board = new Board(this.boardConfig, smallBoards);
    
    // 创建棋子
    this.robots = Robot.createRobots(this.initialPositions);
    
    // 游戏状态
    this.rounds = [];
    this.currentRound = 0;
    this.totalSteps = 0;
    this.isStarted = false;
    this.isFinished = false;
  }
  
  /**
   * 开始游戏
   */
  start() {
    if (this.isStarted) {
      throw new Error('Game already started');
    }
    
    // 验证初始位置
    this.validateInitialPositions();
    
    this.isStarted = true;
    this.currentRound = 1;
  }
  
  /**
   * 验证初始棋子位置
   */
  validateInitialPositions() {
    this.robots.forEach(robot => {
      if (!this.board.isValidPosition(robot.x, robot.y)) {
        throw new Error(`Invalid robot position: ${robot.color} at (${robot.x}, ${robot.y})`);
      }
      
      // 检查是否有分光镜（棋子不能初始在分光镜上）
      const cell = this.board.getCell(robot.x, robot.y);
      if (cell && cell.hasPrism()) {
        throw new Error(`Robot ${robot.color} cannot start on a prism`);
      }
    });
    
    // 检查是否有重复位置
    const positions = new Set();
    this.robots.forEach(robot => {
      const key = `${robot.x},${robot.y}`;
      if (positions.has(key)) {
        throw new Error(`Multiple robots at position (${robot.x}, ${robot.y})`);
      }
      positions.add(key);
    });
  }
  
  /**
   * 获取当前可用的终点列表
   * 过滤规则：
   * 1. 终点位置没有棋子占据
   * 2. 终点未在历史中被选择过
   * 排序规则：
   * 1. 颜色：rainbow > red > yellow > blue > green
   * 2. 形状：circle > triangle > square > hexagon
   * @returns {Array<Object>}
   */
  getAvailableTargets() {
    // 获取所有已使用的终点ID
    const usedTargetIds = new Set(this.rounds.map(round => round.targetInfo.id));
    
    // 获取所有棋子占据的位置
    const occupiedPositions = new Set(
      this.robots.map(robot => `${robot.x},${robot.y}`)
    );
    
    // 过滤终点
    const availableTargets = this.board.getAllTargets()
      .filter(target => {
        // 1. 终点位置没有棋子
        const posKey = `${target.x},${target.y}`;
        if (occupiedPositions.has(posKey)) {
          return false;
        }
        
        // 2. 终点未被使用过
        if (usedTargetIds.has(target.id)) {
          return false;
        }
        
        return true;
      })
      .map(target => {
        // 找到可以到达此终点的棋子
        const eligibleRobots = this.robots.filter(robot => 
          target.canAccept(robot.color)
        );
        
        return {
          target: target,
          eligibleColors: eligibleRobots.map(r => r.color),
          displayName: target.getDisplayName(),
          position: { x: target.x, y: target.y }
        };
      });
    
    // 排序：先按颜色，再按形状
    const colorOrder = { rainbow: 0, red: 1, yellow: 2, blue: 3, green: 4 };
    const shapeOrder = { circle: 0, triangle: 1, square: 2, hexagon: 3 };
    
    availableTargets.sort((a, b) => {
      // 首先按颜色排序
      const colorA = colorOrder[a.target.color] ?? 999;
      const colorB = colorOrder[b.target.color] ?? 999;
      if (colorA !== colorB) {
        return colorA - colorB;
      }
      
      // 颜色相同，按形状排序
      const shapeA = shapeOrder[a.target.shape] ?? 999;
      const shapeB = shapeOrder[b.target.shape] ?? 999;
      return shapeA - shapeB;
    });
    
    return availableTargets;
  }
  
  /**
   * 选择目标终点，准备开始一轮
   * @param {string} targetId - 终点ID
   * @returns {Object} 轮次信息
   */
  selectTarget(targetId) {
    if (!this.isStarted) {
      throw new Error('Game not started');
    }
    
    const target = this.board.getTargetById(targetId);
    if (!target) {
      throw new Error(`Target ${targetId} not found`);
    }
    
    // 找到可以到达此终点的棋子
    const eligibleRobots = this.robots.filter(robot => 
      target.canAccept(robot.color)
    );
    
    if (eligibleRobots.length === 0) {
      throw new Error('No robot can reach this target');
    }
    
    return {
      roundNumber: this.currentRound,
      target: target,
      eligibleRobots: eligibleRobots,
      currentPositions: this.getCurrentPositions()
    };
  }
  
  /**
   * 执行一轮游戏（设置路径结果）
   * @param {string} targetId - 终点ID
   * @param {string} robotColor - 执行的棋子颜色
   * @param {Array} path - 路径数组
   * @param {number} steps - 步数
   */
  executeRound(targetId, robotColor, path, steps) {
    const target = this.board.getTargetById(targetId);
    if (!target) {
      throw new Error(`Target ${targetId} not found`);
    }
    
    const robot = this.robots.find(r => r.color === robotColor);
    if (!robot) {
      throw new Error(`Robot ${robotColor} not found`);
    }
    
    // 记录本轮信息
    const roundData = {
      roundNumber: this.currentRound,
      targetId: targetId,
      targetInfo: target.toJSON(),
      robotColor: robotColor,
      startPosition: robot.getPosition(),
      endPosition: { x: target.x, y: target.y },
      path: path,
      steps: steps
    };
    
    this.rounds.push(roundData);
    
    // 更新棋子位置
    robot.moveTo(target.x, target.y);
    
    // 更新统计
    this.totalSteps += steps;
    this.currentRound++;
    
    return roundData;
  }
  
  /**
   * 结束游戏
   */
  finish() {
    this.isFinished = true;
  }
  
  /**
   * 重置游戏
   */
  reset() {
    this.robots.forEach(robot => robot.reset());
    this.rounds = [];
    this.currentRound = 0;
    this.totalSteps = 0;
    this.isStarted = false;
    this.isFinished = false;
  }
  
  /**
   * 获取当前所有棋子位置
   * @returns {Object}
   */
  getCurrentPositions() {
    const positions = {};
    this.robots.forEach(robot => {
      positions[robot.color] = robot.getPosition();
    });
    return positions;
  }
  
  /**
   * 获取游戏状态
   * @returns {Object}
   */
  getState() {
    return {
      gameCode: this.gameCode,
      boardCode: this.board.code,
      isStarted: this.isStarted,
      isFinished: this.isFinished,
      currentRound: this.currentRound,
      totalRounds: this.rounds.length,
      totalSteps: this.totalSteps,
      currentPositions: this.getCurrentPositions(),
      availableTargets: this.getAvailableTargets(),
      rounds: [...this.rounds]
    };
  }
  
  /**
   * 获取游戏历史
   * @returns {Array}
   */
  getHistory() {
    return this.rounds.map(round => ({
      roundNumber: round.roundNumber,
      target: round.targetInfo,
      robot: round.robotColor,
      steps: round.steps,
      from: round.startPosition,
      to: round.endPosition
    }));
  }
  
  /**
   * 获取游戏统计
   * @returns {Object}
   */
  getStatistics() {
    const robotMoves = {};
    this.robots.forEach(robot => {
      robotMoves[robot.color] = 0;
    });
    
    this.rounds.forEach(round => {
      robotMoves[round.robotColor]++;
    });
    
    return {
      totalRounds: this.rounds.length,
      totalSteps: this.totalSteps,
      averageStepsPerRound: this.rounds.length > 0 ? 
        (this.totalSteps / this.rounds.length).toFixed(2) : 0,
      robotMoves: robotMoves,
      visitedTargets: this.rounds.map(r => r.targetId)
    };
  }
  
  /**
   * 导出游戏状态为JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      gameCode: this.gameCode,
      boardConfig: this.boardConfig,
      initialPositions: this.initialPositions,
      currentPositions: this.getCurrentPositions(),
      rounds: this.rounds,
      statistics: this.getStatistics()
    };
  }
  
  /**
   * 从JSON恢复游戏状态
   * @param {Object} json
   * @param {Array<SmallBoard>} smallBoards
   * @returns {Game}
   */
  static fromJSON(json, smallBoards) {
    const game = new Game(json.gameCode, smallBoards);
    
    // 恢复游戏进度
    if (json.rounds && json.rounds.length > 0) {
      game.isStarted = true;
      game.rounds = json.rounds;
      game.currentRound = json.rounds.length + 1;
      
      // 恢复棋子位置
      Object.entries(json.currentPositions).forEach(([color, pos]) => {
        const robot = game.robots.find(r => r.color === color);
        if (robot) {
          robot.moveTo(pos.x, pos.y);
        }
      });
      
      // 重新计算总步数
      game.totalSteps = json.rounds.reduce((sum, round) => sum + round.steps, 0);
    }
    
    return game;
  }
  
  /**
   * 创建新游戏
   * @param {string} boardCode - 4位十六进制棋盘编码
   * @param {Object} robotPositions - 棋子位置
   * @param {Array<SmallBoard>} smallBoards - 小棋盘数组
   * @returns {Game}
   */
  static createNew(boardCode, robotPositions, smallBoards) {
    const gameCode = Encoder.encodeGame(boardCode, robotPositions);
    return new Game(gameCode, smallBoards);
  }
  
  /**
   * 生成随机游戏
   * @param {Array<SmallBoard>} smallBoards - 小棋盘数组
   * @returns {Game}
   */
  static createRandom(smallBoards) {
    // 随机选择4个不同颜色的小棋盘
    const colorGroups = {};
    smallBoards.forEach(board => {
      if (!colorGroups[board.color]) {
        colorGroups[board.color] = [];
      }
      colorGroups[board.color].push(board);
    });
    
    const colors = Object.keys(colorGroups);
    if (colors.length < 4) {
      throw new Error('Need at least 4 different colors');
    }
    
    // 随机选择4种颜色
    const selectedColors = colors.sort(() => Math.random() - 0.5).slice(0, 4);
    
    const boardConfig = selectedColors.map(color => {
      const boards = colorGroups[color];
      const board = boards[Math.floor(Math.random() * boards.length)];
      const faceId = Math.floor(Math.random() * 2);
      return {
        boardId: board.id,
        faceId: faceId
      };
    });
    
    // 生成随机棋子位置
    const gameCode = Encoder.generateRandomGame();
    
    return new Game(gameCode, smallBoards);
  }
}

export default Game;

