/**
 * Target 终点类
 * 表示棋盘上的终点
 */

import { Rotator } from '../utils/Rotator.js';
import CONSTANTS from '../utils/Constants.js';

export class Target {
  /**
   * @param {number} x - x坐标
   * @param {number} y - y坐标
   * @param {string} shape - 形状 ('circle', 'triangle', 'square', 'hexagon')
   * @param {string} color - 颜色 ('red', 'yellow', 'blue', 'green', 'rainbow')
   * @param {string} id - 唯一标识符
   */
  constructor(x, y, shape, color, id) {
    this.x = x;
    this.y = y;
    this.shape = shape;
    this.color = color;
    this.id = id;
    
    // 验证参数
    if (!Object.values(CONSTANTS.TARGET_SHAPES).includes(shape)) {
      throw new Error(`Invalid target shape: ${shape}`);
    }
    
    if (!Object.values(CONSTANTS.COLORS).includes(color)) {
      throw new Error(`Invalid target color: ${color}`);
    }
  }
  
  /**
   * 检查指定颜色的棋子是否可以到达此终点
   * @param {string} robotColor - 棋子颜色
   * @returns {boolean}
   */
  canAccept(robotColor) {
    // 彩色终点接受任何颜色
    if (this.color === CONSTANTS.COLORS.RAINBOW) {
      return true;
    }
    
    // 否则必须颜色匹配
    return this.color === robotColor;
  }
  
  /**
   * 旋转终点
   * @param {number} angle - 旋转角度
   * @param {number} size - 坐标系大小
   * @returns {Target} 新的终点对象
   */
  rotate(angle, size = CONSTANTS.SMALL_BOARD_SIZE) {
    const newPos = Rotator.rotatePoint(this.x, this.y, angle, size);
    return new Target(newPos.x, newPos.y, this.shape, this.color, this.id);
  }
  
  /**
   * 获取终点的显示名称
   * @returns {string}
   */
  getDisplayName() {
    const shapeNames = {
      'circle': '圆形',
      'triangle': '三角形',
      'square': '正方形',
      'hexagon': '六边形'
    };
    
    const colorNames = {
      'red': '红色',
      'yellow': '黄色',
      'blue': '蓝色',
      'green': '绿色',
      'rainbow': '彩色'
    };
    
    return `${colorNames[this.color]}${shapeNames[this.shape]}`;
  }
  
  /**
   * 获取终点的字符串表示
   * @returns {string}
   */
  toString() {
    return `Target(${this.x},${this.y})[${this.shape},${this.color},${this.id}]`;
  }
  
  /**
   * 克隆终点
   * @returns {Target}
   */
  clone() {
    return new Target(this.x, this.y, this.shape, this.color, this.id);
  }
  
  /**
   * 转换为JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      x: this.x,
      y: this.y,
      shape: this.shape,
      color: this.color,
      id: this.id
    };
  }
  
  /**
   * 从JSON创建终点
   * @param {Object} json
   * @returns {Target}
   */
  static fromJSON(json) {
    return new Target(json.x, json.y, json.shape, json.color, json.id);
  }
  
  /**
   * 获取emoji符号
   * @returns {string}
   */
  getEmoji() {
    const shapeEmojis = {
      'circle': '●',
      'triangle': '▲',
      'square': '■',
      'hexagon': '⬡'
    };
    return shapeEmojis[this.shape] || '●';
  }
  
  /**
   * 获取颜色代码（用于渲染）
   * @returns {string}
   */
  getColorCode() {
    const colorCodes = {
      'red': '#e74c3c',
      'yellow': '#f39c12',
      'blue': '#3498db',
      'green': '#2ecc71',
      'rainbow': 'linear-gradient(45deg, #e74c3c, #f39c12, #2ecc71, #3498db)'
    };
    return colorCodes[this.color];
  }
}

export default Target;

