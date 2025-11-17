/**
 * 小棋盘编辑器
 */

class BoardEditor {
  constructor() {
    this.size = 8;
    this.currentFace = 0;
    this.currentTool = 'wall';
    this.selectedWalls = [];
    this.selectedShape = 'circle';
    this.selectedColor = 'red';
    this.selectedPrismDir = '\\';
    this.selectedPrismColor = 'red';
    
    // 数据结构
    this.boardData = {
      id: 0,
      color: 'red',
      originalGap: { x: 0, y: 0 },
      faces: [
        { id: 0, name: 'Face A', walls: [], prisms: [], targets: [] },
        { id: 1, name: 'Face B', walls: [], prisms: [], targets: [] }
      ]
    };
    
    this.init();
  }
  
  init() {
    this.initGrid();
    this.bindEvents();
    this.updateToolOptions();
    this.updateDisplay();
  }
  
  initGrid() {
    const container = document.getElementById('gridContainer');
    container.innerHTML = '';
    
    for (let y = 0; y < this.size; y++) {
      const row = document.createElement('div');
      row.className = 'grid-row';
      
      for (let x = 0; x < this.size; x++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        
        // 标记缺口
        if (x === 0 && y === 0) {
          cell.classList.add('gap');
        }
        
        // 添加坐标
        const coord = document.createElement('div');
        coord.className = 'cell-coord';
        coord.textContent = `${x},${y}`;
        cell.appendChild(coord);
        
        // 添加可点击的边缘
        ['top', 'right', 'bottom', 'left'].forEach(side => {
          const edge = document.createElement('div');
          edge.className = `cell-edge ${side}`;
          edge.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleEdgeClick(x, y, side);
          });
          cell.appendChild(edge);
        });
        
        // 点击格子中心（用于放置终点和分光镜）
        cell.addEventListener('click', () => this.handleCellClick(x, y));
        
        row.appendChild(cell);
      }
      
