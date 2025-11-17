/**
 * PathFinder 路径搜索类
 * 实现带分光镜折射的BFS路径搜索算法
 */

import { Board } from '../core/Board.js';
import { Robot } from '../core/Robot.js';
import CONSTANTS from '../utils/Constants.js';

export class PathFinder {
  /**
   * @param {Board} board - 棋盘对象
   * @param {Array<Robot>} robots - 棋子数组
   */
  constructor(board, robots) {
    this.board = board;
    this.robots = robots;
    this.maxIterations = 1000000; // 防止无限循环
  }
  
  /**
   * 查找从当前位置到目标位置的最优路径
   * @param {string} robotColor - 棋子颜色
   * @param {Object} targetPos - 目标位置 {x, y}
   * @param {boolean} debug - 是否输出调试信息
   * @returns {Object} 搜索结果
   */
  findPath(robotColor, targetPos, debug = false) {
    const startTime = performance.now();
    
    this.debug = debug;
    
    // 找到目标棋子
    const targetRobot = this.robots.find(r => r.color === robotColor);
    if (!targetRobot) {
      return {
        success: false,
        message: `Robot ${robotColor} not found`
      };
    }
    
    // 检查目标位置是否有效
    if (!this.board.isValidPosition(targetPos.x, targetPos.y)) {
      return {
        success: false,
        message: 'Target position is invalid'
      };
    }
    
    // 检查起始位置是否就是目标
    if (targetRobot.x === targetPos.x && targetRobot.y === targetPos.y) {
      return {
        success: true,
        steps: 0,
        path: [],
        statesExplored: 0,
        time: performance.now() - startTime
      };
    }
    
    // BFS搜索
    return this.bfsSearch(targetRobot, targetPos, startTime);
  }
  
  /**
   * BFS搜索算法
   * @param {Robot} targetRobot - 目标棋子
   * @param {Object} targetPos - 目标位置
   * @param {number} startTime - 开始时间
   * @returns {Object}
   */
  bfsSearch(targetRobot, targetPos, startTime) {
    const initialState = {
      robots: this.robots.map(r => ({ color: r.color, x: r.x, y: r.y })),
      path: [],
      steps: 0
    };
    
    const queue = [initialState];
    const visited = new Set();
    visited.add(this.stateToString(initialState.robots));
    
    let statesExplored = 0;
    const directions = ['up', 'down', 'left', 'right'];
    
    if (this.debug) {
    }
    
    while (queue.length > 0) {
      if (statesExplored > this.maxIterations) {
        return {
          success: false,
          message: 'Search space too large (exceeded 1M states)',
          statesExplored,
          time: performance.now() - startTime
        };
      }
      
      const current = queue.shift();
      statesExplored++;
      
      // 尝试移动每个棋子
      for (let i = 0; i < current.robots.length; i++) {
        const robot = current.robots[i];
        
        // 尝试四个方向
        for (const direction of directions) {
          // 模拟移动（包括折射）
          const moveResult = this.simulateMove(
            robot,
            direction,
            current.robots
          );
          
          // 如果位置没有变化，跳过
          if (!moveResult.moved) continue;
          
          // 创建新状态
          const newRobots = current.robots.map((r, idx) => {
            if (idx === i) {
              return { color: r.color, x: moveResult.finalX, y: moveResult.finalY };
            }
            return { ...r };
          });
          
          // 检查目标棋子是否到达终点
          const movedRobot = newRobots.find(r => r.color === targetRobot.color);
          if (movedRobot.x === targetPos.x && movedRobot.y === targetPos.y) {
            // 找到解！但需要检查是否至少2步
            const newSteps = current.steps + 1;
            
            // 游戏规则：不允许1步直达
            if (newSteps < 2) {
              // 1步就到了，不符合规则，继续搜索
              continue;
            }
            
            const finalPath = [...current.path, {
              robotColor: robot.color,
              direction: direction,
              from: { x: robot.x, y: robot.y },
              to: { x: moveResult.finalX, y: moveResult.finalY },
              segments: moveResult.segments
            }];
            
            return {
              success: true,
              steps: newSteps,
              path: finalPath,
              statesExplored,
              time: performance.now() - startTime
            };
          }
          
          // 检查是否访问过
          const stateStr = this.stateToString(newRobots);
          if (!visited.has(stateStr)) {
            visited.add(stateStr);
            queue.push({
              robots: newRobots,
              path: [...current.path, {
                robotColor: robot.color,
                direction: direction,
                from: { x: robot.x, y: robot.y },
                to: { x: moveResult.finalX, y: moveResult.finalY },
                segments: moveResult.segments
              }],
              steps: current.steps + 1
            });
          }
        }
      }
    }
    return {
      success: false,
      message: 'No path found',
      statesExplored,
      time: performance.now() - startTime
    };
  }
  
