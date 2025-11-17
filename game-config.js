/**
 * 游戏配置器
 * 可视化配置棋盘和棋子位置
 */

import { Encoder } from './src/utils/Encoder.js';

class GameConfigurator {
  constructor() {
    this.smallBoards = []; // 可用的小棋盘
    this.boardConfig = {
      topLeft: null,
      topRight: null,
      bottomLeft: null,
      bottomRight: null
    };
    this.robotPositions = {
      red: { x: 8, y: 15 },
      yellow: { x: 15, y: 8 },
      blue: { x: 7, y: 0 },
      green: { x: 0, y: 7 }
    };

    this.init();
  }

  async init() {    
    await this.loadSmallBoards();
    this.renderBoardLibrary();
    this.renderRobotConfig();
    this.bindEvents();
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

    try {
      const promises = boardFiles.map(file => fetch(file).then(r => r.json()));
      this.smallBoards = await Promise.all(promises);
    } catch (error) {
      this.showMessage('加载棋盘数据失败: ' + error.message, 'error');
    }
  }

  renderBoardLibrary() {
    const container = document.getElementById('boardLibrary');
    
    const html = this.smallBoards.map((board, index) => {
      const colorNames = {
        red: '红色',
        yellow: '黄色',
        blue: '蓝色',
        green: '绿色'
      };

      return `
        <div class="small-board-item" 
             draggable="true" 
             data-board-id="${board.id}"
             data-board-index="${index}">
          <div class="board-header">
            <div class="board-color-badge ${board.color}"></div>
            <strong>棋盘 ${board.id} - ${colorNames[board.color]}</strong>
          </div>
          <div style="font-size: 12px; color: #6c757d; margin-bottom: 8px;">
            墙壁: ${board.faces[0]?.walls?.length || 0} / ${board.faces[1]?.walls?.length || 0}<br>
            分光镜: ${board.faces[0]?.prisms?.length || 0} / ${board.faces[1]?.prisms?.length || 0}<br>
            终点: ${board.faces[0]?.targets?.length || 0} / ${board.faces[1]?.targets?.length || 0}
          </div>
          
          <div class="face-selector">
            <button class="face-btn active" data-face="0">正面 A</button>
            <button class="face-btn" data-face="1">背面 B</button>
          </div>
          
          <div class="board-preview-container">
            <canvas class="board-preview-canvas" width="160" height="160" data-board-id="${board.id}"></canvas>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    
    // 初始渲染所有预览（正面A）
    this.smallBoards.forEach((board, index) => {
      const canvas = container.querySelector(`.board-preview-canvas[data-board-id="${board.id}"]`);
      this.renderSmallPreview(canvas, board, 0, 0);
    });
    
    // 绑定面选择
    container.querySelectorAll('.face-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = btn.closest('.small-board-item');
        const boardId = parseInt(item.dataset.boardId);
        const board = this.smallBoards.find(b => b.id === boardId);
        
        item.querySelectorAll('.face-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 更新预览
        const faceId = parseInt(btn.dataset.face);
        const canvas = item.querySelector('.board-preview-canvas');
        this.renderSmallPreview(canvas, board, faceId, 0);
      });
    });

    // 绑定拖拽
    container.querySelectorAll('.small-board-item').forEach(item => {
      item.addEventListener('dragstart', (e) => this.handleDragStart(e));
      item.addEventListener('dragend', (e) => this.handleDragEnd(e));
    });
  }

  renderRobotConfig() {
    const container = document.getElementById('robotConfig');
    const colors = ['red', 'yellow', 'blue', 'green'];
    const colorNames = {
      red: '红色',
      yellow: '黄色',
      blue: '蓝色',
      green: '绿色'
    };
    
    // 检查是否已配置完所有4个小棋盘
    const positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    const allConfigured = positions.every(pos => this.boardConfig[pos] !== null);

    const html = colors.map(color => {
      const pos = this.robotPositions[color];
      const disabled = !allConfigured;
      
      return `
        <div class="robot-item ${disabled ? 'disabled' : ''}">
          <div class="robot-header">
            <div class="robot-icon ${color}">${color[0].toUpperCase()}</div>
            <strong>${colorNames[color]}棋子</strong>
          </div>
          ${!allConfigured ? `
            <div class="config-warning">
              ⚠️ 请先配置所有4个小棋盘
            </div>
          ` : ''}
          <div class="position-inputs">
            <div class="input-group">
              <label>X 坐标</label>
              <input type="number" 
                     min="0" 
                     max="15" 
                     value="${pos.x}"
                     data-robot="${color}"
                     data-coord="x"
                     ${disabled ? 'disabled' : ''}>
            </div>
            <div class="input-group">
              <label>Y 坐标</label>
              <input type="number" 
                     min="0" 
                     max="15" 
                     value="${pos.y}"
                     data-robot="${color}"
                     data-coord="y"
                     ${disabled ? 'disabled' : ''}>
            </div>
          </div>
          <div style="margin-top: 10px;">
            <button class="btn btn-secondary" 
                    style="width: 100%; padding: 8px; font-size: 13px;" 
                    data-robot="${color}" 
                    onclick="window.configurator.selectRobotPosition('${color}')"
                    ${disabled ? 'disabled' : ''}>
              📍 点击棋盘选择位置
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;

    // 绑定输入事件（只在启用时）
    if (allConfigured) {
      container.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', (e) => {
          const robot = e.target.dataset.robot;
          const coord = e.target.dataset.coord;
          const value = parseInt(e.target.value);
          
          if (value >= 0 && value <= 15) {
            this.robotPositions[robot][coord] = value;
          } else {
            e.target.value = this.robotPositions[robot][coord];
          }
        });
      });
    }
  }
  
  selectRobotPosition(color) {    
    // 检查是否已配置完所有小棋盘
    const positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    const allConfigured = positions.every(pos => this.boardConfig[pos] !== null);
    
    if (!allConfigured) {
      this.showMessage('请先配置所有4个小棋盘！', 'warning');
      return;
    }
    
    // 创建模态框with 16x16棋盘
    const modal = document.createElement('div');
    modal.className = 'preview-modal';
    modal.innerHTML = `
      <div class="preview-content" style="max-width: 700px;">
        <div class="preview-header">
          <h3>选择 ${color} 棋子的起始位置</h3>
          <button class="close-btn">×</button>
        </div>
        <div class="preview-body">
          <canvas id="positionCanvas" width="640" height="640" style="cursor: crosshair;"></canvas>
          <div style="margin-top: 15px; text-align: center; color: #6c757d;">
            点击格子选择位置 | 当前: (${this.robotPositions[color].x}, ${this.robotPositions[color].y})
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const canvas = modal.querySelector('#positionCanvas');
    const ctx = canvas.getContext('2d');
    const cellSize = 40;
    const size = 16;
    
    // 绘制16x16棋盘（包含已配置的小棋盘）
    const drawBoard = (highlightX = null, highlightY = null) => {
      // 背景
      ctx.fillStyle = '#FFFCF6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 绘制已配置的4个小棋盘
      this.renderConfiguredBoards(ctx, cellSize);
      
      // 网格（在棋盘上层）
      ctx.strokeStyle = '#d4b89a';
      ctx.lineWidth = 1;
      for (let i = 0; i <= size; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, size * cellSize);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(size * cellSize, i * cellSize);
        ctx.stroke();
      }
      
      // 中央禁区高亮
      ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
      ctx.fillRect(7 * cellSize, 7 * cellSize, 2 * cellSize, 2 * cellSize);
      
      // 已有的棋子位置
      const colors = ['red', 'yellow', 'blue', 'green'];
      const colorMap = {
        red: '#DF2822',
        yellow: '#EFC71E',
        blue: '#3E577F',
        green: '#3B991E'
      };
      
      colors.forEach(c => {
        const pos = this.robotPositions[c];
        const x = pos.x * cellSize + cellSize / 2;
        const y = pos.y * cellSize + cellSize / 2;
        
        ctx.fillStyle = colorMap[c];
        ctx.globalAlpha = c === color ? 0.3 : 0.8;
        ctx.beginPath();
        ctx.arc(x, y, cellSize / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // 添加字母标识
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c[0].toUpperCase(), x, y);
      });
      
      // 高亮当前悬停位置
      if (highlightX !== null && highlightY !== null) {
        ctx.fillStyle = 'rgba(102, 126, 234, 0.3)';
        ctx.fillRect(highlightX * cellSize, highlightY * cellSize, cellSize, cellSize);
        
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.strokeRect(highlightX * cellSize, highlightY * cellSize, cellSize, cellSize);
      }
    };
    
    drawBoard();
    
    // 鼠标移动高亮
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / cellSize);
      const y = Math.floor((e.clientY - rect.top) / cellSize);
      
      if (x >= 0 && x < size && y >= 0 && y < size) {
        drawBoard(x, y);
      }
    });
    
    // 点击选择位置
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / cellSize);
      const y = Math.floor((e.clientY - rect.top) / cellSize);
      
      // 检查范围和禁区
      if (x < 0 || x >= size || y < 0 || y >= size) return;
      if ((x === 7 || x === 8) && (y === 7 || y === 8)) {
        this.showMessage('不能放置在中央2x2禁区！', 'error');
        return;
      }
      
      // 更新位置
      this.robotPositions[color] = { x, y };
      
      // 重新渲染配置
      this.renderRobotConfig();
      
      // 关闭模态框
      modal.remove();
      
      this.showMessage(`${color}棋子位置已设置为 (${x}, ${y})`, 'success');
    });
    
    // 绑定关闭
    modal.querySelector('.close-btn').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
  
  renderConfiguredBoards(ctx, cellSize) {
    const positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    const offsets = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 8, y: 0 },
      bottomLeft: { x: 0, y: 8 },
      bottomRight: { x: 8, y: 8 }
    };
    const rotations = {
      topLeft: 180,
      topRight: 270,
      bottomLeft: 90,
      bottomRight: 0
    };
    
    positions.forEach(position => {
      const config = this.boardConfig[position];
      if (!config) return;
      
      const board = this.smallBoards.find(b => b.id === config.boardId);
      if (!board) return;
      
      const face = board.faces[config.faceId];
      if (!face) return;
      
      const offset = offsets[position];
      const rotation = rotations[position];
      
      ctx.save();
      
      // 移动到小棋盘中心并旋转
      const centerX = (offset.x + 4) * cellSize;
      const centerY = (offset.y + 4) * cellSize;
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
      
      // 绘制小棋盘元素（偏移到正确位置）
      this.drawBoardElementsWithOffset(ctx, face, cellSize, offset.x, offset.y);
      
      ctx.restore();
    });
  }
  
  drawBoardElementsWithOffset(ctx, face, cellSize, offsetX, offsetY) {
    // 绘制墙壁
    if (face.walls) {
      ctx.strokeStyle = '#42311B';
      ctx.lineWidth = 3;
      ctx.lineCap = 'square';
      
      face.walls.forEach(wall => {
        wall.sides.forEach(side => {
          const x = (offsetX + wall.x) * cellSize;
          const y = (offsetY + wall.y) * cellSize;
          
          ctx.beginPath();
          switch(side) {
            case 'top':
              ctx.moveTo(x, y);
              ctx.lineTo(x + cellSize, y);
              break;
            case 'right':
              ctx.moveTo(x + cellSize, y);
              ctx.lineTo(x + cellSize, y + cellSize);
              break;
            case 'bottom':
              ctx.moveTo(x, y + cellSize);
              ctx.lineTo(x + cellSize, y + cellSize);
              break;
            case 'left':
              ctx.moveTo(x, y);
              ctx.lineTo(x, y + cellSize);
              break;
          }
          ctx.stroke();
        });
      });
    }
    
    // 绘制分光镜
    if (face.prisms) {
      const colors = {
        red: '#DF2822',
        yellow: '#EFC71E',
        blue: '#3E577F',
        green: '#3B991E'
      };
      
      face.prisms.forEach(prism => {
        const x = (offsetX + prism.x) * cellSize;
        const y = (offsetY + prism.y) * cellSize;
        const center = cellSize / 2;
        
        ctx.strokeStyle = colors[prism.color];
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        
        if (prism.direction === '\\') {
          ctx.moveTo(x + 3, y + 3);
          ctx.lineTo(x + cellSize - 3, y + cellSize - 3);
        } else {
          ctx.moveTo(x + 3, y + cellSize - 3);
          ctx.lineTo(x + cellSize - 3, y + 3);
        }
        
        ctx.stroke();
        
        ctx.fillStyle = colors[prism.color];
        ctx.beginPath();
        ctx.arc(x + center, y + center, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    
    // 绘制终点（显示实际形状）
    if (face.targets) {
      const colors = {
        red: '#DF2822',
        yellow: '#EFC71E',
        blue: '#3E577F',
        green: '#3B991E'
      };
      
      face.targets.forEach(target => {
        const x = (offsetX + target.x) * cellSize + cellSize / 2;
        const y = (offsetY + target.y) * cellSize + cellSize / 2;
        const radius = cellSize / 5;
        
        ctx.save();
        
        if (target.color === 'rainbow') {
          // 彩虹渐变
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
  }

  bindEvents() {
    // 拖拽目标区域
    const dropZones = document.querySelectorAll('.drop-zone');
    dropZones.forEach(zone => {
      zone.addEventListener('dragover', (e) => this.handleDragOver(e));
      zone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      zone.addEventListener('drop', (e) => this.handleDrop(e));
    });

    // 按钮事件
    document.getElementById('generateBtn').addEventListener('click', () => this.generateGameCode());
    document.getElementById('randomBtn').addEventListener('click', () => this.randomConfig());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    document.getElementById('copyBtn').addEventListener('click', () => this.copyGameCode());
    document.getElementById('playBtn').addEventListener('click', () => this.playGame());
  }

  handleDragStart(e) {
    const item = e.target;
    
    // 检查是否已被使用
    if (item.classList.contains('used')) {
      e.preventDefault();
      return;
    }

    const boardId = item.dataset.boardId;
    const activeFace = item.querySelector('.face-btn.active');
    const faceId = activeFace ? parseInt(activeFace.dataset.face) : 0;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('boardId', boardId);
    e.dataTransfer.setData('faceId', faceId);
    
    item.classList.add('dragging');
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  }

  handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  handleDrop(e) {
    e.preventDefault();
    const zone = e.currentTarget;
    zone.classList.remove('drag-over');

    const boardId = parseInt(e.dataTransfer.getData('boardId'));
    const faceId = parseInt(e.dataTransfer.getData('faceId'));
    const position = zone.dataset.position;

    // 检查颜色冲突
    const board = this.smallBoards.find(b => b.id === boardId);
    if (!board) return;

    const usedColors = Object.values(this.boardConfig)
      .filter(cfg => cfg !== null && cfg.boardId !== boardId)
      .map(cfg => this.smallBoards.find(b => b.id === cfg.boardId)?.color);

    if (usedColors.includes(board.color)) {
      this.showMessage('不能使用相同颜色的小棋盘！', 'error');
      return;
    }

    // 移除旧配置
    if (this.boardConfig[position]) {
      this.updateBoardItemStatus(this.boardConfig[position].boardId, false);
    }

    // 设置新配置
    this.boardConfig[position] = { boardId, faceId };
    this.updateBoardItemStatus(boardId, true);
    this.renderDropZone(zone, boardId, faceId);
    
    // 更新棋子配置状态（检查是否可以设置棋子）
    this.renderRobotConfig();
  }

  renderDropZone(zone, boardId, faceId) {
    const board = this.smallBoards.find(b => b.id === boardId);
    if (!board) return;

    const colorNames = {
      red: '红色',
      yellow: '黄色',
      blue: '蓝色',
      green: '绿色'
    };

    const position = zone.dataset.position;
    const rotationAngles = {
      topLeft: 180,
      topRight: 270,
      bottomLeft: 90,
      bottomRight: 0
    };
    const rotation = rotationAngles[position];

    zone.classList.add('filled', board.color);
    zone.innerHTML = `
      <button class="remove-btn" title="移除">×</button>
      <div class="drop-zone-content">
        <div class="board-color-badge ${board.color}" style="width: 48px; height: 48px; margin: 0 auto 10px;"></div>
        <div class="drop-zone-board-info">棋盘 ${boardId} - ${colorNames[board.color]}</div>
        <div class="drop-zone-face-info">${faceId === 0 ? '正面 A' : '背面 B'}</div>
        <div class="drop-zone-rotation">旋转 ${rotation}°</div>
        <canvas class="drop-zone-preview" width="160" height="160"></canvas>
        <button class="preview-full-btn" data-board-id="${boardId}" data-face-id="${faceId}" data-rotation="${rotation}">🔍 查看大图</button>
      </div>
    `;

    // 绘制小预览
    this.renderSmallPreview(zone.querySelector('.drop-zone-preview'), board, faceId, rotation);

    // 绑定移除按钮
    zone.querySelector('.remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeBoard(position);
    });

    // 绑定查看大图按钮
    zone.querySelector('.preview-full-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.showRotatedBoardPreview(parseInt(e.target.dataset.boardId), parseInt(e.target.dataset.faceId), parseInt(e.target.dataset.rotation));
    });
  }

  removeBoard(position) {
    const config = this.boardConfig[position];
    if (!config) return;

    this.updateBoardItemStatus(config.boardId, false);
    this.boardConfig[position] = null;

    const zone = document.querySelector(`.drop-zone[data-position="${position}"]`);
    zone.classList.remove('filled', 'red', 'yellow', 'blue', 'green');
    
    const positionNames = {
      topLeft: '左上 (Top Left)',
      topRight: '右上 (Top Right)',
      bottomLeft: '左下 (Bottom Left)',
      bottomRight: '右下 (Bottom Right)'
    };

    const rotations = {
      topLeft: '180°',
      topRight: '270°',
      bottomLeft: '90°',
      bottomRight: '0°'
    };

    zone.innerHTML = `
      <div class="drop-zone-label">${positionNames[position]}</div>
      <div class="drop-zone-icon">📍</div>
      <small style="color: #999;">旋转${rotations[position]}</small>
    `;
    
    // 更新棋子配置状态
    this.renderRobotConfig();
  }

  updateBoardItemStatus(boardId, isUsed) {
    const item = document.querySelector(`.small-board-item[data-board-id="${boardId}"]`);
    if (item) {
      if (isUsed) {
        item.classList.add('used');
        item.setAttribute('draggable', 'false');
      } else {
        item.classList.remove('used');
        item.setAttribute('draggable', 'true');
      }
    }
  }

  generateGameCode() {

    // 验证配置
    const positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    const missingPositions = positions.filter(pos => !this.boardConfig[pos]);

    if (missingPositions.length > 0) {
      this.showMessage('请为所有4个位置配置小棋盘！', 'warning');
      return;
    }

    // 检查颜色重复
    const colors = positions.map(pos => {
      const cfg = this.boardConfig[pos];
      return this.smallBoards.find(b => b.id === cfg.boardId)?.color;
    });

    const uniqueColors = new Set(colors);
    if (uniqueColors.size !== 4) {
      this.showMessage('必须使用4个不同颜色的小棋盘！', 'error');
      return;
    }

    // 验证棋子位置
    for (const [color, pos] of Object.entries(this.robotPositions)) {
      if (pos.x < 0 || pos.x > 15 || pos.y < 0 || pos.y > 15) {
        this.showMessage(`${color}棋子位置超出范围！`, 'error');
        return;
      }
      
      // 检查是否在中央禁区
      if ((pos.x === 7 || pos.x === 8) && (pos.y === 7 || pos.y === 8)) {
        this.showMessage(`${color}棋子不能放置在中央2x2禁区！`, 'error');
        return;
      }
    }

    try {
      // 构建配置数组
      const configArray = positions.map(pos => this.boardConfig[pos]);
      
      // 先编码棋盘配置
      const boardCode = Encoder.encodeBoardConfig(configArray);
      
      // 再生成完整编码
      const gameCode = Encoder.encodeGame(boardCode, this.robotPositions);
      
      // 显示结果
      document.getElementById('gameCodeDisplay').textContent = gameCode;
      document.getElementById('resultPanel').classList.add('show');
      this.showMessage('游戏编码生成成功！', 'success');

      // 保存到localStorage
      localStorage.setItem('lastGameCode', gameCode);

    } catch (error) {
      console.error('[Configurator] 生成失败:', error);
      this.showMessage('生成编码失败: ' + error.message, 'error');
    }
  }

  randomConfig() {

    // 重置
    this.reset();

    // 随机选择4个不同颜色的棋盘
    const positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    const availableBoards = [...this.smallBoards];

    positions.forEach(position => {
      if (availableBoards.length === 0) return;

      const randomIndex = Math.floor(Math.random() * availableBoards.length);
      const board = availableBoards.splice(randomIndex, 1)[0];
      const faceId = Math.random() < 0.5 ? 0 : 1;

      this.boardConfig[position] = { boardId: board.id, faceId };
      this.updateBoardItemStatus(board.id, true);

      const zone = document.querySelector(`.drop-zone[data-position="${position}"]`);
      this.renderDropZone(zone, board.id, faceId);
    });

    // 随机棋子位置（避开中央禁区）
    const validPositions = [];
    for (let x = 0; x <= 15; x++) {
      for (let y = 0; y <= 15; y++) {
        if (!((x === 7 || x === 8) && (y === 7 || y === 8))) {
          validPositions.push({ x, y });
        }
      }
    }

    const colors = ['red', 'yellow', 'blue', 'green'];
    const usedPositions = new Set();

    colors.forEach(color => {
      let pos;
      do {
        const randomIndex = Math.floor(Math.random() * validPositions.length);
        pos = validPositions[randomIndex];
      } while (usedPositions.has(`${pos.x},${pos.y}`));

      usedPositions.add(`${pos.x},${pos.y}`);
      this.robotPositions[color] = { ...pos };
    });

    // 更新UI
    this.renderRobotConfig();

    this.showMessage('已生成随机配置！', 'success');
  }

  reset() {

    // 清除所有配置
    Object.keys(this.boardConfig).forEach(pos => {
      if (this.boardConfig[pos]) {
        this.removeBoard(pos);
      }
    });

    // 重置棋子位置
    this.robotPositions = {
      red: { x: 8, y: 15 },
      yellow: { x: 15, y: 8 },
      blue: { x: 7, y: 0 },
      green: { x: 0, y: 7 }
    };

    this.renderRobotConfig();

    // 隐藏结果
    document.getElementById('resultPanel').classList.remove('show');
    this.showMessage('配置已重置', 'success');
  }

  copyGameCode() {
    const code = document.getElementById('gameCodeDisplay').textContent;
    
    navigator.clipboard.writeText(code).then(() => {
      this.showMessage('游戏编码已复制到剪贴板！', 'success');
    }).catch(err => {
      console.error('[Configurator] 复制失败:', err);
      this.showMessage('复制失败，请手动复制', 'error');
    });
  }

  playGame() {
    const code = document.getElementById('gameCodeDisplay').textContent;
    window.location.href = `./index.html?code=${code}`;
  }

  showMessage(message, type = 'info') {
    const messageEl = document.getElementById('statusMessage');
    messageEl.textContent = message;
    messageEl.className = `status-message ${type} show`;

    setTimeout(() => {
      messageEl.classList.remove('show');
    }, 3000);
  }
  
  renderSmallPreview(canvas, board, faceId, rotation = 0) {
    const ctx = canvas.getContext('2d');
    const face = board.faces[faceId];
    if (!face) return;
    
    const cellSize = 20; // 小预览用20px
    const size = 8;
    
    // 清空画布
    ctx.fillStyle = '#FFFCF6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 应用旋转
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    // 绘制网格
    ctx.strokeStyle = '#d4b89a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, size * cellSize);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(size * cellSize, i * cellSize);
      ctx.stroke();
    }
    
    // 绘制墙壁
    if (face.walls) {
      ctx.strokeStyle = '#42311B';
      ctx.lineWidth = 2;
      face.walls.forEach(wall => {
        wall.sides.forEach(side => {
          const x = wall.x * cellSize;
          const y = wall.y * cellSize;
          ctx.beginPath();
          switch(side) {
            case 'top':
              ctx.moveTo(x, y);
              ctx.lineTo(x + cellSize, y);
              break;
            case 'right':
              ctx.moveTo(x + cellSize, y);
              ctx.lineTo(x + cellSize, y + cellSize);
              break;
            case 'bottom':
              ctx.moveTo(x, y + cellSize);
              ctx.lineTo(x + cellSize, y + cellSize);
              break;
            case 'left':
              ctx.moveTo(x, y);
              ctx.lineTo(x, y + cellSize);
              break;
          }
          ctx.stroke();
        });
      });
    }
    
    // 绘制分光镜（简化）
    if (face.prisms) {
      const colors = {
        red: '#DF2822',
        yellow: '#EFC71E',
        blue: '#3E577F',
        green: '#3B991E'
      };
      
      face.prisms.forEach(prism => {
        const x = prism.x * cellSize;
        const y = prism.y * cellSize;
        ctx.strokeStyle = colors[prism.color];
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (prism.direction === '\\') {
          ctx.moveTo(x + 2, y + 2);
          ctx.lineTo(x + cellSize - 2, y + cellSize - 2);
        } else {
          ctx.moveTo(x + 2, y + cellSize - 2);
          ctx.lineTo(x + cellSize - 2, y + 2);
        }
        ctx.stroke();
      });
    }
    
    // 绘制终点（显示实际形状）
    if (face.targets) {
      const colors = {
        red: '#DF2822',
        yellow: '#EFC71E',
        blue: '#3E577F',
        green: '#3B991E'
      };
      
      face.targets.forEach(target => {
        const x = target.x * cellSize + cellSize / 2;
        const y = target.y * cellSize + cellSize / 2;
        const radius = cellSize / 4;
        
        ctx.save();
        
        if (target.color === 'rainbow') {
          // 彩虹渐变
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
    
    ctx.restore();
  }
  
  showRotatedBoardPreview(boardId, faceId, rotation) {
    const board = this.smallBoards.find(b => b.id === boardId);
    if (!board) return;
        
    // 创建模态框（类似showBoardPreview，但显示旋转后的效果）
    const modal = document.createElement('div');
    modal.className = 'preview-modal';
    modal.innerHTML = `
      <div class="preview-content">
        <div class="preview-header">
          <h3>棋盘 ${boardId} - 旋转 ${rotation}°</h3>
          <button class="close-btn">×</button>
        </div>
        <div class="preview-body">
          <canvas id="previewCanvas"></canvas>
          <div class="preview-stats" id="previewStats">
            <div><strong>旋转:</strong> ${rotation}°</div>
            <div><strong>面:</strong> ${faceId === 0 ? '正面 A' : '背面 B'}</div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定关闭
    modal.querySelector('.close-btn').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // 渲染旋转后的预览
    const canvas = modal.querySelector('#previewCanvas');
    const ctx = canvas.getContext('2d');
    const face = board.faces[faceId];
    
    if (!face) return;
    
    const cellSize = 40;
    const size = 8;
    canvas.width = size * cellSize;
    canvas.height = size * cellSize;
    
    // 清空并旋转
    ctx.fillStyle = '#FFFCF6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    // 绘制网格
    ctx.strokeStyle = '#d4b89a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, size * cellSize);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(size * cellSize, i * cellSize);
      ctx.stroke();
    }
    
    // 使用相同的绘制逻辑（墙壁、分光镜、终点）
    this.drawBoardElements(ctx, face, cellSize);
    
    ctx.restore();
  }
  
  drawBoardElements(ctx, face, cellSize) {
    // 绘制墙壁
    if (face.walls) {
      ctx.strokeStyle = '#42311B';
      ctx.lineWidth = 4;
      ctx.lineCap = 'square';
      
      face.walls.forEach(wall => {
        wall.sides.forEach(side => {
          const x = wall.x * cellSize;
          const y = wall.y * cellSize;
          
          ctx.beginPath();
          switch(side) {
            case 'top':
              ctx.moveTo(x, y);
              ctx.lineTo(x + cellSize, y);
              break;
            case 'right':
              ctx.moveTo(x + cellSize, y);
              ctx.lineTo(x + cellSize, y + cellSize);
              break;
            case 'bottom':
              ctx.moveTo(x, y + cellSize);
              ctx.lineTo(x + cellSize, y + cellSize);
              break;
            case 'left':
              ctx.moveTo(x, y);
              ctx.lineTo(x, y + cellSize);
              break;
          }
          ctx.stroke();
        });
      });
    }
    
    // 绘制分光镜
    if (face.prisms) {
      const colors = {
        red: '#DF2822',
        yellow: '#EFC71E',
        blue: '#3E577F',
        green: '#3B991E'
      };
      
      face.prisms.forEach(prism => {
        const x = prism.x * cellSize;
        const y = prism.y * cellSize;
        const center = cellSize / 2;
        
        ctx.strokeStyle = colors[prism.color];
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        
        if (prism.direction === '\\') {
          ctx.moveTo(x + 5, y + 5);
          ctx.lineTo(x + cellSize - 5, y + cellSize - 5);
        } else {
          ctx.moveTo(x + 5, y + cellSize - 5);
          ctx.lineTo(x + cellSize - 5, y + 5);
        }
        
        ctx.stroke();
        
        ctx.fillStyle = colors[prism.color];
        ctx.beginPath();
        ctx.arc(x + center, y + center, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    
    // 绘制终点
    if (face.targets) {
      const colors = {
        red: '#DF2822',
        yellow: '#EFC71E',
        blue: '#3E577F',
        green: '#3B991E'
      };
      
      face.targets.forEach(target => {
        const x = target.x * cellSize + cellSize / 2;
        const y = target.y * cellSize + cellSize / 2;
        const radius = cellSize / 4;
        
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
              const angle = (Math.PI / 3) * i;
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
  }
  
  showBoardPreview(boardId) {
    const board = this.smallBoards.find(b => b.id === boardId);
    if (!board) return;
        
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'preview-modal';
    modal.innerHTML = `
      <div class="preview-content">
        <div class="preview-header">
          <h3>棋盘 ${boardId} 预览</h3>
          <button class="close-btn">×</button>
        </div>
        <div class="preview-tabs">
          <button class="preview-tab active" data-face="0">正面 A</button>
          <button class="preview-tab" data-face="1">背面 B</button>
        </div>
        <div class="preview-body">
          <canvas id="previewCanvas"></canvas>
          <div class="preview-stats" id="previewStats"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定关闭
    modal.querySelector('.close-btn').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // 绑定标签页切换
    let currentFace = 0;
    modal.querySelectorAll('.preview-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        modal.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFace = parseInt(tab.dataset.face);
        renderPreview(currentFace);
      });
    });
    
    // 渲染预览
    const renderPreview = (faceId) => {
      const canvas = modal.querySelector('#previewCanvas');
      const ctx = canvas.getContext('2d');
      const face = board.faces[faceId];
      
      if (!face) {
        console.error('[Configurator] 面不存在:', faceId);
        return;
      }
            
      // 设置画布大小
      const cellSize = 40;
      const size = 8;
      canvas.width = size * cellSize;
      canvas.height = size * cellSize;
      
      // 绘制背景
      ctx.fillStyle = '#FFFCF6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 绘制网格
      ctx.strokeStyle = '#d4b89a';
      ctx.lineWidth = 1;
      for (let i = 0; i <= size; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, size * cellSize);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(size * cellSize, i * cellSize);
        ctx.stroke();
      }
      
      // 绘制元素（墙壁、分光镜、终点）
      this.drawBoardElements(ctx, face, cellSize);
      
      // 更新统计
      const stats = modal.querySelector('#previewStats');
      stats.innerHTML = `
        <div><strong>墙壁:</strong> ${face.walls?.length || 0} 处</div>
        <div><strong>分光镜:</strong> ${face.prisms?.length || 0} 个</div>
        <div><strong>终点:</strong> ${face.targets?.length || 0} 个</div>
      `;
    };
    
    // 初始渲染
    renderPreview(0);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  window.configurator = new GameConfigurator();
});

