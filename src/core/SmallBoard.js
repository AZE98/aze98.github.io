/**
 * SmallBoard 小棋盘类
 * 表示8×8的小棋盘，包含墙壁、分光镜和终点
 */

import { Cell } from './Cell.js';
import { Prism } from './Prism.js';
import { Target } from './Target.js';
import { Rotator } from '../utils/Rotator.js';
import CONSTANTS from '../utils/Constants.js';

export class SmallBoard {
  /**
   * @param {Object} data - 小棋盘数据（从JSON加载）
   */
  constructor(data) {
    this.id = data.id;
    this.color = data.color;
    this.originalGap = data.originalGap;
    this.faces = data.faces;
    this.size = CONSTANTS.SMALL_BOARD_SIZE;
  }
  
  /**
   * 获取指定面的数据
   * @param {number} faceId - 面编号 (0 或 1)
   * @returns {Object} 面数据
   */
  getFace(faceId) {
    const face = this.faces.find(f => f.id === faceId);
    if (!face) {
      throw new Error(`Face ${faceId} not found in board ${this.id}`);
    }
    return face;
  }
  
  /**
   * 创建格子网格（未旋转）
   * @param {number} faceId - 面编号
   * @returns {Array<Array<Cell>>} 8×8格子数组
   */
  createCells(faceId) {
    const cells = [];
    const face = this.getFace(faceId);
    
    // 初始化所有格子
    for (let y = 0; y < this.size; y++) {
      cells[y] = [];
      for (let x = 0; x < this.size; x++) {
        cells[y][x] = new Cell(x, y);
      }
    }
    
    // 注意：不自动设置边界墙壁，由JSON数据完全控制
    // 小地图会被旋转和拼接，边界墙壁应该在JSON中明确定义
    
    // 设置内部墙壁（从JSON数据）
    if (face.walls) {
      face.walls.forEach(wallData => {
        const cell = cells[wallData.y][wallData.x];
        if (wallData.sides) {
          wallData.sides.forEach(side => {
            cell.setWall(side, true);
            
            // 同步相邻格子的墙壁
            this.syncAdjacentWall(cells, wallData.x, wallData.y, side);
          });
        }
      });
    }
    
    // 设置分光镜
    if (face.prisms) {
      face.prisms.forEach(prismData => {
        const prism = Prism.fromJSON(prismData);
        cells[prism.y][prism.x].setPrism(prism);
      });
    }
    
    // 设置终点
    if (face.targets) {
      face.targets.forEach(targetData => {
        const target = Target.fromJSON(targetData);
        cells[target.y][target.x].setTarget(target);
      });
    }
    
    return cells;
  }
  
  /**
   * 同步相邻格子的墙壁
   * @param {Array<Array<Cell>>} cells - 格子数组
   * @param {number} x
   * @param {number} y
   * @param {string} side - 墙壁方向
   */
  syncAdjacentWall(cells, x, y, side) {
    const opposites = {
      'top': { dy: -1, dx: 0, side: 'bottom' },
      'bottom': { dy: 1, dx: 0, side: 'top' },
      'left': { dy: 0, dx: -1, side: 'right' },
      'right': { dy: 0, dx: 1, side: 'left' }
    };
    
    const adj = opposites[side];
    const adjX = x + adj.dx;
    const adjY = y + adj.dy;
    
    if (adjX >= 0 && adjX < this.size && adjY >= 0 && adjY < this.size) {
      cells[adjY][adjX].setWall(adj.side, true);
    }
  }
  
  /**
   * 旋转棋盘
   * @param {number} faceId - 面编号
   * @param {number} angle - 旋转角度
   * @returns {Array<Array<Cell>>} 旋转后的格子数组
   */
  rotateCells(faceId, angle) {
    if (angle === 0) {
      return this.createCells(faceId);
    }
    
    const originalCells = this.createCells(faceId);
    const rotatedCells = [];
    
    // 初始化旋转后的格子数组
    for (let y = 0; y < this.size; y++) {
      rotatedCells[y] = [];
      for (let x = 0; x < this.size; x++) {
        rotatedCells[y][x] = new Cell(x, y);
      }
    }
    
    // 旋转每个格子的内容
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const oldCell = originalCells[y][x];
        const newPos = Rotator.rotatePoint(x, y, angle, this.size);
        const newCell = rotatedCells[newPos.y][newPos.x];
        
        // 旋转墙壁
        Object.keys(oldCell.walls).forEach(side => {
          if (oldCell.hasWall(side)) {
            const newSide = Rotator.rotateWallSide(side, angle);
            newCell.setWall(newSide, true);
          }
        });
        
        // 旋转分光镜
        if (oldCell.prism) {
          const rotatedPrism = oldCell.prism.rotate(angle, this.size);
          newCell.setPrism(rotatedPrism);
        }
        
        // 旋转终点
        if (oldCell.target) {
          const rotatedTarget = oldCell.target.rotate(angle, this.size);
          newCell.setTarget(rotatedTarget);
        }
      }
    }
    
    return rotatedCells;
  }
  
  /**
   * 计算将缺口旋转到目标位置所需的角度
   * @param {string} targetPosition - 目标位置 (topLeft, topRight, bottomLeft, bottomRight)
   * @returns {number} 旋转角度
   */
  calculateRotationForPosition(targetPosition) {
    const targetGap = CONSTANTS.TARGET_GAPS[targetPosition];
    return Rotator.calculateRotationAngle(this.originalGap, targetGap);
  }
  
  /**
   * 获取所有终点
   * @param {number} faceId - 面编号
   * @returns {Array<Target>}
   */
  getAllTargets(faceId) {
    const face = this.getFace(faceId);
    return (face.targets || []).map(t => Target.fromJSON(t));
  }
  
  /**
   * 获取所有分光镜
   * @param {number} faceId - 面编号
   * @returns {Array<Prism>}
   */
  getAllPrisms(faceId) {
    const face = this.getFace(faceId);
    return (face.prisms || []).map(p => Prism.fromJSON(p));
  }
  
  /**
   * 转换为JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      color: this.color,
      originalGap: this.originalGap,
      faces: this.faces
    };
  }
  
  /**
   * 从JSON数据加载小棋盘
   * @param {Object} json - JSON数据
   * @returns {SmallBoard}
   */
  static fromJSON(json) {
    return new SmallBoard(json);
  }
  
  /**
   * 从文件加载小棋盘
   * @param {string} filename - 文件名
   * @returns {Promise<SmallBoard>}
   */
  static async loadFromFile(filename) {
    const response = await fetch(`data/${filename}`);
    const data = await response.json();
    return new SmallBoard(data);
  }
  
  /**
   * 批量加载所有小棋盘
   * @returns {Promise<Array<SmallBoard>>}
   */
  static async loadAll() {
    const boards = [];
    for (let i = 0; i < 8; i++) {
      const board = await SmallBoard.loadFromFile(`board-${i}.json`);
      boards.push(board);
    }
    return boards;
  }
}

export default SmallBoard;