      container.appendChild(row);
    }
  }
  
  bindEvents() {
    // 工具选择
    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTool = btn.dataset.tool;
        this.updateToolOptions();
      });
    });
    
    // 面切换
    document.querySelectorAll('.face-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.face-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentFace = parseInt(tab.dataset.face);
        this.updateDisplay();
      });
    });
    
    // 墙壁方向（移除，不再需要）
    // document.querySelectorAll('[data-wall]').forEach(btn => {
    //   ...
    // });
    
    // 终点形状
    document.querySelectorAll('[data-shape]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-shape]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedShape = btn.dataset.shape;
      });
    });
    
    // 终点颜色
    document.querySelectorAll('[data-color]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-color]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedColor = btn.dataset.color;
      });
    });
    
    // 分光镜方向
    document.querySelectorAll('[data-prism-dir]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-prism-dir]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedPrismDir = btn.dataset.prismDir;
      });
    });
    
    // 分光镜颜色
    document.querySelectorAll('[data-prism-color]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-prism-color]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedPrismColor = btn.dataset.prismColor;
      });
    });
    
    // 基本信息
    document.getElementById('boardId').addEventListener('change', (e) => {
      this.boardData.id = parseInt(e.target.value);
      this.updateJSON();
    });
    
    document.getElementById('boardColor').addEventListener('change', (e) => {
      this.boardData.color = e.target.value;
      this.updateJSON();
    });
    
    // 导出按钮
    document.getElementById('exportBtn').addEventListener('click', () => this.exportJSON());
    document.getElementById('copyBtn').addEventListener('click', () => this.copyJSON());
    document.getElementById('clearBtn').addEventListener('click', () => this.clearBoard());
  }
  
  updateToolOptions() {
    const wallOptions = document.getElementById('wallOptions');
    const targetOptions = document.getElementById('targetOptions');
    const prismOptions = document.getElementById('prismOptions');
    
    wallOptions.style.display = this.currentTool === 'wall' ? 'block' : 'none';
    targetOptions.style.display = this.currentTool === 'target' ? 'block' : 'none';
    prismOptions.style.display = this.currentTool === 'prism' ? 'block' : 'none';
  }
  
  handleEdgeClick(x, y, side) {
    if (this.currentTool !== 'wall' && this.currentTool !== 'erase') {
      return;
    }
    
    const face = this.boardData.faces[this.currentFace];
    
    if (this.currentTool === 'wall') {
      this.toggleWall(face, x, y, side);
    } else if (this.currentTool === 'erase') {
      this.removeWall(face, x, y, side);
    }
    
    this.updateDisplay();
  }
  
  toggleWall(face, x, y, side) {
    let wallData = face.walls.find(w => w.x === x && w.y === y);
    
    if (!wallData) {
      wallData = { x, y, sides: [] };
      face.walls.push(wallData);
    }
    
    // 切换墙壁状态
    const index = wallData.sides.indexOf(side);
    if (index >= 0) {
      // 移除墙壁
      wallData.sides.splice(index, 1);
      
      // 同时移除相邻格子的对应墙壁
      const opposite = {
        'top': { dx: 0, dy: -1, side: 'bottom' },
        'bottom': { dx: 0, dy: 1, side: 'top' },
        'left': { dx: -1, dy: 0, side: 'right' },
        'right': { dx: 1, dy: 0, side: 'left' }
      };
      
      const adj = opposite[side];
      const adjX = x + adj.dx;
      const adjY = y + adj.dy;
      
      if (adjX >= 0 && adjX < this.size && adjY >= 0 && adjY < this.size) {
        const adjWall = face.walls.find(w => w.x === adjX && w.y === adjY);
        if (adjWall) {
          const adjIndex = adjWall.sides.indexOf(adj.side);
          if (adjIndex >= 0) {
            adjWall.sides.splice(adjIndex, 1);
          }
          if (adjWall.sides.length === 0) {
            face.walls = face.walls.filter(w => !(w.x === adjX && w.y === adjY));
          }
        }
      }
      
      if (wallData.sides.length === 0) {
        face.walls = face.walls.filter(w => !(w.x === x && w.y === y));
      }
    } else {
      // 添加墙壁
      wallData.sides.push(side);
      
      // 同时添加相邻格子的对应墙壁
      const opposite = {
        'top': { dx: 0, dy: -1, side: 'bottom' },
        'bottom': { dx: 0, dy: 1, side: 'top' },
        'left': { dx: -1, dy: 0, side: 'right' },
        'right': { dx: 1, dy: 0, side: 'left' }
      };
      
      const adj = opposite[side];
      const adjX = x + adj.dx;
      const adjY = y + adj.dy;
      
      if (adjX >= 0 && adjX < this.size && adjY >= 0 && adjY < this.size) {
        let adjWall = face.walls.find(w => w.x === adjX && w.y === adjY);
        if (!adjWall) {
          adjWall = { x: adjX, y: adjY, sides: [] };
          face.walls.push(adjWall);
        }
        if (!adjWall.sides.includes(adj.side)) {
          adjWall.sides.push(adj.side);
        }
      }
    }
    
    this.sortWalls(face);
  }
  
  removeWall(face, x, y, side) {
    let wallData = face.walls.find(w => w.x === x && w.y === y);
    if (!wallData) return;
    
    const index = wallData.sides.indexOf(side);
    if (index >= 0) {
      wallData.sides.splice(index, 1);
      
      // 同时移除相邻格子的对应墙壁
      const opposite = {
        'top': { dx: 0, dy: -1, side: 'bottom' },
        'bottom': { dx: 0, dy: 1, side: 'top' },
        'left': { dx: -1, dy: 0, side: 'right' },
        'right': { dx: 1, dy: 0, side: 'left' }
      };
      
      const adj = opposite[side];
      const adjX = x + adj.dx;
      const adjY = y + adj.dy;
      
      if (adjX >= 0 && adjX < this.size && adjY >= 0 && adjY < this.size) {
        const adjWall = face.walls.find(w => w.x === adjX && w.y === adjY);
        if (adjWall) {
          const adjIndex = adjWall.sides.indexOf(adj.side);
          if (adjIndex >= 0) {
            adjWall.sides.splice(adjIndex, 1);
          }
          if (adjWall.sides.length === 0) {
            face.walls = face.walls.filter(w => !(w.x === adjX && w.y === adjY));
          }
        }
      }
      
      if (wallData.sides.length === 0) {
        face.walls = face.walls.filter(w => !(w.x === x && w.y === y));
      }
    }
    
    this.sortWalls(face);
  }
  
  handleCellClick(x, y) {
    const face = this.boardData.faces[this.currentFace];
    
    switch (this.currentTool) {
      case 'target':
        this.addTarget(face, x, y);
        break;
      case 'prism':
        this.addPrism(face, x, y);
        break;
      case 'erase':
        this.eraseCell(face, x, y);
        break;
      // wall工具通过边缘处理
    }
    
    this.updateDisplay();
  }
  
  addWall(face, x, y) {
    // 不再使用，保留以防万一
  }
  
  addWallToCell(face, x, y, side) {
    // 不再使用，保留以防万一
  }
  
  sortWalls(face) {
    face.walls.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
  }
  
  addTarget(face, x, y) {
    // 不能在缺口放置终点
    if (x === 0 && y === 0) {
      alert('不能在缺口(0,0)放置终点！');
      return;
    }
    
    // 移除该位置已有的终点
    face.targets = face.targets.filter(t => !(t.x === x && t.y === y));
    
    // 添加新终点
    const id = `B${this.boardData.id}F${this.currentFace}T${face.targets.length + 1}`;
    face.targets.push({
      x, y,
      shape: this.selectedShape,
      color: this.selectedColor,
      id: id
    });
    
    // 排序
    this.sortTargets(face);
  }
  
  sortTargets(face) {
    face.targets.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
    
    // 重新生成ID
    face.targets.forEach((target, index) => {
      target.id = `B${this.boardData.id}F${this.currentFace}T${index + 1}`;
    });
  }
  
  addPrism(face, x, y) {
    // 移除该位置已有的分光镜
    face.prisms = face.prisms.filter(p => !(p.x === x && p.y === y));
    
    // 添加新分光镜
    face.prisms.push({
      x, y,
      direction: this.selectedPrismDir,
      color: this.selectedPrismColor
    });
    
    // 排序
    this.sortPrisms(face);
  }
  
  sortPrisms(face) {
    face.prisms.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
  }
  
  eraseCell(face, x, y) {
    // 移除墙壁、分光镜、终点
    face.walls = face.walls.filter(w => !(w.x === x && w.y === y));
    face.prisms = face.prisms.filter(p => !(p.x === x && p.y === y));
    face.targets = face.targets.filter(t => !(t.x === x && t.y === y));
  }
  
  updateDisplay() {
    const face = this.boardData.faces[this.currentFace];
    
    // 清除所有格子的内容，但保留边缘元素和坐标
    document.querySelectorAll('.grid-cell').forEach(cell => {
      // 保留边缘元素和坐标
      const edges = Array.from(cell.querySelectorAll('.cell-edge'));
      const coord = cell.querySelector('.cell-coord');
      const isGap = cell.classList.contains('gap');
      
      // 清空
      cell.innerHTML = '';
      
      // 恢复边缘元素
      edges.forEach(edge => cell.appendChild(edge));
      
      // 恢复坐标
      if (coord) cell.appendChild(coord);
      
      // 恢复gap类
      if (isGap) cell.classList.add('gap');
    });
    
    // 渲染墙壁
    face.walls.forEach(wall => {
      const cell = document.querySelector(`[data-x="${wall.x}"][data-y="${wall.y}"]`);
      if (cell) {
        wall.sides.forEach(side => {
          const wallDiv = document.createElement('div');
          wallDiv.className = `cell-wall ${side}`;
          cell.appendChild(wallDiv);
        });
      }
    });
    
    // 渲染分光镜
    face.prisms.forEach(prism => {
      const cell = document.querySelector(`[data-x="${prism.x}"][data-y="${prism.y}"]`);
      if (cell) {
        const prismDiv = document.createElement('div');
        prismDiv.className = `cell-prism ${prism.color}`;
        prismDiv.textContent = prism.direction;
        cell.appendChild(prismDiv);
      }
    });
    
    // 渲染终点
    face.targets.forEach(target => {
      const cell = document.querySelector(`[data-x="${target.x}"][data-y="${target.y}"]`);
      if (cell) {
        const targetDiv = document.createElement('div');
        targetDiv.className = 'cell-target';
        targetDiv.textContent = this.getShapeEmoji(target.shape);
        targetDiv.style.color = this.getColorCode(target.color);
        cell.appendChild(targetDiv);
      }
    });
    
    // 更新统计
    this.updateStats();
    
    // 更新JSON
    this.updateJSON();
  }
  
  getShapeEmoji(shape) {
    const emojis = {
      circle: '⭕',
      triangle: '🔺',
      square: '⬛',
      hexagon: '⬢'
    };
    return emojis[shape] || '●';
  }
  
  getColorCode(color) {
    const colors = {
      red: '#e74c3c',
      yellow: '#f39c12',
      blue: '#3498db',
      green: '#2ecc71',
      rainbow: '#9C27B0'
    };
    return colors[color] || '#000';
  }
  
  updateStats() {
    const face = this.boardData.faces[this.currentFace];
    
    const wallCount = face.walls.reduce((sum, w) => sum + w.sides.length, 0);
    document.getElementById('wallCount').textContent = wallCount;
    document.getElementById('prismCount').textContent = face.prisms.length;
    document.getElementById('targetCount').textContent = face.targets.length;
  }
  
  updateJSON() {
    const json = JSON.stringify(this.boardData, null, 2);
    document.getElementById('jsonOutput').textContent = json;
  }
  
  exportJSON() {
    const json = JSON.stringify(this.boardData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `board-${this.boardData.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    alert('JSON文件已导出！');
  }
  
  copyJSON() {
    const json = JSON.stringify(this.boardData, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert('JSON已复制到剪贴板！');
    }).catch(err => {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制');
    });
  }
  
  clearBoard() {
    if (!confirm('确定要清空当前面的所有内容吗？')) {
      return;
    }
    
    const face = this.boardData.faces[this.currentFace];
    face.walls = [];
    face.prisms = [];
    face.targets = [];
    
    this.updateDisplay();
    alert('已清空！');
  }
}

// 启动编辑器
document.addEventListener('DOMContentLoaded', () => {
  new BoardEditor();
});

