/**
 * Board 大棋盘类
 * 组合4个8×8小棋盘成16×16大棋盘
 */

import { Cell } from './Cell.js';
import { SmallBoard } from './SmallBoard.js';
import { Encoder } from '../utils/Encoder.js';
import CONSTANTS from '../utils/Constants.js';

export class Board {
  /**
   * @param {string|Object} config - 棋盘配置（编码字符串或配置对象）
   * @param {Array<SmallBoard>} smallBoards - 已加载的小棋盘数组
   */
  constructor(config, smallBoards) {
    this.size = CONSTANTS.LARGE_BOARD_SIZE;
    this.cells = [];
    this.smallBoards = smallBoards;
    
    // 解析配置
    if (typeof config === 'string') {
      this.config = Encoder.decodeBoardConfig(config);
      this.code = config;
    } else if (Array.isArray(config)) {
      this.config = config;
      this.code = this.generateCode(config);
    } else {
      throw new Error('Invalid config format');
    }
    
    // 初始化棋盘
    this.init();
  }
  
  /**
   * 从配置生成编码
   * @param {Array} config
   * @returns {string}
   */
  generateCode(config) {
    const boards = config.map(c => ({
      boardId: c.boardId,
      faceId: c.faceId
    }));
    return Encoder.encodeBoardConfig(boards);
  }
  
  /**
   * 初始化大棋盘
   */
  init() {
    // 1. 创建16×16空棋盘
    this.createEmptyCells();
    
    // 2. 验证配置（4种不同颜色）
    this.validateConfig();
    
    // 3. 加载并放置4个小棋盘
    this.placeSmallBoards();
    
    // 4. 设置中央2×2不可达区域
    this.setCentralBlockedArea();
    
    // 5. 收集所有终点
    this.collectTargets();
  }
  
  /**
   * 创建空格子
   */
  createEmptyCells() {
    for (let y = 0; y < this.size; y++) {
      this.cells[y] = [];
      for (let x = 0; x < this.size; x++) {
        this.cells[y][x] = new Cell(x, y);
      }
    }
    
    // 设置外边界墙壁
    let boundaryWalls = 0;
    for (let i = 0; i < this.size; i++) {
      this.cells[0][i].setWall('top', true);
      this.cells[this.size - 1][i].setWall('bottom', true);
      this.cells[i][0].setWall('left', true);
      this.cells[i][this.size - 1].setWall('right', true);
      boundaryWalls += 4;
    }
  }
  
  /**
   * 验证配置（必须是4种不同颜色）
   */
  validateConfig() {
    const colors = new Set();
    
    this.config.forEach(boardConfig => {
      const smallBoard = this.smallBoards[boardConfig.boardId];
      if (!smallBoard) {
        throw new Error(`Small board ${boardConfig.boardId} not found`);
      }
      
      if (colors.has(smallBoard.color)) {
        throw new Error(`Duplicate color: ${smallBoard.color}`);
      }
      
      colors.add(smallBoard.color);
    });
    
    if (colors.size !== 4) {
      throw new Error('Board must have 4 different colors');
    }
  }
  
