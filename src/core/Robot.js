/**
 * Robot 棋子类
 * 表示可移动的棋子
 */

import CONSTANTS from '../utils/Constants.js';

export class Robot {
  /**
   * @param {string} color - 颜色 ('red', 'yellow', 'blue', 'green')
   * @param {number} x - 初始x坐标
   * @param {number} y - 初始y坐标
   */
  constructor(color, x, y) {
    this.color = color;
    this.x = x;
    this.y = y;
    this.initialX = x;
    this.initialY = y;
    
    // 验证颜色
    if (!CONSTANTS.COLOR_ORDER.includes(color)) {
      throw new Error(`Invalid robot color: ${color}`);
    }
  }
  
  /**
   * 移动到新位置
   * @param {number} x - 新x坐标
   * @param {number} y - 新y坐标
   */
  moveTo(x, y) {
    this.x = x;
    this.y = y;
  }
  
  /**
   * 获取当前位置
   * @returns {{x: number, y: number}}
   */
  getPosition() {
    return { x: this.x, y: this.y };
  }
  
  /**
   * 重置到初始位置
   */
  reset() {
    this.x = this.initialX;
    this.y = this.initialY;
  }
  
  /**
   * 检查是否在指定位置
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isAt(x, y) {
    return this.x === x && this.y === y;
  }
  
  /**
   * 获取颜色的中文名称
   * @returns {string}
   */
  getColorName() {
    const colorNames = {
      'red': '红色',
      'yellow': '黄色',
      'blue': '蓝色',
      'green': '绿色'
    };
    return colorNames[this.color];
  }
  
  /**
   * 获取颜色代码
   * @returns {string}
   */
  getColorCode() {
    const colorCodes = {
      'red': '#e74c3c',
      'yellow': '#f39c12',
      'blue': '#3498db',
      'green': '#2ecc71'
    };
    return colorCodes[this.color];
  }
  
  /**
   * 获取棋子编号（1-4）
   * @returns {number}
   */
  getNumber() {
    return CONSTANTS.COLOR_ORDER.indexOf(this.color) + 1;
  }
  
  /**
   * 获取emoji表情
   * @returns {string}
   */
  getEmoji() {
    const emojis = {
      'red': '🔴',
      'yellow': '🟡',
      'blue': '🔵',
      'green': '🟢'
    };
    return emojis[this.color];
  }
  
  /**
   * 计算到目标位置的曼哈顿距离
   * @param {number} targetX
   * @param {number} targetY
   * @returns {number}
   */
  manhattanDistance(targetX, targetY) {
    return Math.abs(this.x - targetX) + Math.abs(this.y - targetY);
  }
  
  /**
   * 获取棋子的字符串表示
   * @returns {string}
   */
  toString() {
    return `Robot[${this.color}](${this.x},${this.y})`;
  }
  
  /**
   * 克隆棋子
   * @returns {Robot}
   */
  clone() {
    const robot = new Robot(this.color, this.x, this.y);
    robot.initialX = this.initialX;
    robot.initialY = this.initialY;
    return robot;
  }
  
  /**
   * 转换为JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      color: this.color,
      x: this.x,
      y: this.y,
      initialX: this.initialX,
      initialY: this.initialY
    };
  }
  
  /**
   * 从JSON创建棋子
   * @param {Object} json
   * @returns {Robot}
   */
  static fromJSON(json) {
    const robot = new Robot(json.color, json.x, json.y);
    if (json.initialX !== undefined) robot.initialX = json.initialX;
    if (json.initialY !== undefined) robot.initialY = json.initialY;
    return robot;
  }
  
  /**
   * 创建一组棋子
   * @param {Object} positions - {red: {x, y}, yellow: {x, y}, blue: {x, y}, green: {x, y}}
   * @returns {Array<Robot>}
   */
  static createRobots(positions) {
    return CONSTANTS.COLOR_ORDER.map(color => {
      const pos = positions[color];
      if (!pos) {
        throw new Error(`Missing position for robot color: ${color}`);
      }
      return new Robot(color, pos.x, pos.y);
    });
  }
}

export default Robot;

