/**
 * BoardRenderer 棋盘渲染类
 * 负责在Canvas上渲染16×16游戏棋盘
 */

import CONSTANTS from '../utils/Constants.js';

export class BoardRenderer {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas元素
   * @param {Board} board - 棋盘对象（可选）
   */
  constructor(canvas, board = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.board = board;
    
    // 渲染配置
    this.cellSize = 40;
    this.wallWidth = 3;
    this.padding = 0;  // 设置为0，让棋盘占满整个canvas
    
    if (board) {
      this.initCanvas();
    }
    
    // 颜色配置
    this.colors = {
      background: '#FFFCF6',  // 格子背景色（浅米白色）
      grid: '#d4b89a',        // 网格线（稍深一点）
      wall: '#42311B',        // 墙壁颜色
      central: '#999999',     // 暂时保留，不再使用
      robot: {
        red: '#DF2822',
        yellow: '#EFC71E',
        blue: '#3E577F',
        green: '#3B991E'
      },
      prism: {
        red: 'rgba(223, 40, 34, 0.3)',
        yellow: 'rgba(239, 199, 30, 0.3)',
        blue: 'rgba(62, 87, 127, 0.3)',
        green: 'rgba(59, 153, 30, 0.3)'
      },
      target: {
        red: '#DF2822',
        yellow: '#EFC71E',
        blue: '#3E577F',
        green: '#3B991E',
        rainbow: 'conic-gradient(from 0deg, #DF2822, #EFC71E, #3B991E, #3E577F, #DF2822)'
      },
      smallBoard: {
        red: '#DF2822',
        yellow: '#EFC71E',
        blue: '#3E577F',
        green: '#3B991E'
      },
      path: 'rgba(62, 87, 127, 0.5)',
      pathStroke: '#3E577F',
      highlight: 'rgba(239, 199, 30, 0.3)',
      highlightStroke: '#EFC71E'
    };
    
    // 动画状态
    this.animating = false;
    this.currentAnimation = null;
  }
  
  /**
   * 初始化canvas尺寸
   */
  initCanvas() {
    if (!this.board) {
      // 使用默认尺寸
      this.canvasWidth = CONSTANTS.LARGE_BOARD_SIZE * this.cellSize + this.padding * 2;
      this.canvasHeight = CONSTANTS.LARGE_BOARD_SIZE * this.cellSize + this.padding * 2;
    } else {
      this.canvasWidth = this.board.size * this.cellSize + this.padding * 2;
      this.canvasHeight = this.board.size * this.cellSize + this.padding * 2;
    }
    
    // 设置canvas尺寸
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
  }
  
  /**
   * 设置棋盘
   * @param {Board} board
   */
  setBoard(board) {
    this.board = board;
    this.initCanvas();
  }
  
  /**
   * 渲染整个棋盘
   * @param {Array<Robot>} robots - 棋子数组
   * @param {Object} options - 渲染选项
   */
  render(robots = [], options = {}) {
    const {
      highlightCells = [],
      pathSegments = [],
      showCoordinates = false
    } = options;
    
    // 清空画布
    this.clear();
    
    // 绘制背景
    this.drawBackground();
    
    // 绘制格子和墙壁
    this.drawCells();
    
    // 绘制中央不可达区域
    this.drawCentralArea();
    
    // 绘制分光镜
    this.drawPrisms();
    
    // 绘制终点
    this.drawTargets();
    
    // 绘制高亮格子
    if (highlightCells.length > 0) {
      this.drawHighlights(highlightCells);
    }
    
    // 绘制路径
    if (pathSegments.length > 0) {
      this.drawPath(pathSegments);
    }
    
    // 绘制棋子
    this.drawRobots(robots);
    
    // 绘制坐标（可选）
    if (showCoordinates) {
      this.drawCoordinates();
    }
  }
  
  /**
   * 清空画布
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
  }
  
  /**
   * 绘制背景
   */
  drawBackground() {
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }
  
  /**
   * 绘制所有格子和墙壁
   */
  drawCells() {
    let totalWalls = 0;
    
    for (let y = 0; y < this.board.size; y++) {
      for (let x = 0; x < this.board.size; x++) {
        const cell = this.board.getCell(x, y);
        if (cell) {
          // 统计墙壁数量
          ['top', 'right', 'bottom', 'left'].forEach(side => {
            if (cell.hasWall(side)) totalWalls++;
          });
          
          this.drawCell(x, y, cell);
        }
      }
    }
    
  }
  