  /**
   * 放置小棋盘
   */
  placeSmallBoards() {
    const positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    const offsets = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 8, y: 0 },
      bottomLeft: { x: 0, y: 8 },
      bottomRight: { x: 8, y: 8 }
    };
    
    
    positions.forEach((position, index) => {
      const boardConfig = this.config[index];
      
      const smallBoard = this.smallBoards[boardConfig.boardId];
      
      if (!smallBoard) {
        console.error(`[Board] 找不到小棋盘 ID=${boardConfig.boardId}`);
        throw new Error(`Small board ${boardConfig.boardId} not found`);
      }
      
      const offset = offsets[position];
      
      // 计算旋转角度
      const angle = smallBoard.calculateRotationForPosition(position);
      
      // 获取旋转后的小棋盘格子
      const rotatedCells = smallBoard.rotateCells(boardConfig.faceId, angle);
      
      // 统计旋转后小地图的墙壁数量
      let sourceWallCount = 0;
      for (let sy = 0; sy < CONSTANTS.SMALL_BOARD_SIZE; sy++) {
        for (let sx = 0; sx < CONSTANTS.SMALL_BOARD_SIZE; sx++) {
          const sc = rotatedCells[sy][sx];
          ['top', 'right', 'bottom', 'left'].forEach(side => {
            if (sc.hasWall(side)) sourceWallCount++;
          });
        }
      }
      
      // 复制到大棋盘
      let wallCount = 0;
      let skippedWalls = 0;
      let prismCount = 0;
      let targetCount = 0;
      
      for (let y = 0; y < CONSTANTS.SMALL_BOARD_SIZE; y++) {
        for (let x = 0; x < CONSTANTS.SMALL_BOARD_SIZE; x++) {
          const sourceCell = rotatedCells[y][x];
          const targetCell = this.cells[offset.y + y][offset.x + x];
          
          // 复制墙壁（合并，不覆盖外边界墙，并设置双向墙壁）
          Object.keys(sourceCell.walls).forEach(side => {
            if (sourceCell.hasWall(side)) {
              const targetX = offset.x + x;
              const targetY = offset.y + y;
              
              // 只跳过大棋盘的真正外边界，接缝处的墙壁需要保留
              const isRealOuterBoundary = (
                (side === 'top' && targetY === 0) ||
                (side === 'bottom' && targetY === this.size - 1) ||
                (side === 'left' && targetX === 0) ||
                (side === 'right' && targetX === this.size - 1)
              );
              
              if (!isRealOuterBoundary) {
                // 设置当前格子的墙壁
                targetCell.setWall(side, true);
                wallCount++;
                
                // 设置相邻格子的对应墙壁（双向墙壁）
                const opposites = {
                  top: { side: 'bottom', dx: 0, dy: -1 },
                  bottom: { side: 'top', dx: 0, dy: 1 },
                  left: { side: 'right', dx: -1, dy: 0 },
                  right: { side: 'left', dx: 1, dy: 0 }
                };
                
                const opposite = opposites[side];
                const adjX = targetX + opposite.dx;
                const adjY = targetY + opposite.dy;
                
                // 检查相邻格子是否在棋盘范围内
                if (adjX >= 0 && adjX < this.size && adjY >= 0 && adjY < this.size) {
                  this.cells[adjY][adjX].setWall(opposite.side, true);
                }
              } else {
                skippedWalls++;
              }
            }
          });
          
          // 复制分光镜和终点
          if (sourceCell.prism) {
            const prism = sourceCell.prism.clone();
            prism.x = offset.x + x;
            prism.y = offset.y + y;
            targetCell.setPrism(prism);
            prismCount++;
          }
          
          if (sourceCell.target) {
            const target = sourceCell.target.clone();
            target.x = offset.x + x;
            target.y = offset.y + y;
            targetCell.setTarget(target);
            targetCount++;
          }
        }
      }
    });
  }
  
  /**
   * 检查是否是外边界
   * @param {number} x
   * @param {number} y
   * @param {string} side
   * @returns {boolean}
   */
  isOuterBoundary(x, y, side) {
    if (side === 'top' && y === 0) return true;
    if (side === 'bottom' && y === this.size - 1) return true;
    if (side === 'left' && x === 0) return true;
    if (side === 'right' && x === this.size - 1) return true;
    return false;
  }
  
  /**
   * 设置中央2×2不可达区域
   */
  setCentralBlockedArea() {
    const blocked = CONSTANTS.CENTRAL_BLOCKED;
    
    // 在中央区域周围设置墙壁
    for (let y = blocked.y[0]; y <= blocked.y[1]; y++) {
      for (let x = blocked.x[0]; x <= blocked.x[1]; x++) {
        const cell = this.cells[y][x];
        
        // 设置所有四面墙壁
        cell.setWall('top', true);
        cell.setWall('right', true);
        cell.setWall('bottom', true);
        cell.setWall('left', true);
        
        // 清空内容
        cell.clear();
      }
    }
    
    // 同步相邻格子的墙壁
    // 左边
    for (let y = blocked.y[0]; y <= blocked.y[1]; y++) {
      if (blocked.x[0] > 0) {
        this.cells[y][blocked.x[0] - 1].setWall('right', true);
      }
    }
    
    // 右边
    for (let y = blocked.y[0]; y <= blocked.y[1]; y++) {
      if (blocked.x[1] < this.size - 1) {
        this.cells[y][blocked.x[1] + 1].setWall('left', true);
      }
    }
    
    // 上边
    for (let x = blocked.x[0]; x <= blocked.x[1]; x++) {
      if (blocked.y[0] > 0) {
        this.cells[blocked.y[0] - 1][x].setWall('bottom', true);
      }
    }
    
    // 下边
    for (let x = blocked.x[0]; x <= blocked.x[1]; x++) {
      if (blocked.y[1] < this.size - 1) {
        this.cells[blocked.y[1] + 1][x].setWall('top', true);
      }
    }
  }
  
  /**
   * 收集所有终点
   */
  collectTargets() {
    this.targets = [];
    
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const cell = this.cells[y][x];
        if (cell.hasTarget()) {
          this.targets.push(cell.target);
        }
      }
    }
  }
  
  /**
   * 获取格子
   * @param {number} x
   * @param {number} y
   * @returns {Cell|null}
   */
  getCell(x, y) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
      return null;
    }
    return this.cells[y][x];
  }
  
  /**
   * 检查位置是否有效（不在中央区域，不越界）
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isValidPosition(x, y) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
      return false;
    }
    
    return !this.isInCentralArea(x, y);
  }
  
  /**
   * 检查是否在中央不可达区域
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isInCentralArea(x, y) {
    const blocked = CONSTANTS.CENTRAL_BLOCKED;
    return blocked.x.includes(x) && blocked.y.includes(y);
  }
  
  /**
   * 获取所有终点
   * @returns {Array<Target>}
   */
  getAllTargets() {
    return [...this.targets];
  }
  
  /**
   * 根据ID获取终点
   * @param {string} targetId
   * @returns {Target|null}
   */
  getTargetById(targetId) {
    return this.targets.find(t => t.id === targetId) || null;
  }
  
  /**
   * 获取指定颜色可以到达的终点
   * @param {string} color
   * @returns {Array<Target>}
   */
  getTargetsForColor(color) {
    return this.targets.filter(t => t.canAccept(color));
  }
  
  /**
   * 转换为JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      code: this.code,
      config: this.config,
      targets: this.targets.map(t => t.toJSON())
    };
  }
  
  /**
   * 获取棋盘统计信息
   * @returns {Object}
   */
  getStats() {
    let wallCount = 0;
    let prismCount = 0;
    let targetCount = this.targets.length;
    
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const cell = this.cells[y][x];
        
        Object.values(cell.walls).forEach(hasWall => {
          if (hasWall) wallCount++;
        });
        
        if (cell.hasPrism()) prismCount++;
      }
    }
    
    return {
      size: this.size,
      wallCount: wallCount / 2, // 每堵墙计算了两次
      prismCount,
      targetCount,
      colors: this.config.map(c => this.smallBoards[c.boardId].color)
    };
  }
}

export default Board;

