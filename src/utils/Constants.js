/**
 * V2 游戏常量定义
 */

export const CONSTANTS = {
  // 棋盘尺寸
  SMALL_BOARD_SIZE: 8,
  LARGE_BOARD_SIZE: 16,
  CENTRAL_GAP_SIZE: 2,
  
  // 颜色定义
  COLORS: {
    RED: 'red',
    YELLOW: 'yellow',
    BLUE: 'blue',
    GREEN: 'green',
    RAINBOW: 'rainbow'
  },
  
  // 颜色顺序（用于编码）
  COLOR_ORDER: ['red', 'yellow', 'blue', 'green'],
  
  // 棋盘位置
  BOARD_POSITIONS: {
    TOP_LEFT: 'topLeft',
    TOP_RIGHT: 'topRight',
    BOTTOM_LEFT: 'bottomLeft',
    BOTTOM_RIGHT: 'bottomRight'
  },
  
  // 方向
  DIRECTIONS: {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right'
  },
  
  // 分光镜方向
  PRISM_DIRECTIONS: {
    BACKSLASH: '\\',  // 左上到右下
    SLASH: '/'        // 左下到右上
  },
  
  // 终点形状
  TARGET_SHAPES: {
    CIRCLE: 'circle',
    TRIANGLE: 'triangle',
    SQUARE: 'square',
    HEXAGON: 'hexagon'
  },
  
  // 旋转角度
  ROTATIONS: [0, 90, 180, 270],
  
  // 目标缺口位置（小棋盘在大棋盘中的目标缺口）
  TARGET_GAPS: {
    topLeft: { x: 7, y: 7 },      // 右下角
    topRight: { x: 0, y: 7 },     // 左下角
    bottomLeft: { x: 7, y: 0 },   // 右上角
    bottomRight: { x: 0, y: 0 }   // 左上角
  },
  
  // 中央不可达区域
  CENTRAL_BLOCKED: {
    x: [7, 8],  // 列7和8
    y: [7, 8]   // 行7和8
  }
};

export default CONSTANTS;

