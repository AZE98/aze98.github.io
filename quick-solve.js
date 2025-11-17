/**
 * 快速求解页面 - 整合配置和求解
 */

import { Encoder } from './src/utils/Encoder.js';
import { SmallBoard } from './src/core/SmallBoard.js';
import { BoardRenderer } from './src/ui/BoardRenderer.js';
import { Board } from './src/core/Board.js';
import { Game } from './src/core/Game.js';
import { PathFinder } from './src/algorithm/PathFinder.js';
import { Robot } from './src/core/Robot.js';
import { Rotator } from './src/utils/Rotator.js';

class QuickSolveApp {
  constructor() {
    this.smallBoards = [];
    this.config = [null, null, null, null];
    this.robotPositions = { red: null, yellow: null, blue: null, green: null };
    this.usedColors = new Set();
    
    this.phase = 'config'; // config, robot, target, solution
    this.currentPosition = null;
    this.selectedColor = null;
    this.selectedBoardData = null;
    this.settingRobotColor = null;
    this.selectedTarget = null;
    
    this.board = null;
    this.boardRenderer = null;
    this.game = null;
    this.pathFinder = null;
    this.currentSolution = null;
    
    this.animationState = {
      playing: false,
      currentStep: 0,
      savedPositions: null
    };
    
    this.init();
  }
  
  async init() {
    
    await this.loadSmallBoards();
    this.calculateCanvasSize();
    this.initUI();
    this.renderMainBoard();
    
    window.addEventListener('resize', () => {
      this.calculateCanvasSize();
      // 如果已有Board，需要重新创建BoardRenderer以适应新尺寸
      if (this.board) {
        this.boardRenderer = null;
      }
      this.renderMainBoard();
    });
    
  }
  
  async loadSmallBoards() {
    const boardFiles = [
      './data/board-0.json',
      './data/board-1.json',
      './data/board-2.json',
      './data/board-3.json',
      './data/board-4.json',
      './data/board-5.json',
      './data/board-6.json',
      './data/board-7.json'
    ];
    
    for (let i = 0; i < boardFiles.length; i++) {
      try {
        const response = await fetch(boardFiles[i]);
        const data = await response.json();
        this.smallBoards.push(data);
      } catch (error) {
        console.error(`加载 ${boardFiles[i]} 失败:`, error);
      }
    }
  }
  
  calculateCanvasSize() {
    const canvas = document.getElementById('mainBoard');
    if (!canvas) return;
    
    const boardSection = canvas.parentElement;
    if (!boardSection) return;
    
    const rect = boardSection.getBoundingClientRect();
    const availableWidth = rect.width - 30;
    const availableHeight = rect.height - 30;
    
    let maxSize = Math.min(availableWidth, availableHeight);
    
    if (window.innerWidth <= 768) {
      maxSize = Math.min(window.innerWidth - 40, window.innerHeight * 0.4);
    }
    
    maxSize = Math.max(maxSize, 200);
    
    this.cellSize = Math.floor(maxSize / 16);
    this.canvasSize = this.cellSize * 16;
    
    canvas.width = this.canvasSize;
    canvas.height = this.canvasSize;
    canvas.style.width = this.canvasSize + 'px';
    canvas.style.height = this.canvasSize + 'px';
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '100%';
  }
  
