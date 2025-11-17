/**
 * 编码解码工具类
 * 处理棋盘配置和棋子位置的编码/解码
 */

import CONSTANTS from './Constants.js';

export class Encoder {
  /**
   * 编码单个小棋盘选择（编号+面）
   * @param {number} boardId - 棋盘编号 (0-7)
   * @param {number} faceId - 面编号 (0 或 1)
   * @returns {string} 单个十六进制字符 (0-F)
   */
  static encodeSmallBoard(boardId, faceId) {
    if (boardId < 0 || boardId > 7) {
      throw new Error(`Invalid board ID: ${boardId}`);
    }
    if (faceId !== 0 && faceId !== 1) {
      throw new Error(`Invalid face ID: ${faceId}`);
    }
    
    // 3位编号 + 1位面 = 4位二进制 = 1位十六进制
    const value = (boardId << 1) | faceId;
    return value.toString(16).toUpperCase();
  }
  
  /**
   * 解码单个小棋盘选择
   * @param {string} hexChar - 单个十六进制字符
   * @returns {{boardId: number, faceId: number}}
   */
  static decodeSmallBoard(hexChar) {
    const value = parseInt(hexChar, 16);
    
    if (isNaN(value) || value < 0 || value > 15) {
      throw new Error(`Invalid hex character: ${hexChar}`);
    }
    
    const boardId = (value >> 1) & 0x7;  // 高3位
    const faceId = value & 0x1;           // 低1位
    
    return { boardId, faceId };
  }
  
  /**
   * 编码大棋盘配置
   * @param {Array<{boardId: number, faceId: number}>} boards - 4个小棋盘配置
   *        顺序：[左上, 右上, 左下, 右下]
   * @returns {string} 4位十六进制字符串
   */
  static encodeBoardConfig(boards) {
    if (!Array.isArray(boards) || boards.length !== 4) {
      throw new Error('Boards must be an array of 4 configurations');
    }
    
    return boards.map(board => 
      this.encodeSmallBoard(board.boardId, board.faceId)
    ).join('');
  }
  
  /**
   * 解码大棋盘配置
   * @param {string} code - 4位十六进制字符串
   * @returns {Array<{boardId: number, faceId: number, position: string}>}
   */
  static decodeBoardConfig(code) {
    if (!/^[0-9A-Fa-f]{4}$/.test(code)) {
      throw new Error(`Invalid board code format: ${code}`);
    }
    
    const positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    
    return code.split('').map((char, index) => {
      const { boardId, faceId } = this.decodeSmallBoard(char);
      return {
        boardId,
        faceId,
        position: positions[index]
      };
    });
  }
  
  /**
   * 编码单个棋子位置
   * @param {number} x - x坐标 (0-15)
   * @param {number} y - y坐标 (0-15)
   * @returns {string} 2位十六进制字符串
   */
  static encodePosition(x, y) {
    if (x < 0 || x > 15 || y < 0 || y > 15) {
      throw new Error(`Invalid position: (${x}, ${y})`);
    }
    
    // 4位x + 4位y = 8位 = 2位十六进制
    const value = (x << 4) | y;
    return value.toString(16).toUpperCase().padStart(2, '0');
  }
  
  /**
   * 解码单个棋子位置
   * @param {string} code - 2位十六进制字符串
   * @returns {{x: number, y: number}}
   */
  static decodePosition(code) {
    if (!/^[0-9A-Fa-f]{2}$/.test(code)) {
      throw new Error(`Invalid position code: ${code}`);
    }
    
    const value = parseInt(code, 16);
    const x = (value >> 4) & 0xF;
    const y = value & 0xF;
    
    return { x, y };
  }
  
  /**
   * 编码所有棋子位置
   * @param {Object} positions - 棋子位置对象
   *        {red: {x, y}, yellow: {x, y}, blue: {x, y}, green: {x, y}}
   * @returns {string} 8位十六进制字符串
   */
  static encodeRobotPositions(positions) {
    const colors = CONSTANTS.COLOR_ORDER;
    
    return colors.map(color => {
      const pos = positions[color];
      if (!pos || pos.x === undefined || pos.y === undefined) {
        throw new Error(`Missing position for color: ${color}`);
      }
      return this.encodePosition(pos.x, pos.y);
    }).join('');
  }
  
