/**
 * 交互式游戏配置器
 * 点击四个区域选择小棋盘，然后在主棋盘上设置棋子位置
 */

import { Encoder } from './src/utils/Encoder.js';
import { SmallBoard } from './src/core/SmallBoard.js';
import { BoardRenderer } from './src/ui/BoardRenderer.js';
import { Board } from './src/core/Board.js';

class InteractiveGameConfigurator {
  constructor() {
    this.smallBoards = [];
    this.config = [null, null, null, null]; // topLeft, topRight, bottomLeft, bottomRight
    this.robotPositions = { red: null, yellow: null, blue: null, green: null };
    this.usedColors = new Set();
    
    this.currentStep = 0; // 0-3: 选择棋盘, 4-7: 设置棋子
    this.currentPosition = null; // 当前正在配置的位置
    this.selectedColor = null;
    this.selectedBoardData = null;
    this.settingRobotColor = null; // 当前正在设置的棋子颜色
    
    this.board = null; // Board实例
    this.boardRenderer = null;
    
    this.init();
  }
  
  async init() {
    
    // 加载所有小棋盘
    await this.loadSmallBoards();
    
    // 计算并设置canvas大小
    this.calculateCanvasSize();
    
    // 初始化UI
    this.initUI();
    
    // 绘制初始棋盘
    this.renderMainBoard();
    
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      this.calculateCanvasSize();
      this.renderMainBoard();
    });
    
  }
  
  calculateCanvasSize() {
    const canvas = document.getElementById('mainBoard');
    if (!canvas) return;
    
    const boardWrapper = canvas.parentElement;
    if (!boardWrapper) return;
    
    // 获取board-wrapper的可用空间
    const wrapperRect = boardWrapper.getBoundingClientRect();
    
    // 减去padding (20px * 2 = 40px)
    const availableWidth = wrapperRect.width - 40;
    const availableHeight = wrapperRect.height - 40;
    
    let maxSize;
    
    // 移动端特殊处理
    if (window.innerWidth <= 768) {
      // 移动端：考虑整个视口，留出足够空间给其他元素
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 减去标题、说明、进度条等的高度（约150px）和padding
      const maxHeight = viewportHeight * 0.5;
      const maxWidth = viewportWidth - 40; // 左右各20px padding
      
      maxSize = Math.min(maxWidth, maxHeight);
    } else {
      // PC端：使用wrapper的可用空间
      maxSize = Math.min(availableWidth, availableHeight);
    }
    
    // 确保至少有最小尺寸
    maxSize = Math.max(maxSize, 200);
    
    // 计算cellSize，确保是整数
    this.cellSize = Math.floor(maxSize / 16);
    this.canvasSize = this.cellSize * 16;
    
    // 设置canvas的实际渲染尺寸
    canvas.width = this.canvasSize;
    canvas.height = this.canvasSize;
    
    // 设置canvas的显示尺寸（CSS）
    canvas.style.width = this.canvasSize + 'px';
    canvas.style.height = this.canvasSize + 'px';
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '100%';
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
  
  initUI() {
    // 主棋盘点击事件（支持触摸）
    const mainCanvas = document.getElementById('mainBoard');
    mainCanvas.addEventListener('click', (e) => this.handleMainBoardClick(e));
    mainCanvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const mouseEvent = new MouseEvent('click', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true
        });
        mainCanvas.dispatchEvent(mouseEvent);
      }
    });
    
    // 模态框关闭按钮
    document.getElementById('closeColorModal').addEventListener('click', () => {
      this.closeModal('colorModal');
    });
    
    document.getElementById('closeBoardModal').addEventListener('click', () => {
      this.closeModal('boardModal');
    });
    
    // 确认按钮
    document.getElementById('confirmBoardBtn').addEventListener('click', () => {
      this.confirmBoardSelection();
    });
    
    // 结果面板按钮
    document.getElementById('playGameBtn').addEventListener('click', () => {
      const code = document.getElementById('gameCode').textContent;
      window.location.href = `./index.html?code=${code}`;
    });
    
    document.getElementById('copyCodeBtn').addEventListener('click', () => {
      const code = document.getElementById('gameCode').textContent;
      navigator.clipboard.writeText(code);
      alert('游戏编码已复制到剪贴板！');
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
      this.reset();
    });
  }
  
  handleMainBoardClick(e) {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    
    // 获取点击位置相对于canvas的坐标
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // 由于我们设置了canvas.style.width/height = canvas.width/height
    // 并且有maxWidth/maxHeight: 100%，所以需要考虑实际显示大小
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // 计算实际的缩放比例
    const scaleX = this.canvasSize / displayWidth;
    const scaleY = this.canvasSize / displayHeight;
    
    // 转换为canvas内部坐标
    const canvasX = clickX * scaleX;
    const canvasY = clickY * scaleY;
    
    // 转换为格子坐标
    const x = Math.floor(canvasX / this.cellSize);
    const y = Math.floor(canvasY / this.cellSize);
    
    // 如果正在设置棋子
    if (this.settingRobotColor) {
      this.setRobotPosition(x, y);
      return;
    }
    
    // 判断点击的是哪个区域
    let position = null;
    if (x < 8 && y < 8) position = 0; // topLeft
    else if (x >= 8 && y < 8) position = 1; // topRight
    else if (x < 8 && y >= 8) position = 2; // bottomLeft
    else if (x >= 8 && y >= 8) position = 3; // bottomRight
    
    if (position === null) return;
    
    // 如果还在选择棋盘阶段
    if (this.currentStep < 4) {
      this.currentPosition = position;
      this.showColorSelection();
    }
  }
  
  setRobotPosition(x, y) {
    // 检查是否在有效范围内
    if (x < 0 || x >= 16 || y < 0 || y >= 16) return;
    
    // 检查是否在中央禁区
    if ((x === 7 || x === 8) && (y === 7 || y === 8)) {
      alert('中央区域不可放置棋子！');
      return;
    }
    
    // 检查是否与其他棋子重叠
    for (const [color, pos] of Object.entries(this.robotPositions)) {
      if (pos && pos.x === x && pos.y === y && color !== this.settingRobotColor) {
        alert('该位置已有其他棋子！');
        return;
      }
    }
    
    // 设置位置
    this.robotPositions[this.settingRobotColor] = { x, y };
    
    // 更新UI
    this.updateRobotList();
    this.renderMainBoard();
    
    // 检查是否完成所有棋子设置
    if (Object.values(this.robotPositions).every(pos => pos !== null)) {
      this.generateGameCode();
    }
  }
  
  showColorSelection() {
    const modal = document.getElementById('colorModal');
    const selection = document.getElementById('colorSelection');
    
    const colors = ['red', 'yellow', 'blue', 'green'];
    const colorNames = {
      red: '红色',
      yellow: '黄色',
      blue: '蓝色',
      green: '绿色'
    };
    
    selection.innerHTML = colors.map(color => {
      const isUsed = this.usedColors.has(color);
      const isCurrentlyUsed = this.config[this.currentPosition]?.color === color;
      const disabled = isUsed && !isCurrentlyUsed;
      
      return `
        <div class="color-option ${color} ${disabled ? 'disabled' : ''}" 
             data-color="${color}"
             onclick="configurator.selectColor('${color}', ${disabled})">
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
    
    const colorNames = {
      red: '红色',
      yellow: '黄色',
      blue: '蓝色',
      green: '绿色'
    };
    
    title.textContent = `选择${colorNames[color]}棋盘`;
    
    // 筛选该颜色的棋盘
    const availableBoards = this.smallBoards.filter(b => b.color === color);
        
    // 获取旋转角度
    const rotations = [180, 270, 90, 0]; // topLeft, topRight, bottomLeft, bottomRight
    const rotation = rotations[this.currentPosition];
    
    selection.innerHTML = availableBoards.map((board, index) => {
      return ['A', 'B'].map(face => {
        const faceId = face === 'A' ? 0 : 1;
        return `
          <div class="board-option" data-board-id="${board.id}" data-face="${faceId}">
            <div class="board-option-header">
              棋盘 ${board.id} - 面 ${face}
            </div>
            <div class="board-preview">
              <canvas id="preview-${board.id}-${faceId}" width="200" height="200"></canvas>
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
    
    // 渲染预览（延迟以确保canvas已创建）
    setTimeout(() => {
      availableBoards.forEach(board => {
        [0, 1].forEach(faceId => {
          this.renderBoardPreview(board, faceId, rotation, `preview-${board.id}-${faceId}`);
        });
      });
      
      // 绑定点击事件
      document.querySelectorAll('.board-option').forEach(option => {
        option.addEventListener('click', () => {
          document.querySelectorAll('.board-option').forEach(o => o.classList.remove('selected'));
          option.classList.add('selected');
          
          const boardId = parseInt(option.dataset.boardId);
          const faceId = parseInt(option.dataset.face);
          
          this.selectedBoardData = {
            boardId,
            faceId,
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
    const cellSize = 25;
    
    // 清空
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景
    ctx.fillStyle = '#FFFCF6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 网格
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
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
    
    const face = boardData.faces[faceId];
    
    // 绘制墙壁（应用旋转）
    if (face.walls) {
      ctx.strokeStyle = '#42311B';
      ctx.lineWidth = 3;
      
      face.walls.forEach(wall => {
        const rotated = this.rotateWall(wall, rotation);
        rotated.sides.forEach(side => {
          const coords = this.getWallCoordinates(rotated.x, rotated.y, side, cellSize);
          ctx.beginPath();
          ctx.moveTo(coords.x1, coords.y1);
          ctx.lineTo(coords.x2, coords.y2);
          ctx.stroke();
        });
      });
    }
    
    // 绘制目标
    if (face.targets) {
      const colors = {
        red: '#DF2822',
        yellow: '#EFC71E',
        blue: '#3E577F',
        green: '#3B991E'
      };
      
      face.targets.forEach(target => {
        const rotated = this.rotatePoint(target.x, target.y, rotation);
        const x = rotated.x * cellSize + cellSize / 2;
        const y = rotated.y * cellSize + cellSize / 2;
        const radius = cellSize / 5;
        
        ctx.save();
        
        if (target.color === 'rainbow') {
          const gradient = ctx.createConicGradient(0, x, y);
          gradient.addColorStop(0, colors.red);
          gradient.addColorStop(0.25, colors.yellow);
          gradient.addColorStop(0.5, colors.green);
          gradient.addColorStop(0.75, colors.blue);
          gradient.addColorStop(1, colors.red);
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = colors[target.color];
        }
        
        ctx.beginPath();
        switch(target.shape) {
          case 'circle':
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            break;
          case 'square':
            ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
            break;
          case 'triangle':
            ctx.moveTo(x, y - radius);
            ctx.lineTo(x + radius, y + radius);
            ctx.lineTo(x - radius, y + radius);
            ctx.closePath();
            break;
          case 'hexagon':
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i - Math.PI / 2;
              const px = x + radius * Math.cos(angle);
              const py = y + radius * Math.sin(angle);
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            break;
        }
        ctx.fill();
        ctx.restore();
      });
    }
    
    // 绘制棱镜
    if (face.prisms) {
      const colors = {
        red: '#DF2822',
        yellow: '#EFC71E',
        blue: '#3E577F',
        green: '#3B991E'
      };
      
      face.prisms.forEach(prism => {
        const rotated = this.rotatePoint(prism.x, prism.y, rotation);
        const x = rotated.x * cellSize;
        const y = rotated.y * cellSize;
        
        ctx.strokeStyle = colors[prism.color];
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        // 旋转方向
        let direction = prism.direction;
        if (rotation === 90 || rotation === 270) {
          direction = direction === '\\' ? '/' : '\\';
        }
        
        ctx.beginPath();
        if (direction === '\\') {
          ctx.moveTo(x, y);
          ctx.lineTo(x + cellSize, y + cellSize);
        } else {
          ctx.moveTo(x + cellSize, y);
          ctx.lineTo(x, y + cellSize);
        }
        ctx.stroke();
      });
    }
  }
  
  rotatePoint(x, y, angle) {
    const size = 8;
    switch(angle) {
      case 90:
        return { x: size - 1 - y, y: x };
      case 180:
        return { x: size - 1 - x, y: size - 1 - y };
      case 270:
        return { x: y, y: size - 1 - x };
      default:
        return { x, y };
    }
  }
  
  rotateWall(wall, angle) {
    const rotated = this.rotatePoint(wall.x, wall.y, angle);
    let newSides = [...wall.sides];
    
    // 旋转墙壁方向
    const rotations = angle / 90;
    for (let i = 0; i < rotations; i++) {
      newSides = newSides.map(side => {
        switch(side) {
          case 'top': return 'right';
          case 'right': return 'bottom';
          case 'bottom': return 'left';
          case 'left': return 'top';
          default: return side;
        }
      });
    }
    
    return { x: rotated.x, y: rotated.y, sides: newSides };
  }
  
  getWallCoordinates(x, y, side, cellSize) {
    switch(side) {
      case 'top':
        return { x1: x * cellSize, y1: y * cellSize, x2: (x + 1) * cellSize, y2: y * cellSize };
      case 'right':
        return { x1: (x + 1) * cellSize, y1: y * cellSize, x2: (x + 1) * cellSize, y2: (y + 1) * cellSize };
      case 'bottom':
        return { x1: x * cellSize, y1: (y + 1) * cellSize, x2: (x + 1) * cellSize, y2: (y + 1) * cellSize };
      case 'left':
        return { x1: x * cellSize, y1: y * cellSize, x2: x * cellSize, y2: (y + 1) * cellSize };
    }
  }
  
  confirmBoardSelection() {
    if (!this.selectedBoardData) return;
    
    // 保存配置
    const oldColor = this.config[this.currentPosition]?.color;
    this.config[this.currentPosition] = this.selectedBoardData;
    
    // 更新已使用颜色
    if (oldColor) this.usedColors.delete(oldColor);
    this.usedColors.add(this.selectedBoardData.color);
    
    // 更新进度
    this.currentStep++;
    this.updateProgress();
    
    // 关闭模态框
    this.closeModal('boardModal');
    
    // 重新渲染主棋盘
    this.renderMainBoard();
    
    // 检查是否完成所有棋盘选择
    if (this.config.every(c => c !== null)) {
      // 开始设置棋子位置
      setTimeout(() => {
        this.startRobotPositioning();
      }, 500);
    }
  }
  
  startRobotPositioning() {
    // 更新说明文字
    document.getElementById('instruction').innerHTML = 
      '<strong>设置棋子：</strong> 点击棋盘格子设置棋子起始位置';
    
    // 显示棋子面板
    document.getElementById('robotPanel').classList.add('active');
    
    // 渲染棋子列表
    this.updateRobotList();
    
    // 开始设置第一个棋子
    this.settingRobotColor = 'red';
    this.updateRobotList();
  }
  
  updateRobotList() {
    const robotList = document.getElementById('robotList');
    const colors = ['red', 'yellow', 'blue', 'green'];
    const colorNames = {
      red: '红色',
      yellow: '黄色',
      blue: '蓝色',
      green: '绿色'
    };
    const colorCodes = {
      red: '#DF2822',
      yellow: '#EFC71E',
      blue: '#3E577F',
      green: '#3B991E'
    };
    
    robotList.innerHTML = colors.map(color => {
      const pos = this.robotPositions[color];
      const isActive = this.settingRobotColor === color;
      const isCompleted = pos !== null;
      const isDisabled = !isActive && !isCompleted && this.settingRobotColor !== null;
      
      let classes = 'robot-item';
      if (isActive) classes += ' active';
      if (isCompleted) classes += ' completed';
      if (isDisabled) classes += ' disabled';
      
      return `
        <div class="${classes}" onclick="configurator.selectRobotToSet('${color}')">
          <span class="robot-color-badge" style="background: ${colorCodes[color]}"></span>
          <div style="flex: 1;">
            <strong>${colorNames[color]}</strong>
            ${pos ? `<div style="font-size: 12px; color: #6c757d;">(${pos.x}, ${pos.y})</div>` : 
                    isActive ? '<div style="font-size: 12px; color: #667eea;">点击棋盘设置</div>' : ''}
          </div>
          ${isCompleted ? '<span style="color: #28a745;">✓</span>' : ''}
        </div>
      `;
    }).join('');
  }
  
  selectRobotToSet(color) {
    if (this.settingRobotColor === null) return; // 还没开始设置棋子
    this.settingRobotColor = color;
    this.updateRobotList();
  }
  
  generateGameCode() {
    try {
      // 生成编码
      const boardCode = Encoder.encodeBoardConfig(this.config);
      const gameCode = Encoder.encodeGame(boardCode, this.robotPositions);
            
      // 显示结果
      document.getElementById('gameCode').textContent = gameCode;
      document.getElementById('resultPanel').style.display = 'block';
      
      // 隐藏棋子列表
      document.getElementById('robotList').style.display = 'none';
      
      // 更新说明
      document.getElementById('instruction').innerHTML = 
        '<strong>✅ 配置完成！</strong> 可以开始游戏了';
      
      // 更新进度（全部完成）
      document.querySelectorAll('.progress-step').forEach(step => {
        step.classList.add('completed');
        step.classList.remove('active');
      });
      
    } catch (error) {
      console.error('[Configurator] 生成编码失败:', error);
      alert('生成游戏编码失败: ' + error.message);
    }
  }
  
  renderMainBoard() {
    const canvas = document.getElementById('mainBoard');
    const ctx = canvas.getContext('2d');
    const cellSize = this.cellSize;
    
    // 清空
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 如果已配置完所有棋盘，使用BoardRenderer渲染
    if (this.config.every(c => c !== null)) {
      try {
        // 创建Board实例
        this.board = new Board(this.config, this.smallBoards.map(data => new SmallBoard(data)));
        
        // 创建渲染器
        this.boardRenderer = new BoardRenderer(canvas, this.board);
        
        // 创建临时棋子数组用于渲染
        const robots = [];
        Object.entries(this.robotPositions).forEach(([color, pos]) => {
          if (pos) {
            robots.push({ color, x: pos.x, y: pos.y });
          }
        });
        
        // 渲染
        this.boardRenderer.render(robots, { showCoordinates: false });
        
        return;
      } catch (error) {
        console.error('[Configurator] 渲染完整棋盘失败:', error);
      }
    }
    
    // 否则绘制简单的选择界面
    // 背景
    ctx.fillStyle = '#FFFCF6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格
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
    
    // 绘制四个区域的分隔线
    ctx.strokeStyle = '#42311B';
    ctx.lineWidth = 3;
    
    // 垂直中线
    ctx.beginPath();
    ctx.moveTo(8 * cellSize, 0);
    ctx.lineTo(8 * cellSize, 16 * cellSize);
    ctx.stroke();
    
    // 水平中线
    ctx.beginPath();
    ctx.moveTo(0, 8 * cellSize);
    ctx.lineTo(16 * cellSize, 8 * cellSize);
    ctx.stroke();
    
    // 绘制中央禁区
    ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.fillRect(7 * cellSize, 7 * cellSize, 2 * cellSize, 2 * cellSize);
    
    // 绘制对角线
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(7 * cellSize, 7 * cellSize);
    ctx.lineTo(9 * cellSize, 9 * cellSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(9 * cellSize, 7 * cellSize);
    ctx.lineTo(7 * cellSize, 9 * cellSize);
    ctx.stroke();
    
    // 绘制已配置的区域
    const positions = [
      { x: 0, y: 0, w: 8, h: 8 },     // topLeft
      { x: 8, y: 0, w: 8, h: 8 },     // topRight
      { x: 0, y: 8, w: 8, h: 8 },     // bottomLeft
      { x: 8, y: 8, w: 8, h: 8 }      // bottomRight
    ];
    
    const colorCodes = {
      red: '#DF2822',
      yellow: '#EFC71E',
      blue: '#3E577F',
      green: '#3B991E'
    };
    
    positions.forEach((pos, index) => {
      if (this.config[index]) {
        // 绘制颜色标记
        ctx.fillStyle = colorCodes[this.config[index].color] + '40'; // 25% opacity
        ctx.fillRect(pos.x * cellSize, pos.y * cellSize, pos.w * cellSize, pos.h * cellSize);
        
        // 绘制文字
        ctx.fillStyle = colorCodes[this.config[index].color];
        ctx.font = `bold ${Math.max(12, cellSize / 3)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerX = (pos.x + pos.w / 2) * cellSize;
        const centerY = (pos.y + pos.h / 2) * cellSize;
        ctx.fillText(`棋盘 ${this.config[index].boardId}`, centerX, centerY - cellSize / 4);
        ctx.fillText(`面 ${this.config[index].faceId === 0 ? 'A' : 'B'}`, centerX, centerY + cellSize / 4);
      } else {
        // 绘制提示
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
  
  updateProgress() {
    const steps = document.querySelectorAll('.progress-step');
    
    steps.forEach((step, index) => {
      step.classList.remove('active', 'completed');
      
      if (index < this.currentStep) {
        step.classList.add('completed');
      } else if (index === this.currentStep) {
        step.classList.add('active');
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
    this.currentStep = 0;
    this.currentPosition = null;
    this.selectedColor = null;
    this.selectedBoardData = null;
    this.settingRobotColor = null;
    this.board = null;
    this.boardRenderer = null;
    
    document.getElementById('resultPanel').style.display = 'none';
    document.getElementById('robotPanel').classList.remove('active');
    document.getElementById('robotList').style.display = 'block';
    document.getElementById('instruction').innerHTML = 
      '<strong>配置步骤：</strong> 点击四个区域，依次选择小棋盘';
    
    this.updateProgress();
    this.renderMainBoard();
  }
}

// 全局实例
window.configurator = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  window.configurator = new InteractiveGameConfigurator();
});