  /**
   * 模拟棋子移动（包括分光镜折射）
   * @param {Object} robot - 棋子状态 {color, x, y}
   * @param {string} direction - 初始方向
   * @param {Array} allRobots - 所有棋子状态
   * @returns {Object} 移动结果
   */
  simulateMove(robot, direction, allRobots) {
    let x = robot.x;
    let y = robot.y;
    let currentDir = direction;
    
    const segments = []; // 记录每个移动段
    const visited = new Set(); // 防止无限循环
    let maxSteps = 100; // 最大移动步数
    let stepCount = 0;
    
    // 首次移动必须发生
    let firstMove = true;
    
    while (stepCount < maxSteps) {
      const segmentStart = { x, y, direction: currentDir };
      
      // 沿当前方向移动，直到遇到障碍
      const moveResult = this.moveInDirection(x, y, currentDir, allRobots);
      
      if (!moveResult.moved) {
        // 无法移动
        if (firstMove) {
          // 第一次移动就无法移动，返回未移动
          break;
        } else {
          // 折射后无法移动，停在当前位置
          break;
        }
      }
      
      firstMove = false;
      x = moveResult.x;
      y = moveResult.y;
      
      // 记录这一段移动
      segments.push({
        from: segmentStart,
        to: { x, y },
        direction: currentDir
      });
      
      // 检查是否停在分光镜上
      const cell = this.board.getCell(x, y);
      if (cell && cell.hasPrism()) {
        const prism = cell.prism;
        
        // 计算折射后的方向
        const newDir = prism.refract(currentDir, robot.color);
        
        if (newDir === currentDir) {
          // 同色直通，停止
          break;
        }
        
        // 异色折射，继续移动
        // 检查循环
        const key = `${x},${y},${newDir}`;
        if (visited.has(key)) {
          // 检测到循环，停止
          break;
        }
        visited.add(key);
        
        currentDir = newDir;
        stepCount++;
        // 继续循环，从分光镜位置沿新方向移动
      } else {
        // 没有分光镜，停止
        break;
      }
    }
    
    const finalX = x;
    const finalY = y;
    const moved = (finalX !== robot.x || finalY !== robot.y);
    
    return {
      moved,
      finalX,
      finalY,
      segments
    };
  }
  
  /**
   * 沿指定方向移动，直到遇到障碍
   * @param {number} startX
   * @param {number} startY
   * @param {string} direction
   * @param {Array} allRobots
   * @returns {Object}
   */
  moveInDirection(startX, startY, direction, allRobots) {
    let x = startX;
    let y = startY;
    
    const deltas = {
      'up': { dx: 0, dy: -1 },
      'down': { dx: 0, dy: 1 },
      'left': { dx: -1, dy: 0 },
      'right': { dx: 1, dy: 0 }
    };
    
    const delta = deltas[direction];
    if (!delta) {
      return { moved: false, x: startX, y: startY };
    }
    
    let movedAtLeastOnce = false;
    
    while (true) {
      const nextX = x + delta.dx;
      const nextY = y + delta.dy;
      
      // 检查边界
      if (nextX < 0 || nextX >= this.board.size || 
          nextY < 0 || nextY >= this.board.size) {
        break;
      }
      
      // 检查是否是中央不可达区域
      if (this.board.isInCentralArea(nextX, nextY)) {
        break;
      }
      
      // 检查墙壁
      const currentCell = this.board.getCell(x, y);
      if (this.hasWallInDirection(currentCell, direction)) {
        break;
      }
      
      // 检查是否有其他棋子
      const hasOtherRobot = allRobots.some(r => 
        r.x === nextX && r.y === nextY && !(r.x === startX && r.y === startY)
      );
      if (hasOtherRobot) {
        break;
      }
      
      // 移动到下一个位置
      x = nextX;
      y = nextY;
      movedAtLeastOnce = true;
      
      // 检查是否到达分光镜
      // 如果当前位置有分光镜，停止移动（在simulateMove中会处理折射）
      const nextCell = this.board.getCell(x, y);
      if (nextCell && nextCell.hasPrism()) {
        break;
      }
    }
    
    const moved = movedAtLeastOnce;
    return { moved, x, y };
  }
  
  /**
   * 检查格子在指定方向是否有墙
   * @param {Cell} cell
   * @param {string} direction
   * @returns {boolean}
   */
  hasWallInDirection(cell, direction) {
    if (!cell) return true;
    
    const wallMap = {
      'up': 'top',
      'down': 'bottom',
      'left': 'left',
      'right': 'right'
    };
    
    return cell.hasWall(wallMap[direction]);
  }
  
  /**
   * 将状态转换为字符串（用于去重）
   * @param {Array} robots
   * @returns {string}
   */
  stateToString(robots) {
    return robots
      .map(r => `${r.color}:${r.x},${r.y}`)
      .sort()
      .join('|');
  }
  
  /**
   * 获取所有可能的移动
   * @param {string} robotColor
   * @returns {Array}
   */
  getPossibleMoves(robotColor) {
    const robot = this.robots.find(r => r.color === robotColor);
    if (!robot) return [];
    
    const moves = [];
    const directions = ['up', 'down', 'left', 'right'];
    const allRobots = this.robots.map(r => ({ 
      color: r.color, x: r.x, y: r.y 
    }));
    
    directions.forEach(direction => {
      const result = this.simulateMove(
        { color: robot.color, x: robot.x, y: robot.y },
        direction,
        allRobots
      );
      
      if (result.moved) {
        moves.push({
          direction,
          from: { x: robot.x, y: robot.y },
          to: { x: result.finalX, y: result.finalY },
          segments: result.segments
        });
      }
    });
    
    return moves;
  }
  
  /**
   * 计算启发式距离（曼哈顿距离）
   * @param {Object} pos1
   * @param {Object} pos2
   * @returns {number}
   */
  heuristic(pos1, pos2) {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }
}

export default PathFinder;