  initUI() {
    const canvas = document.getElementById('mainBoard');
    canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const mouseEvent = new MouseEvent('click', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true
        });
        canvas.dispatchEvent(mouseEvent);
      }
    });
    
    // 模态框
    document.getElementById('closeColorModal').addEventListener('click', () => {
      this.closeModal('colorModal');
    });
    
    document.getElementById('closeBoardModal').addEventListener('click', () => {
      this.closeModal('boardModal');
    });
    
    document.getElementById('confirmBoardBtn').addEventListener('click', () => {
      this.confirmBoardSelection();
    });
    
    // 按钮
    document.getElementById('solveBtn').addEventListener('click', () => {
      this.solvePath();
    });
    
    document.getElementById('playBtn').addEventListener('click', () => {
      this.playAnimation();
    });
    
    document.getElementById('pauseBtn').addEventListener('click', () => {
      this.pauseAnimation();
    });
    
    document.getElementById('replayBtn').addEventListener('click', () => {
      this.replayAnimation();
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
      this.reset();
    });
    
    document.getElementById('confirmRobotsBtn').addEventListener('click', () => {
      this.confirmRobots();
    });
    
    // 标签页
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.solution-tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        const tab = btn.dataset.tab;
        document.getElementById(tab === 'simple' ? 'simpleSolution' : 'detailedSolution')
          .classList.add('active');
      });
    });
  }
  
  handleCanvasClick(e) {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    
    // 获取点击位置相对于canvas显示区域的坐标
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // 计算缩放比例：canvas内部分辨率 / 显示大小
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // 转换为canvas内部坐标
    const canvasX = clickX * scaleX;
    const canvasY = clickY * scaleY;
    
    // 计算格子坐标（BoardRenderer.padding = 0，直接计算）
    const cellSize = canvas.width / 16;
    const x = Math.floor(canvasX / cellSize);
    const y = Math.floor(canvasY / cellSize);
    
    // 详细调试日志
    if (this.phase === 'robot') {
      // 可视化点击位置
      this.visualizeClick(canvasX, canvasY, x, y, cellSize);
    }
    
    // 边界检查
    if (x < 0 || x >= 16 || y < 0 || y >= 16) return;
    
    if (this.phase === 'config') {
      this.handleConfigClick(x, y);
    } else if (this.phase === 'robot') {
      this.handleRobotClick(x, y);
    } else if (this.phase === 'target') {
      this.handleTargetClick(x, y);
    }
  }
  
  visualizeClick(canvasX, canvasY, gridX, gridY, cellSize) {
    const canvas = document.getElementById('mainBoard');
    const ctx = canvas.getContext('2d');
    
    // 保存当前状态
    ctx.save();
    
    // 绘制点击位置（红色十字）
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(canvasX - 15, canvasY);
    ctx.lineTo(canvasX + 15, canvasY);
    ctx.moveTo(canvasX, canvasY - 15);
    ctx.lineTo(canvasX, canvasY + 15);
    ctx.stroke();
    
    // 绘制点击位置的圆圈
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
    
    // 绘制计算出的格子（绿色边框）
    ctx.strokeStyle = 'lime';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(0,255,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.strokeRect(
      gridX * cellSize,
      gridY * cellSize,
      cellSize,
      cellSize
    );
    
    // 绘制格子中心（蓝色圆点）
    const centerX = (gridX + 0.5) * cellSize;
    const centerY = (gridY + 0.5) * cellSize;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'blue';
    ctx.fill();
    
    // 添加文字标签
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 20px sans-serif';
    const text = `(${gridX},${gridY})`;
    ctx.strokeText(text, canvasX + 20, canvasY - 10);
    ctx.fillText(text, canvasX + 20, canvasY - 10);
    
    // 恢复状态
    ctx.restore();
    
    // 1.5秒后清除可视化
    setTimeout(() => {
      this.renderMainBoard();
    }, 1500);
  }
  
  handleConfigClick(x, y) {
    let position = null;
    if (x < 8 && y < 8) position = 0;
    else if (x >= 8 && y < 8) position = 1;
    else if (x < 8 && y >= 8) position = 2;
    else if (x >= 8 && y >= 8) position = 3;
    
    if (position === null) return;
    
    this.currentPosition = position;
    this.showColorSelection();
  }
  
  handleRobotClick(x, y) {
    if (!this.settingRobotColor) return;
    
    if (x < 0 || x >= 16 || y < 0 || y >= 16) return;
    if ((x === 7 || x === 8) && (y === 7 || y === 8)) {
      alert('中央区域不可放置棋子！');
      return;
    }
    
    for (const [color, pos] of Object.entries(this.robotPositions)) {
      if (pos && pos.x === x && pos.y === y && color !== this.settingRobotColor) {
        alert('该位置已有其他棋子！');
        return;
      }
    }
    
    this.robotPositions[this.settingRobotColor] = { x, y };
    this.updateRobotList();
    this.renderMainBoard();
    
    // 检查是否所有棋子都设置完成，启用确认按钮
    const allSet = Object.values(this.robotPositions).every(pos => pos !== null);
    document.getElementById('confirmRobotsBtn').disabled = !allSet;
  }
  
  confirmRobots() {
    // 用户点击确认按钮后才进入下一阶段
    const allSet = Object.values(this.robotPositions).every(pos => pos !== null);
    if (allSet) {
      this.startTargetPhase();
    }
  }
  
  handleTargetClick(x, y) {
    // 在target阶段，点击棋盘选择终点
    if (!this.game) return;
    
    const targets = this.game.board.getAllTargets();
    const clickedTarget = targets.find(t => t.x === x && t.y === y);
    
    if (clickedTarget) {
      this.selectTarget(clickedTarget.id);
    }
  }
  
  showColorSelection() {
    const modal = document.getElementById('colorModal');
    const selection = document.getElementById('colorSelection');
    
    const colors = ['red', 'yellow', 'blue', 'green'];
    const colorNames = { red: '红色', yellow: '黄色', blue: '蓝色', green: '绿色' };
    
    selection.innerHTML = colors.map(color => {
      const isUsed = this.usedColors.has(color);
      const isCurrentlyUsed = this.config[this.currentPosition]?.color === color;
      const disabled = isUsed && !isCurrentlyUsed;
      
      return `
        <div class="color-option ${color} ${disabled ? 'disabled' : ''}" 
             onclick="app.selectColor('${color}', ${disabled})">
          ${colorNames[color]}
        </div>
      `;
    }).join('');
    
    modal.classList.add('active');
  }
  
  selectColor(color, disabled) {
    if (disabled) return;
    
    this.selectedColor = color;
    this.closeModal('colorModal');
    this.showBoardSelection(color);
  }
  
  showBoardSelection(color) {
    const modal = document.getElementById('boardModal');
    const title = document.getElementById('boardModalTitle');
    const selection = document.getElementById('boardSelection');
    
    const colorNames = { red: '红色', yellow: '黄色', blue: '蓝色', green: '绿色' };
    title.textContent = `选择${colorNames[color]}棋盘`;
    
    const availableBoards = this.smallBoards.filter(b => b.color === color);
    const rotations = [180, 270, 90, 0];
    const rotation = rotations[this.currentPosition];
    
    selection.innerHTML = availableBoards.map(board => {
      return ['A', 'B'].map(face => {
        const faceId = face === 'A' ? 0 : 1;
        return `
          <div class="board-option" data-board-id="${board.id}" data-face="${faceId}">
            <div class="board-option-header">棋盘 ${board.id} - 面 ${face}</div>
            <div class="board-preview">
              <canvas id="preview-${board.id}-${faceId}" width="150" height="150"></canvas>
            </div>
            <div class="board-info">
              墙: ${board.faces[faceId].walls?.length || 0} | 
              目标: ${board.faces[faceId].targets?.length || 0} | 
              棱镜: ${board.faces[faceId].prisms?.length || 0}
            </div>
          </div>
        `;
      }).join('');
    }).join('');
    
    modal.classList.add('active');
    
    setTimeout(() => {
      availableBoards.forEach(board => {
        [0, 1].forEach(faceId => {
          this.renderBoardPreview(board, faceId, rotation, `preview-${board.id}-${faceId}`);
        });
      });
      
      document.querySelectorAll('.board-option').forEach(option => {
        option.addEventListener('click', () => {
          document.querySelectorAll('.board-option').forEach(o => o.classList.remove('selected'));
          option.classList.add('selected');
          
          this.selectedBoardData = {
            boardId: parseInt(option.dataset.boardId),
            faceId: parseInt(option.dataset.face),
            color: this.selectedColor
          };
          
          document.getElementById('confirmBoardBtn').disabled = false;
        });
      });
    }, 100);
  }
  
  renderBoardPreview(boardData, faceId, rotation, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const cellSize = 18.75;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFCF6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const face = boardData.faces[faceId];
    
    // 应用旋转变换坐标的辅助函数
    const rotateCoord = (x, y) => {
      return Rotator.rotatePoint(x, y, rotation, 8);
    };
    
    // 旋转墙壁方向
    const rotateSide = (side) => {
      return Rotator.rotateWallSide(side, rotation);
    };
    
    // 旋转棱镜方向
    const rotatePrismDirection = (direction) => {
      return Rotator.rotatePrismDirection(direction, rotation);
    };
    
    // 绘制网格
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, 8 * cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(8 * cellSize, i * cellSize);
      ctx.stroke();
    }
    
    // 绘制墙壁（应用旋转）
    if (face.walls) {
      ctx.strokeStyle = '#42311B';
      ctx.lineWidth = 2;
      face.walls.forEach(wall => {
        const rotated = rotateCoord(wall.x, wall.y);
        wall.sides.forEach(side => {
          const rotatedSide = rotateSide(side);
          let x1, y1, x2, y2;
          switch(rotatedSide) {
            case 'top':
              x1 = rotated.x * cellSize; y1 = rotated.y * cellSize;
              x2 = (rotated.x + 1) * cellSize; y2 = rotated.y * cellSize;
              break;
            case 'right':
              x1 = (rotated.x + 1) * cellSize; y1 = rotated.y * cellSize;
              x2 = (rotated.x + 1) * cellSize; y2 = (rotated.y + 1) * cellSize;
              break;
            case 'bottom':
              x1 = rotated.x * cellSize; y1 = (rotated.y + 1) * cellSize;
              x2 = (rotated.x + 1) * cellSize; y2 = (rotated.y + 1) * cellSize;
              break;
            case 'left':
              x1 = rotated.x * cellSize; y1 = rotated.y * cellSize;
              x2 = rotated.x * cellSize; y2 = (rotated.y + 1) * cellSize;
              break;
          }
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        });
      });
    }
    
    // 绘制棱镜（应用旋转）
    if (face.prisms) {
      const colorCodes = { red: '#DF2822', yellow: '#EFC71E', blue: '#3E577F', green: '#3B991E' };
      face.prisms.forEach(prism => {
        const rotated = rotateCoord(prism.x, prism.y);
        const rotatedDirection = rotatePrismDirection(prism.direction);
        
        const px = rotated.x * cellSize + cellSize / 2;
        const py = rotated.y * cellSize + cellSize / 2;
        const size = cellSize * 0.4;
        
        ctx.strokeStyle = colorCodes[prism.color];
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (rotatedDirection === '\\') {
          ctx.moveTo(px - size, py - size);
          ctx.lineTo(px + size, py + size);
        } else {
          ctx.moveTo(px - size, py + size);
          ctx.lineTo(px + size, py - size);
        }
        ctx.stroke();
      });
    }
    
    // 绘制目标（应用旋转）
    if (face.targets) {
      const colorCodes = { red: '#DF2822', yellow: '#EFC71E', blue: '#3E577F', green: '#3B991E' };
      face.targets.forEach(target => {
        const rotated = rotateCoord(target.x, target.y);
        
        const px = rotated.x * cellSize + cellSize / 2;
        const py = rotated.y * cellSize + cellSize / 2;
        const size = 8;
        
        // 设置颜色
        if (target.color === 'rainbow') {
          const gradient = ctx.createConicGradient(0, px, py);
          gradient.addColorStop(0, colorCodes.red);
          gradient.addColorStop(0.25, colorCodes.yellow);
          gradient.addColorStop(0.5, colorCodes.green);
          gradient.addColorStop(0.75, colorCodes.blue);
          gradient.addColorStop(1, colorCodes.red);
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = colorCodes[target.color];
        }
        
        // 绘制形状
        ctx.beginPath();
        switch (target.shape) {
          case 'circle':
            ctx.arc(px, py, size, 0, Math.PI * 2);
            break;
          case 'triangle':
            ctx.moveTo(px, py - size);
            ctx.lineTo(px + size * 0.866, py + size * 0.5);
            ctx.lineTo(px - size * 0.866, py + size * 0.5);
            ctx.closePath();
            break;
          case 'square':
            ctx.rect(px - size * 0.7, py - size * 0.7, size * 1.4, size * 1.4);
            break;
          case 'hexagon':
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i;
              const x = px + size * Math.cos(angle);
              const y = py + size * Math.sin(angle);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            break;
        }
        ctx.fill();
      });
    }
  }
  
  confirmBoardSelection() {
    if (!this.selectedBoardData) return;
    
    const oldColor = this.config[this.currentPosition]?.color;
    this.config[this.currentPosition] = this.selectedBoardData;
    
    if (oldColor) this.usedColors.delete(oldColor);
    this.usedColors.add(this.selectedBoardData.color);
    
    this.closeModal('boardModal');
    this.renderMainBoard();
    
    if (this.config.every(c => c !== null)) {
      this.startRobotPhase();
    }
  }
  
  startRobotPhase() {
    this.phase = 'robot';
    this.settingRobotColor = 'red';
    
    // 创建Board实例以便显示完整地图
    this.board = new Board(this.config, this.smallBoards.map(data => new SmallBoard(data)));
    this.boardRenderer = null; // 重置renderer，让renderMainBoard重新创建
    
    document.getElementById('currentPhase').textContent = '设置棋子';
    document.getElementById('configPhase').classList.remove('active');
    document.getElementById('robotPhase').classList.add('active');
    
    this.updateRobotList();
    this.renderMainBoard();
  }
  
  updateRobotList() {
    const robotList = document.getElementById('robotList');
    const colors = ['red', 'yellow', 'blue', 'green'];
    const colorNames = { red: '红色', yellow: '黄色', blue: '蓝色', green: '绿色' };
    const colorCodes = { red: '#DF2822', yellow: '#EFC71E', blue: '#3E577F', green: '#3B991E' };
    
    robotList.innerHTML = colors.map(color => {
      const pos = this.robotPositions[color];
      const isActive = this.settingRobotColor === color;
      const isCompleted = pos !== null;
      
      let classes = 'robot-item';
      if (isActive) classes += ' active';
      if (isCompleted) classes += ' completed';
      
      return `
        <div class="${classes}" onclick="app.selectRobotToSet('${color}')">
          <span class="robot-color-badge" style="background: ${colorCodes[color]}"></span>
          <div style="flex: 1;">
            <strong>${colorNames[color]}</strong>
            ${pos ? `<div style="font-size: 11px; color: #6c757d;">(${pos.x}, ${pos.y})</div>` : 
                    isActive ? '<div style="font-size: 11px; color: #667eea;">点击棋盘设置</div>' : ''}
          </div>
          ${isCompleted ? '<span style="color: #28a745;">✓</span>' : ''}
        </div>
      `;
    }).join('');
  }
  
  selectRobotToSet(color) {
    if (this.phase !== 'robot') return;
    this.settingRobotColor = color;
    this.updateRobotList();
  }
  
  startTargetPhase() {
    this.phase = 'target';
    
    // 创建Game实例（Board已在startRobotPhase创建）
    this.game = new Game({
      boardConfig: this.config,
      robotPositions: this.robotPositions
    }, this.smallBoards.map(data => new SmallBoard(data)));
    this.game.start();
    
    // 创建PathFinder，传入board和robots
    this.pathFinder = new PathFinder(this.board, this.game.robots);
    
    document.getElementById('currentPhase').textContent = '选择终点';
    document.getElementById('robotPhase').classList.remove('active');
    document.getElementById('targetPhase').classList.add('active');
    
    this.updateTargetList();
    this.renderMainBoard();
  }
  
  updateTargetList() {
    const targetList = document.getElementById('targetList');
    const targets = this.game.getAvailableTargets();
    
    if (targets.length === 0) {
      targetList.innerHTML = '<div class="loading">没有可用终点</div>';
      return;
    }
    
    const getBoardPosition = (x, y) => {
      if (x < 8 && y < 8) return '左上';
      if (x >= 8 && y < 8) return '右上';
      if (x < 8 && y >= 8) return '左下';
      if (x >= 8 && y >= 8) return '右下';
      return '中央';
    };
    
    const getColorStyle = (color) => {
      const colors = { red: '#DF2822', yellow: '#EFC71E', blue: '#3E577F', green: '#3B991E' };
      if (color === 'rainbow') {
        return 'background: conic-gradient(from 0deg, #DF2822, #EFC71E, #3B991E, #3E577F, #DF2822); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;';
      }
      return `color: ${colors[color] || '#666'};`;
    };
    
    targetList.innerHTML = targets.map(({target, position}) => {
      const boardPos = getBoardPosition(position.x, position.y);
      return `
        <div class="target-item" data-target-id="${target.id}">
          <span class="target-shape" style="${getColorStyle(target.color)}">${target.getEmoji()}</span>
          <div style="flex: 1; font-size: 12px;">${boardPos}</div>
        </div>
      `;
    }).join('');
    
    document.querySelectorAll('.target-item').forEach(item => {
      item.addEventListener('click', () => this.selectTarget(item.dataset.targetId));
    });
  }
  
  selectTarget(targetId) {
    document.querySelectorAll('.target-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.targetId === targetId);
    });
    
    this.selectedTarget = this.game.board.getTargetById(targetId);
    document.getElementById('solveBtn').disabled = false;
  }
  
  async solvePath() {
    if (!this.selectedTarget) return;
    
    document.getElementById('solveBtn').disabled = true;
    document.getElementById('solveBtn').textContent = '🔍 搜索中...';
    
    const eligibleRobots = this.game.robots.filter(r => 
      this.selectedTarget.canAccept(r.color)
    );
    
    if (eligibleRobots.length === 0) {
      alert('没有棋子可以到达此终点');
      document.getElementById('solveBtn').disabled = false;
      document.getElementById('solveBtn').textContent = '🔍 寻找路径';
      return;
    }
    
    let bestSolution = null;
    
    for (const robot of eligibleRobots) {
      // findPath参数: (robotColor, targetPos, debug)
      const result = this.pathFinder.findPath(
        robot.color,
        { x: this.selectedTarget.x, y: this.selectedTarget.y },
        true // 开启调试信息
      );
      
      if (result.success) {
        if (!bestSolution || result.steps < bestSolution.result.steps) {
          bestSolution = { robot, result };
        }
      }
    }
    
    if (bestSolution) {
      this.currentSolution = bestSolution;
      this.showSolution(bestSolution);
    } else {
      alert('未找到路径');
      document.getElementById('solveBtn').disabled = false;
      document.getElementById('solveBtn').textContent = '🔍 寻找路径';
    }
  }
  
  showSolution(solution) {
    this.phase = 'solution';
    
    document.getElementById('currentPhase').textContent = '查看方案';
    document.getElementById('solutionInfo').style.display = 'block';
    document.getElementById('solutionSteps').textContent = solution.result.steps;
    
    document.getElementById('targetPhase').classList.remove('active');
    document.getElementById('solutionPhase').classList.add('active');
    
    this.displaySimpleSolution(solution);
    this.displayDetailedSolution(solution);
    
    // 保存初始位置
    this.animationState.savedPositions = this.game.robots.map(r => ({
      color: r.color,
      x: r.x,
      y: r.y
    }));
  }
  
  displaySimpleSolution(solution) {
    const { result } = solution;
    const directionArrows = {
      up: '↑',
      down: '↓',
      left: '←',
      right: '→'
    };
    
    const html = result.path.map(move => {
      return `<div class="arrow-step ${move.robotColor}">${directionArrows[move.direction]}</div>`;
    }).join('');
    
    document.getElementById('simpleSolution').innerHTML = html;
  }
  
  displayDetailedSolution(solution) {
    const { robot, result } = solution;
    const path = result.path;
    
    const html = path.map((move, index) => {
      return `
        <div class="step-item">
          <strong>步骤 ${index + 1}:</strong> 
          ${move.robotColor} 向${
            move.direction === 'up' ? '上' :
            move.direction === 'down' ? '下' :
            move.direction === 'left' ? '左' : '右'
          } 
          (${move.from.x},${move.from.y}) → (${move.to.x},${move.to.y})
        </div>
      `;
    }).join('');
    
    document.getElementById('detailedSolution').innerHTML = html;
  }
  
  playAnimation() {
    if (!this.currentSolution) return;
    
    this.animationState.playing = true;
    this.animationState.currentStep = 0;
    
    document.getElementById('playBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('replayBtn').disabled = false;
    
    this.animateNextStep();
  }
  
  animateNextStep() {
    if (!this.animationState.playing) return;
    
    const path = this.currentSolution.result.path;
    if (this.animationState.currentStep >= path.length) {
      this.onAnimationComplete();
      return;
    }
    
    const move = path[this.animationState.currentStep];
    const robot = this.game.robots.find(r => r.color === move.robotColor);
    
    if (robot) {
      robot.x = move.to.x;
      robot.y = move.to.y;
      this.renderMainBoard();
    }
    
    this.animationState.currentStep++;
    
    setTimeout(() => {
      this.animateNextStep();
    }, 500);
  }
  
  pauseAnimation() {
    this.animationState.playing = false;
    document.getElementById('playBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
  }
  
  replayAnimation() {
    // 恢复初始位置
    if (this.animationState.savedPositions) {
      this.animationState.savedPositions.forEach(saved => {
        const robot = this.game.robots.find(r => r.color === saved.color);
        if (robot) {
          robot.x = saved.x;
          robot.y = saved.y;
        }
      });
      this.renderMainBoard();
    }
    
    this.playAnimation();
  }
  
  onAnimationComplete() {
    this.animationState.playing = false;
    document.getElementById('playBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
  }
  
  renderMainBoard() {
    const canvas = document.getElementById('mainBoard');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (this.config.every(c => c !== null) && this.board) {
      // 使用BoardRenderer渲染完整棋盘
      if (!this.boardRenderer) {
        this.boardRenderer = new BoardRenderer(canvas, this.board);
      }
      
      // 优先使用game.robots（动画阶段），否则使用robotPositions（设置阶段）
      let robots = [];
      if (this.game && this.game.robots) {
        robots = this.game.robots.map(r => ({ color: r.color, x: r.x, y: r.y }));
      } else {
        Object.entries(this.robotPositions).forEach(([color, pos]) => {
          if (pos) {
            robots.push({ color, x: pos.x, y: pos.y });
          }
        });
      }
      
      this.boardRenderer.render(robots, { showCoordinates: false });
    } else {
      // 绘制配置界面
      this.renderConfigBoard(ctx);
    }
  }
  
  renderConfigBoard(ctx) {
    const cellSize = this.cellSize;
    
    ctx.fillStyle = '#FFFCF6';
    ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);
    
    // 网格
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 16; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, 16 * cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(16 * cellSize, i * cellSize);
      ctx.stroke();
    }
    
    // 分隔线
    ctx.strokeStyle = '#42311B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8 * cellSize, 0);
    ctx.lineTo(8 * cellSize, 16 * cellSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 8 * cellSize);
    ctx.lineTo(16 * cellSize, 8 * cellSize);
    ctx.stroke();
    
    // 中央禁区
    ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.fillRect(7 * cellSize, 7 * cellSize, 2 * cellSize, 2 * cellSize);
    
    // 已配置区域
    const positions = [
      { x: 0, y: 0, w: 8, h: 8 },
      { x: 8, y: 0, w: 8, h: 8 },
      { x: 0, y: 8, w: 8, h: 8 },
      { x: 8, y: 8, w: 8, h: 8 }
    ];
    
    const colorCodes = { red: '#DF2822', yellow: '#EFC71E', blue: '#3E577F', green: '#3B991E' };
    
    positions.forEach((pos, index) => {
      if (this.config[index]) {
        ctx.fillStyle = colorCodes[this.config[index].color] + '40';
        ctx.fillRect(pos.x * cellSize, pos.y * cellSize, pos.w * cellSize, pos.h * cellSize);
        
        ctx.fillStyle = colorCodes[this.config[index].color];
        ctx.font = `bold ${Math.max(12, cellSize / 3)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerX = (pos.x + pos.w / 2) * cellSize;
        const centerY = (pos.y + pos.h / 2) * cellSize;
        ctx.fillText(`棋盘 ${this.config[index].boardId}`, centerX, centerY - cellSize / 4);
        ctx.fillText(`面 ${this.config[index].faceId === 0 ? 'A' : 'B'}`, centerX, centerY + cellSize / 4);
      } else {
        ctx.fillStyle = '#999';
        ctx.font = `${Math.max(12, cellSize / 3)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerX = (pos.x + pos.w / 2) * cellSize;
        const centerY = (pos.y + pos.h / 2) * cellSize;
        ctx.fillText('点击选择', centerX, centerY);
      }
    });
  }
  
  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }
  
  reset() {
    this.config = [null, null, null, null];
    this.robotPositions = { red: null, yellow: null, blue: null, green: null };
    this.usedColors.clear();
    this.phase = 'config';
    this.currentPosition = null;
    this.selectedColor = null;
    this.selectedBoardData = null;
    this.settingRobotColor = null;
    this.selectedTarget = null;
    this.board = null;
    this.boardRenderer = null;
    this.game = null;
    this.pathFinder = null;
    this.currentSolution = null;
    this.animationState = {
      playing: false,
      currentStep: 0,
      savedPositions: null
    };
    
    document.getElementById('currentPhase').textContent = '配置棋盘';
    document.getElementById('solutionInfo').style.display = 'none';
    
    document.querySelectorAll('.panel-section').forEach(section => {
      section.classList.remove('active');
    });
    document.getElementById('configPhase').classList.add('active');
    
    this.renderMainBoard();
  }
}

// 全局实例
window.app = null;

document.addEventListener('DOMContentLoaded', () => {
  window.app = new QuickSolveApp();
});