  /**
   * 绘制单个格子
   * @param {number} x
   * @param {number} y
   * @param {Cell} cell
   */
  drawCell(x, y, cell) {
    const px = this.padding + x * this.cellSize;
    const py = this.padding + y * this.cellSize;
    
    // 绘制格子背景色
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
    
    // 绘制格子边框（网格）
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(px, py, this.cellSize, this.cellSize);
    
    // 绘制墙壁
    this.ctx.strokeStyle = this.colors.wall;
    this.ctx.lineWidth = this.wallWidth;
    
    if (cell.hasWall('top')) {
      this.ctx.beginPath();
      this.ctx.moveTo(px, py);
      this.ctx.lineTo(px + this.cellSize, py);
      this.ctx.stroke();
    }
    
    if (cell.hasWall('right')) {
      this.ctx.beginPath();
      this.ctx.moveTo(px + this.cellSize, py);
      this.ctx.lineTo(px + this.cellSize, py + this.cellSize);
      this.ctx.stroke();
    }
    
    if (cell.hasWall('bottom')) {
      this.ctx.beginPath();
      this.ctx.moveTo(px, py + this.cellSize);
      this.ctx.lineTo(px + this.cellSize, py + this.cellSize);
      this.ctx.stroke();
    }
    
    if (cell.hasWall('left')) {
      this.ctx.beginPath();
      this.ctx.moveTo(px, py);
      this.ctx.lineTo(px, py + this.cellSize);
      this.ctx.stroke();
    }
  }
  
