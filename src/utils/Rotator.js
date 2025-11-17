/**
 * 旋转工具类
 * 处理坐标、方向等的旋转变换
 */

import CONSTANTS from './Constants.js';

export class Rotator {
  /**
   * 旋转点坐标
   * @param {number} x - 原始x坐标
   * @param {number} y - 原始y坐标
   * @param {number} angle - 旋转角度 (0, 90, 180, 270)
   * @param {number} size - 坐标系大小 (默认8，小棋盘)
   * @returns {{x: number, y: number}} 旋转后的坐标
   */
  static rotatePoint(x, y, angle, size = CONSTANTS.SMALL_BOARD_SIZE) {
    const maxIndex = size - 1;
    
    switch (angle) {
      case 0:
        return { x, y };
      case 90:
        // 顺时针90度: (x, y) -> (size-1-y, x)
        return { x: maxIndex - y, y: x };
      case 180:
        // 180度: (x, y) -> (size-1-x, size-1-y)
        return { x: maxIndex - x, y: maxIndex - y };
      case 270:
        // 顺时针270度: (x, y) -> (y, size-1-x)
        return { x: y, y: maxIndex - x };
      default:
        throw new Error(`Invalid rotation angle: ${angle}`);
    }
  }
  
  /**
   * 旋转分光镜方向
   * @param {string} direction - 原始方向 ('\\' 或 '/')
   * @param {number} angle - 旋转角度
   * @returns {string} 旋转后的方向
   */
  static rotatePrismDirection(direction, angle) {
    // \ 和 / 每旋转90度或270度会互换
    // 旋转180度保持不变
    const rotations = Math.floor((angle / 90) % 4);
    
    if (rotations === 0 || rotations === 2) {
      return direction;  // 0度或180度，方向不变
    } else {
      // 90度或270度，方向互换
      return direction === '\\' ? '/' : '\\';
    }
  }
  
  /**
   * 旋转移动方向
   * @param {string} direction - 原始方向 ('up', 'down', 'left', 'right')
   * @param {number} angle - 旋转角度
   * @returns {string} 旋转后的方向
   */
  static rotateDirection(direction, angle) {
    const directions = ['up', 'right', 'down', 'left'];
    const index = directions.indexOf(direction);
    
    if (index === -1) {
      throw new Error(`Invalid direction: ${direction}`);
    }
    
    const rotations = Math.floor((angle / 90) % 4);
    const newIndex = (index + rotations) % 4;
    
    return directions[newIndex];
  }
  
  /**
   * 旋转墙壁方向
   * @param {string} side - 墙壁位置 ('top', 'right', 'bottom', 'left')
   * @param {number} angle - 旋转角度
   * @returns {string} 旋转后的墙壁位置
   */
  static rotateWallSide(side, angle) {
    const sides = ['top', 'right', 'bottom', 'left'];
    const index = sides.indexOf(side);
    
    if (index === -1) {
      throw new Error(`Invalid wall side: ${side}`);
    }
    
    const rotations = Math.floor((angle / 90) % 4);
    const newIndex = (index + rotations) % 4;
    
    return sides[newIndex];
  }
  
  /**
   * 计算需要的旋转角度，使缺口从原始位置转到目标位置
   * @param {{x: number, y: number}} originalGap - 原始缺口位置
   * @param {{x: number, y: number}} targetGap - 目标缺口位置
   * @returns {number} 需要旋转的角度
   */
  static calculateRotationAngle(originalGap, targetGap) {
    const size = CONSTANTS.SMALL_BOARD_SIZE;
    const maxIndex = size - 1;
    
    // 将缺口位置映射到方向
    const getCorner = (pos) => {
      if (pos.x === 0 && pos.y === 0) return 0;        // 左上
      if (pos.x === maxIndex && pos.y === 0) return 1; // 右上
      if (pos.x === maxIndex && pos.y === maxIndex) return 2; // 右下
      if (pos.x === 0 && pos.y === maxIndex) return 3; // 左下
      throw new Error(`Invalid gap position: (${pos.x}, ${pos.y})`);
    };
    
    const originalCorner = getCorner(originalGap);
    const targetCorner = getCorner(targetGap);
    
    // 计算需要顺时针旋转的次数
    const rotations = (targetCorner - originalCorner + 4) % 4;
    
    return rotations * 90;
  }
  
  /**
   * 批量旋转点集合
   * @param {Array<{x: number, y: number}>} points - 点集合
   * @param {number} angle - 旋转角度
   * @param {number} size - 坐标系大小
   * @returns {Array<{x: number, y: number}>} 旋转后的点集合
   */
  static rotatePoints(points, angle, size = CONSTANTS.SMALL_BOARD_SIZE) {
    return points.map(point => this.rotatePoint(point.x, point.y, angle, size));
  }
}

export default Rotator;