  /**
   * 解码所有棋子位置
   * @param {string} code - 8位十六进制字符串
   * @returns {Object} 棋子位置对象
   */
  static decodeRobotPositions(code) {
    if (!/^[0-9A-Fa-f]{8}$/.test(code)) {
      throw new Error(`Invalid robot positions code: ${code}`);
    }
    
    const colors = CONSTANTS.COLOR_ORDER;
    const positions = {};
    
    for (let i = 0; i < 4; i++) {
      const posCode = code.substr(i * 2, 2);
      positions[colors[i]] = this.decodePosition(posCode);
    }
    
    return positions;
  }
  
  /**
   * 编码完整游戏配置
   * @param {string} boardCode - 4位十六进制棋盘码
   * @param {Object} positions - 棋子位置
   * @returns {string} 12位十六进制完整编码
   */
  static encodeGame(boardCode, positions) {
    const posCode = this.encodeRobotPositions(positions);
    return boardCode + posCode;
  }
  
  /**
   * 解码完整游戏配置
   * @param {string} code - 12位十六进制完整编码
   * @returns {{boardConfig: Array, robotPositions: Object}}
   */
  static decodeGame(code) {
    if (!/^[0-9A-Fa-f]{12}$/.test(code)) {
      throw new Error(`Invalid game code format: ${code}`);
    }
    
    const boardCode = code.substr(0, 4);
    const posCode = code.substr(4, 8);
    
    return {
      boardConfig: this.decodeBoardConfig(boardCode),
      robotPositions: this.decodeRobotPositions(posCode)
    };
  }
  
  /**
   * 生成随机游戏编码
   * @param {Object} options - 配置选项
   * @returns {string} 12位十六进制编码
   */
  static generateRandomGame(options = {}) {
    // 随机选择4个不同颜色的小棋盘
    // 这需要知道每个小棋盘的颜色，暂时生成随机值
    const boardCode = Array(4).fill(0)
      .map(() => Math.floor(Math.random() * 16).toString(16).toUpperCase())
      .join('');
    
    // 随机生成棋子位置（避开中央区域）
    const positions = {};
    CONSTANTS.COLOR_ORDER.forEach(color => {
      let x, y;
      do {
        x = Math.floor(Math.random() * 16);
        y = Math.floor(Math.random() * 16);
      } while (this.isInCentralGap(x, y));
      
      positions[color] = { x, y };
    });
    
    return this.encodeGame(boardCode, positions);
  }
  
  /**
   * 检查位置是否在中央不可达区域
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  static isInCentralGap(x, y) {
    return CONSTANTS.CENTRAL_BLOCKED.x.includes(x) && 
           CONSTANTS.CENTRAL_BLOCKED.y.includes(y);
  }
  
  /**
   * 验证游戏编码的有效性
   * @param {string} code - 游戏编码
   * @returns {{valid: boolean, errors: Array<string>}}
   */
  static validateGameCode(code) {
    const errors = [];
    
    // 格式检查
    if (!/^[0-9A-Fa-f]{12}$/.test(code)) {
      errors.push('Invalid code format. Expected 12 hexadecimal characters.');
      return { valid: false, errors };
    }
    
    try {
      const { boardConfig, robotPositions } = this.decodeGame(code);
      
      // 检查棋子位置是否有效
      Object.entries(robotPositions).forEach(([color, pos]) => {
        if (this.isInCentralGap(pos.x, pos.y)) {
          errors.push(`${color} robot is in the central blocked area`);
        }
      });
      
      // 检查棋子位置是否重复
      const posSet = new Set();
      Object.values(robotPositions).forEach(pos => {
        const key = `${pos.x},${pos.y}`;
        if (posSet.has(key)) {
          errors.push(`Duplicate robot position: (${pos.x}, ${pos.y})`);
        }
        posSet.add(key);
      });
      
    } catch (error) {
      errors.push(error.message);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default Encoder;