  /**
   * 绘制中央不可达区域
   * 中央2×2区域的四个格子显示为四个小棋盘的颜色
   */
  drawCentralArea() {
    const blocked = CONSTANTS.CENTRAL_BLOCKED;
    
    // 中央2×2区域的四个格子分别来自四个小棋盘
    // topLeft(7,7) - 来自左上小棋盘
    // topRight(8,7) - 来自右上小棋盘  
    // bottomLeft(7,8) - 来自左下小棋盘
    // bottomRight(8,8) - 来自右下小棋盘
    
    const centralCells = [
      { x: 7, y: 7, position: 'topLeft' },
      { x: 8, y: 7, position: 'topRight' },
      { x: 7, y: 8, position: 'bottomLeft' },
      { x: 8, y: 8, position: 'bottomRight' }
    ];
    
    // 从Board获取每个位置的小棋盘颜色
    centralCells.forEach(({ x, y, position }) => {
      const px = this.padding + x * this.cellSize;
      const py = this.padding + y * this.cellSize;
      
      // 获取该位置对应的小棋盘颜色
      let color = '#999999'; // 默认灰色
      
      if (this.board && this.board.config) {
        const positionIndex = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].indexOf(position);
        if (positionIndex >= 0 && this.board.config[positionIndex]) {
          const boardConfig = this.board.config[positionIndex];
          const smallBoard = this.board.smallBoards[boardConfig.boardId];
          if (smallBoard) {
            color = this.colors.smallBoard[smallBoard.color] || '#999999';
          }
        }
      }
      
      // 绘制该格子的背景色为小棋盘颜色
      this.ctx.fillStyle = color;
      this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
      
      // 绘制格子边框
      this.ctx.strokeStyle = this.colors.grid;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(px, py, this.cellSize, this.cellSize);
    });
  }
  
  /**
   * 绘制所有分光镜
   */
  drawPrisms() {
    for (let y = 0; y < this.board.size; y++) {
      for (let x = 0; x < this.board.size; x++) {
        const cell = this.board.getCell(x, y);
        if (cell && cell.hasPrism()) {
          this.drawPrism(x, y, cell.prism);
        }
      }
    }
  }
  
  /**
   * 绘制单个分光镜
   * @param {number} x
   * @param {number} y
   * @param {Prism} prism
   */
  drawPrism(x, y, prism) {
    const px = this.padding + x * this.cellSize;
    const py = this.padding + y * this.cellSize;
    const center = this.cellSize / 2;
    
    // 不绘制背景色，保持格子原本的颜色
    
    // 绘制对角线（加粗）
    this.ctx.strokeStyle = this.colors.robot[prism.color];
    this.ctx.lineWidth = 5;  // 从3增加到5
    this.ctx.lineCap = 'round';  // 圆角端点
    this.ctx.beginPath();
    
    if (prism.direction === '\\') {
      // 左上到右下
      this.ctx.moveTo(px + 5, py + 5);
      this.ctx.lineTo(px + this.cellSize - 5, py + this.cellSize - 5);
    } else {
      // 左下到右上
      this.ctx.moveTo(px + 5, py + this.cellSize - 5);
      this.ctx.lineTo(px + this.cellSize - 5, py + 5);
    }
    
    this.ctx.stroke();
    
    // 绘制颜色标识（小圆点）
    this.ctx.fillStyle = this.colors.robot[prism.color];
    this.ctx.beginPath();
    this.ctx.arc(px + center, py + center, 5, 0, Math.PI * 2);  // 从4增加到5
    this.ctx.fill();
  }
  
  /**
   * 绘制所有终点
   */
  drawTargets() {
    for (let y = 0; y < this.board.size; y++) {
      for (let x = 0; x < this.board.size; x++) {
        const cell = this.board.getCell(x, y);
        if (cell && cell.hasTarget()) {
          this.drawTarget(x, y, cell.target);
        }
      }
    }
  }
  
  /**
   * 绘制单个终点
   * @param {number} x
   * @param {number} y
   * @param {Target} target
   */
  drawTarget(x, y, target) {
    const px = this.padding + x * this.cellSize + this.cellSize / 2;
    const py = this.padding + y * this.cellSize + this.cellSize / 2;
    const size = 12;
    
    // 填充颜色（彩虹色使用圆锥渐变）
    if (target.color === 'rainbow') {
      const gradient = this.ctx.createConicGradient(0, px, py);
      gradient.addColorStop(0, this.colors.target.red);
      gradient.addColorStop(0.25, this.colors.target.yellow);
      gradient.addColorStop(0.5, this.colors.target.green);
      gradient.addColorStop(0.75, this.colors.target.blue);
      gradient.addColorStop(1, this.colors.target.red);
      this.ctx.fillStyle = gradient;
    } else {
      this.ctx.fillStyle = this.colors.target[target.color];
    }
    
    this.ctx.beginPath();
    
    switch (target.shape) {
      case 'circle':
        this.ctx.arc(px, py, size, 0, Math.PI * 2);
        break;
        
      case 'triangle':
        this.ctx.moveTo(px, py - size);
        this.ctx.lineTo(px + size, py + size);
        this.ctx.lineTo(px - size, py + size);
        this.ctx.closePath();
        break;
        
      case 'square':
        this.ctx.rect(px - size, py - size, size * 2, size * 2);
        break;
        
      case 'hexagon':
        const angle = Math.PI / 3;
        for (let i = 0; i < 6; i++) {
          const hx = px + size * Math.cos(angle * i);
          const hy = py + size * Math.sin(angle * i);
          if (i === 0) {
            this.ctx.moveTo(hx, hy);
          } else {
            this.ctx.lineTo(hx, hy);
          }
        }
        this.ctx.closePath();
        break;
    }
    
    this.ctx.fill();
  }
  
  /**
   * 绘制所有棋子
   * @param {Array<Robot>} robots
   */
  drawRobots(robots) {
    robots.forEach(robot => {
      this.drawRobot(robot);
    });
  }
  
  /**
   * 绘制单个棋子
   * @param {Robot} robot
   */
  drawRobot(robot) {
    const px = this.padding + robot.x * this.cellSize + this.cellSize / 2;
    const py = this.padding + robot.y * this.cellSize + this.cellSize / 2;
    const radius = 14;
    
    // 绘制阴影
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;
    
    // 绘制棋子
    this.ctx.fillStyle = this.colors.robot[robot.color];
    this.ctx.beginPath();
    this.ctx.arc(px, py, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 重置阴影
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    
    // 绘制边框
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // 绘制颜色首字母
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(robot.color[0].toUpperCase(), px, py);
  }
  
  /**
   * 绘制高亮格子
   * @param {Array} cells - [{x, y}]
   */
  drawHighlights(cells) {
    cells.forEach(({ x, y }) => {
      const px = this.padding + x * this.cellSize;
      const py = this.padding + y * this.cellSize;
      
      this.ctx.fillStyle = this.colors.highlight;
      this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
      
      this.ctx.strokeStyle = this.colors.highlightStroke;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);
    });
  }
  
  /**
   * 绘制路径
   * @param {Array} segments - 路径段数组
   */
  drawPath(segments) {
    segments.forEach((segment, index) => {
      this.drawPathSegment(segment, index);
    });
  }
  
  /**
   * 绘制单个路径段
   * @param {Object} segment
   * @param {number} index
   */
  drawPathSegment(segment, index) {
    const fromPx = this.padding + segment.from.x * this.cellSize + this.cellSize / 2;
    const fromPy = this.padding + segment.from.y * this.cellSize + this.cellSize / 2;
    const toPx = this.padding + segment.to.x * this.cellSize + this.cellSize / 2;
    const toPy = this.padding + segment.to.y * this.cellSize + this.cellSize / 2;
    
    // 绘制路径线
    this.ctx.strokeStyle = this.colors.pathStroke;
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(fromPx, fromPy);
    this.ctx.lineTo(toPx, toPy);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }
  
  /**
   * 绘制坐标
   */
  drawCoordinates() {
    this.ctx.fillStyle = '#666';
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // 绘制列号
    for (let x = 0; x < this.board.size; x++) {
      const px = this.padding + x * this.cellSize + this.cellSize / 2;
      this.ctx.fillText(x.toString(), px, this.padding / 2);
    }
    
    // 绘制行号
    for (let y = 0; y < this.board.size; y++) {
      const py = this.padding + y * this.cellSize + this.cellSize / 2;
      this.ctx.fillText(y.toString(), this.padding / 2, py);
    }
  }
  
  /**
   * 将像素坐标转换为格子坐标
   * @param {number} px
   * @param {number} py
   * @returns {Object|null}
   */
  pixelToCell(px, py) {
    const x = Math.floor((px - this.padding) / this.cellSize);
    const y = Math.floor((py - this.padding) / this.cellSize);
    
    if (x >= 0 && x < this.board.size && y >= 0 && y < this.board.size) {
      return { x, y };
    }
    
    return null;
  }
  
  /**
   * 截图
   * @returns {string} Data URL
   */
  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }
}

export default BoardRenderer;

