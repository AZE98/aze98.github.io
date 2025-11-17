/**
 * Prism 分光镜类
 * 表示棋盘上的分光镜，可以折射棋子的移动方向
 */

import { Rotator } from '../utils/Rotator.js';
import CONSTANTS from '../utils/Constants.js';

export class Prism {
  /**
   * @param {number} x - x坐标
   * @param {number} y - y坐标
   * @param {string} direction - 方向 ('\' 或 '/')
   * @param {string} color - 颜色 ('red', 'yellow', 'blue', 'green')
   */
  constructor(x, y, direction, color) {
    this.x = x;
    this.y = y;
    this.direction = direction;  // '\' 或 '/'
    this.color = color;
    
    // 验证参数
    if (![CONSTANTS.PRISM_DIRECTIONS.BACKSLASH, CONSTANTS.PRISM_DIRECTIONS.SLASH].includes(direction)) {
      throw new Error(`Invalid prism direction: ${direction}`);
    }
    
    if (!Object.values(CONSTANTS.COLORS).slice(0, 4).includes(color)) {
      throw new Error(`Invalid prism color: ${color}`);
    }
  }
  
  /**
   * 计算折射后的方向
   * @param {string} inDirection - 进入方向 ('up', 'down', 'left', 'right')
   * @param {string} robotColor - 棋子颜色
   * @returns {string} 折射后的方向
   */
  refract(inDirection, robotColor) {
    // 如果颜色匹配，直线通过，方向不变
    if (robotColor === this.color) {
      return inDirection;
    }
    
    // 否则进行折射
    return this.calculateRefraction(inDirection);
  }
  
  /**
   * 计算折射方向（不考虑颜色）
   * 注意：inDirection 是棋子的移动方向（即进入分光镜的方向）
   * @param {string} inDirection - 进入方向
   * @returns {string} 折射后的方向
   */
  calculateRefraction(inDirection) {
    if (this.direction === '\\') {
      // 对角线 \ (左上到右下)
      // 棋子移动方向 → 折射后方向
      const refractionMap = {
        'right': 'down',  // 向右移动进入 → 向下折射
        'down': 'right',  // 向下移动进入 → 向右折射
        'left': 'up',     // 向左移动进入 → 向上折射
        'up': 'left'      // 向上移动进入 → 向左折射
      };
      return refractionMap[inDirection];
    } else {
      // 对角线 / (左下到右上)
      // 棋子移动方向 → 折射后方向
      const refractionMap = {
        'right': 'up',    // 向右移动进入 → 向上折射
        'up': 'right',    // 向上移动进入 → 向右折射
        'left': 'down',   // 向左移动进入 → 向下折射
        'down': 'left'    // 向下移动进入 → 向左折射
      };
      return refractionMap[inDirection];
    }
  }
  
  /**
   * 检查棋子是否可以通过（不被折射）
   * @param {string} robotColor - 棋子颜色
   * @returns {boolean}
   */
  canPassThrough(robotColor) {
    return robotColor === this.color;
  }
  
  /**
   * 旋转分光镜
   * @param {number} angle - 旋转角度
   * @param {number} size - 坐标系大小
   * @returns {Prism} 新的分光镜对象
   */
  rotate(angle, size = CONSTANTS.SMALL_BOARD_SIZE) {
    const newPos = Rotator.rotatePoint(this.x, this.y, angle, size);
    const newDirection = Rotator.rotatePrismDirection(this.direction, angle);
    return new Prism(newPos.x, newPos.y, newDirection, this.color);
  }
  
  /**
   * 获取分光镜的字符串表示
   * @returns {string}
   */
  toString() {
    return `Prism(${this.x},${this.y})[${this.direction},${this.color}]`;
  }
  
  /**
   * 克隆分光镜
   * @returns {Prism}
   */
  clone() {
    return new Prism(this.x, this.y, this.direction, this.color);
  }
  
  /**
   * 转换为JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      x: this.x,
      y: this.y,
      direction: this.direction,
      color: this.color
    };
  }
  
  /**
   * 从JSON创建分光镜
   * @param {Object} json
   * @returns {Prism}
   */
  static fromJSON(json) {
    return new Prism(json.x, json.y, json.direction, json.color);
  }
}

export default Prism;

