/**
 * V2 主应用程序
 * 集成Game, PathFinder, BoardRenderer
 */

import { SmallBoard } from './src/core/SmallBoard.js';
import { Board } from './src/core/Board.js';
import { Robot } from './src/core/Robot.js';
import { Game } from './src/core/Game.js';
import { PathFinder } from './src/algorithm/PathFinder.js';
import { BoardRenderer } from './src/ui/BoardRenderer.js';
import { Encoder } from './src/utils/Encoder.js';
import { CONSTANTS } from './src/utils/Constants.js';

class RicochetRobotsApp {
  constructor() {
    this.game = null;
    this.boardRenderer = null;
    this.pathFinder = null;
    this.smallBoards = [];
    this.selectedTarget = null;
    this.currentSolution = null;
    
    this.init();
  }
  
  async init() {
    
    // 加载内置小棋盘
    await this.loadSmallBoards();
    
    // 初始化UI元素
    this.initUI();
    
    // 绑定事件
    this.bindEvents();
    
    // 检查URL参数
    this.checkUrlParams();
    
  }
  
  async loadSmallBoards() {
    
    try {
      // 加载所有4个棋盘数据文件
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
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          const smallBoard = new SmallBoard(data);
          this.smallBoards.push(smallBoard);
        } catch (error) {
          console.error(`[App] 加载 ${boardFiles[i]} 失败:`, error);
          throw error;
        }
      }
      
    } catch (error) {
      console.error('[App] 加载小棋盘失败:', error);
      this.showMessage('加载棋盘数据失败: ' + error.message, 'error');
    }
  }
  
  initUI() {
    // 获取UI元素
    this.elements = {
      gameCode: document.getElementById('gameCode'),
      loadGameBtn: document.getElementById('loadGameBtn'),
      randomGameBtn: document.getElementById('randomGameBtn'),
      targetList: document.getElementById('targetList'),
      historyList: document.getElementById('historyList'),
      solveBtn: document.getElementById('solveBtn'),
      resetBtn: document.getElementById('resetBtn'),
      statusMessage: document.getElementById('statusMessage'),
      canvas: document.getElementById('gameBoard'),
      solutionPanel: document.getElementById('solutionPanel'),
      simpleSolution: document.getElementById('simpleSolution'),
      detailedSolution: document.getElementById('detailedSolution'),
      playAnimationBtn: document.getElementById('playAnimationBtn'),
      pauseAnimationBtn: document.getElementById('pauseAnimationBtn'),
      replayAnimationBtn: document.getElementById('replayAnimationBtn'),
      applyMoveBtn: document.getElementById('applyMoveBtn'),
      animationProgress: document.getElementById('animationProgress')
    };
    
    // 初始化canvas
    this.initCanvas();
    
    // 绑定标签页切换
    this.bindSolutionTabs();
    
    // 初始化动画状态
    this.animationState = {
      isPlaying: false,
      isPaused: false,
      currentStep: 0,
      totalSteps: 0,
      animationId: null,
      savedRobotPositions: null // 保存初始位置用于重播
    };
  }
  
  initCanvas() {
    this.boardRenderer = new BoardRenderer(this.elements.canvas);
    // 初始化默认大小的canvas
    this.boardRenderer.initCanvas();
  }
  
  bindEvents() {
    this.elements.loadGameBtn.addEventListener('click', () => this.loadGame());
    this.elements.randomGameBtn.addEventListener('click', () => this.loadRandomGame());
    this.elements.solveBtn.addEventListener('click', () => this.solveForTarget());
    this.elements.resetBtn.addEventListener('click', () => this.resetGame());
    
    // 动画控制
    this.elements.playAnimationBtn.addEventListener('click', () => this.playAnimation());
    this.elements.pauseAnimationBtn.addEventListener('click', () => this.pauseAnimation());
    this.elements.replayAnimationBtn.addEventListener('click', () => this.replayAnimation());
    this.elements.applyMoveBtn.addEventListener('click', () => this.applyMove());
  }
  
  bindSolutionTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // 更新按钮状态
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 更新内容显示
        document.querySelectorAll('.solution-tab-content').forEach(content => {
          content.classList.remove('active');
        });
        document.getElementById(tab === 'simple' ? 'simpleSolution' : 'detailedSolution')
          .classList.add('active');
      });
    });
  }
  
  
  checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      this.elements.gameCode.value = code;
      // 延迟加载，确保UI已完全初始化
      setTimeout(() => {
        this.loadGame();
      }, 100);
    }
  }
  
  loadGame() {
    const code = this.elements.gameCode.value.trim();
    
    if (!code) {
      this.showMessage('请输入游戏编码', 'error');
      return;
    }
    
    if (code.length !== 12) {
      this.showMessage('游戏编码必须是12位十六进制数', 'error');
      return;
    }
    
    try {
      
      // 解码游戏
      const decoded = Encoder.decodeGame(code);
      
      // 创建游戏
      this.game = new Game(code, this.smallBoards);
      this.game.start();
      
      // 创建PathFinder
      this.pathFinder = new PathFinder(this.game.board, this.game.robots);
      
      // 更新BoardRenderer
      this.boardRenderer.setBoard(this.game.board);
            
      // 渲染
      this.render();
      
      // 更新UI
      this.updateGameState();
      
      this.showMessage('游戏加载成功！', 'success');
      
      // 启用按钮
      this.elements.resetBtn.disabled = false;
      
    } catch (error) {
      console.error('[App] 加载游戏失败:', error);
      this.showMessage(`加载失败: ${error.message}`, 'error');
    }
  }
  
  loadRandomGame() {
    try {
      
      // 生成随机游戏编码
      const randomCode = Encoder.generateRandomGame();
      
      // 设置到输入框
      this.elements.gameCode.value = randomCode;
      
      // 加载游戏
      this.loadGame();
      
    } catch (error) {
      console.error('[App] 生成随机游戏失败:', error);
      this.showMessage(`生成失败: ${error.message}`, 'error');
    }
  }
  
  render() {
    if (!this.game) return;
    
    this.boardRenderer.render(this.game.robots, {
      showCoordinates: false
    });
  }
  
  updateGameState() {
    if (!this.game) return;
    
    const state = this.game.getState();
    
    // 更新终点列表
    this.updateTargetList();
    
    // 更新历史
    this.updateHistory(state);
  }
  
  updateTargetList() {
    const targets = this.game.getAvailableTargets();
    
    if (targets.length === 0) {
      this.elements.targetList.innerHTML = '<div class="loading">没有可用终点</div>';
      return;
    }
    
    // 获取小棋盘位置的辅助函数
    const getBoardPosition = (x, y) => {
      if (x < 8 && y < 8) return '左上';
      if (x >= 8 && y < 8) return '右上';
      if (x < 8 && y >= 8) return '左下';
      if (x >= 8 && y >= 8) return '右下';
      return '中央';
    };
    
    // 获取颜色样式
    const getColorStyle = (color) => {
      const colors = {
        red: '#DF2822',
        yellow: '#EFC71E',
        blue: '#3E577F',
        green: '#3B991E'
      };
      if (color === 'rainbow') {
        return 'background: conic-gradient(from 0deg, #DF2822, #EFC71E, #3B991E, #3E577F, #DF2822); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;';
      }
      return `color: ${colors[color] || '#666'};`;
    };
    
    const html = targets.map(({target, position}) => {
      const boardPos = getBoardPosition(position.x, position.y);
      return `
        <div class="target-item" data-target-id="${target.id}">
          <span class="target-shape" style="${getColorStyle(target.color)}">${target.getEmoji()}</span>
          <div class="target-info">${boardPos}</div>
        </div>
      `;
    }).join('');
    
    this.elements.targetList.innerHTML = html;
    
    // 绑定点击事件
    this.elements.targetList.querySelectorAll('.target-item').forEach(item => {
      item.addEventListener('click', () => this.selectTarget(item.dataset.targetId));
    });
  }
  
  selectTarget(targetId) {
    // 更新选中状态
    this.elements.targetList.querySelectorAll('.target-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.targetId === targetId);
    });
    
    this.selectedTarget = this.game.board.getTargetById(targetId);
    
    // 启用解题按钮
    this.elements.solveBtn.disabled = false;
    
    this.showMessage(`已选择终点: ${this.selectedTarget.getDisplayName()}`, 'info');
  }
  
  async solveForTarget() {
    if (!this.selectedTarget) {
      this.showMessage('请先选择一个终点', 'error');
      return;
    }
    
    this.showMessage('正在搜索路径...', 'info');
    this.elements.solveBtn.disabled = true;
    
    // 找到可以到达此终点的棋子
    const eligibleRobots = this.game.robots.filter(r => 
      this.selectedTarget.canAccept(r.color)
    );
    
    if (eligibleRobots.length === 0) {
      this.showMessage('没有棋子可以到达此终点', 'error');
      this.elements.solveBtn.disabled = false;
      return;
    }
    
    // 尝试为每个合格的棋子寻找路径
    let bestSolution = null;
    let bestSteps = Infinity;
    
    for (const robot of eligibleRobots) {
      
      const result = this.pathFinder.findPath(
        robot.color,
        { x: this.selectedTarget.x, y: this.selectedTarget.y },
        true // 启用调试
      );
      
      if (result.success && result.steps < bestSteps) {
        bestSolution = {
          robot: robot,
          result: result
        };
        bestSteps = result.steps;
      }
    }
    
    if (bestSolution) {
      this.currentSolution = bestSolution;
      this.currentTarget = this.selectedTarget; // 保存目标
      this.showMessage(
        `找到解决方案！${bestSolution.robot.color}棋子 ${bestSteps}步 (探索${bestSolution.result.statesExplored}个状态)`,
        'success'
      );
      
      // 显示解决方案（不立即应用移动）
      this.displaySolution(bestSolution);
      
      // 重置动画状态
      this.resetAnimation();
      
    } else {
      this.showMessage('未找到路径，请尝试其他终点', 'error');
    }
    
    this.elements.solveBtn.disabled = false;
  }
  
  // ========== 动画控制方法 ==========
  
  resetAnimation() {
    // 保存当前棋子位置
    this.animationState.savedRobotPositions = this.game.robots.map(r => ({
      color: r.color,
      x: r.x,
      y: r.y
    }));
    
    this.animationState.isPlaying = false;
    this.animationState.isPaused = false;
    this.animationState.currentStep = 0;
    this.animationState.totalSteps = this.currentSolution.result.path.length;
    
    // 更新按钮状态
    this.elements.playAnimationBtn.disabled = false;
    this.elements.pauseAnimationBtn.disabled = true;
    this.elements.replayAnimationBtn.disabled = true;
    this.elements.applyMoveBtn.disabled = true;
    this.elements.animationProgress.textContent = '准备播放';
  }
  
  playAnimation() {
    if (this.animationState.isPlaying) return;
    
    this.animationState.isPlaying = true;
    this.animationState.isPaused = false;
    
    // 更新按钮状态
    this.elements.playAnimationBtn.disabled = true;
    this.elements.pauseAnimationBtn.disabled = false;
    this.elements.replayAnimationBtn.disabled = true;
    
    // 如果是从头开始，恢复初始位置
    if (this.animationState.currentStep === 0) {
      this.restoreRobotPositions();
    }
    
    this.animateNextStep();
  }
  
  pauseAnimation() {
    this.animationState.isPlaying = false;
    this.animationState.isPaused = true;
    
    if (this.animationState.animationId) {
      cancelAnimationFrame(this.animationState.animationId);
      this.animationState.animationId = null;
    }
    
    // 更新按钮状态
    this.elements.playAnimationBtn.disabled = false;
    this.elements.pauseAnimationBtn.disabled = true;
    this.elements.animationProgress.textContent = `已暂停 (${this.animationState.currentStep}/${this.animationState.totalSteps})`;
  }
  
  replayAnimation() {
    // 重置到初始状态
    this.animationState.currentStep = 0;
    this.restoreRobotPositions();
    this.render();
    
    // 开始播放
    this.playAnimation();
  }
  
  restoreRobotPositions() {
    if (!this.animationState.savedRobotPositions) return;
    
    this.animationState.savedRobotPositions.forEach(saved => {
      const robot = this.game.robots.find(r => r.color === saved.color);
      if (robot) {
        robot.x = saved.x;
        robot.y = saved.y;
      }
    });
  }
  
  async animateNextStep() {
    if (!this.animationState.isPlaying) return;
    
    const path = this.currentSolution.result.path;
    
    if (this.animationState.currentStep >= path.length) {
      // 动画完成
      this.onAnimationComplete();
      return;
    }
    
    const move = path[this.animationState.currentStep];
    const robot = this.game.robots.find(r => r.color === move.robotColor);
    
    if (!robot) {
      console.error('[Animation] 找不到棋子:', move.robotColor);
      this.animationState.currentStep++;
      this.animateNextStep();
      return;
    }
    
    // 更新进度
    this.elements.animationProgress.textContent = 
      `步骤 ${this.animationState.currentStep + 1}/${this.animationState.totalSteps}`;
    
    // 执行动画移动
    await this.animateMove(robot, move);
    
    // 下一步
    this.animationState.currentStep++;
    
    // 继续下一步（延迟500ms）
    setTimeout(() => {
      if (this.animationState.isPlaying) {
        this.animateNextStep();
      }
    }, 500);
  }
  
  async animateMove(robot, move) {
    // 使用平滑动画移动棋子
    const startX = robot.x;
    const startY = robot.y;
    const endX = move.to.x;
    const endY = move.to.y;
    
    const duration = 800; // 动画持续时间(ms)
    const startTime = Date.now();
    
    return new Promise(resolve => {
      const animate = () => {
        if (!this.animationState.isPlaying) {
          resolve();
          return;
        }
        
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用缓动函数
        const easeProgress = this.easeInOutQuad(progress);
        
        // 更新棋子位置
        robot.x = startX + (endX - startX) * easeProgress;
        robot.y = startY + (endY - startY) * easeProgress;
        
        // 重新渲染
        this.render();
        
        if (progress < 1) {
          this.animationState.animationId = requestAnimationFrame(animate);
        } else {
          // 确保最终位置精确
          robot.x = endX;
          robot.y = endY;
          this.render();
          resolve();
        }
      };
      
      animate();
    });
  }
  
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
  
  onAnimationComplete() {
    this.animationState.isPlaying = false;
    
    // 更新按钮状态
    this.elements.playAnimationBtn.disabled = true;
    this.elements.pauseAnimationBtn.disabled = true;
    this.elements.replayAnimationBtn.disabled = false;
    this.elements.applyMoveBtn.disabled = false;
    this.elements.animationProgress.textContent = '动画完成';
    
    this.showMessage('动画播放完成！可以选择重播或应用移动', 'success');
  }
  
  applyMove() {
    if (!this.currentSolution || !this.currentTarget) return;
    
    // 应用移动到游戏状态
    this.game.executeRound(
      this.currentTarget.id,
      this.currentSolution.robot.color,
      this.currentSolution.result.path,
      this.currentSolution.result.steps
    );
    
    // 重新渲染
    this.render();
    
    // 更新状态
    this.updateGameState();
    
    // 清除选择和解决方案
    this.selectedTarget = null;
    this.currentSolution = null;
    this.currentTarget = null;
    this.elements.solutionPanel.style.display = 'none';
    this.elements.solveBtn.disabled = true;
    
    this.showMessage('移动已应用！', 'success');
  }
  
  displaySolution(solution) {
    const { robot, result } = solution;
    const path = result.path;
    
    // 显示解决方案面板
    this.elements.solutionPanel.style.display = 'block';
    
    // 生成简洁版（箭头列表）
    this.displaySimpleSolution(robot, path);
    
    // 生成完整版（详细步骤）
    this.displayDetailedSolution(robot, path);
  }
  
  displaySimpleSolution(robot, path) {
    const directionArrows = {
      'up': '↑',
      'down': '↓',
      'left': '←',
      'right': '→'
    };
    
    const html = `
      <div class="solution-summary">
        <strong>${robot.color}棋子</strong> - 共 ${path.length} 步
      </div>
      <div class="solution-simple">
        ${path.map((move) => `
          <div class="arrow-step ${move.robotColor}">
            ${directionArrows[move.direction] || '?'}
          </div>
        `).join('')}
      </div>
    `;
    
    this.elements.simpleSolution.innerHTML = html;
  }
  
  displayDetailedSolution(robot, path) {
    const directionNames = {
      'up': '向上',
      'down': '向下',
      'left': '向左',
      'right': '向右'
    };
    
    const directionArrows = {
      'up': '↑',
      'down': '↓',
      'left': '←',
      'right': '→'
    };
    
    const colorNames = {
      'red': '红色',
      'yellow': '黄色',
      'blue': '蓝色',
      'green': '绿色'
    };
    
    const html = `
      <div class="solution-summary">
        完整移动路径
      </div>
      <div class="solution-detailed">
        ${path.map((move, index) => {
          const segments = move.segments || [];
          const segmentsInfo = segments.length > 0 
            ? segments.map(seg => 
                `(${seg.from.x},${seg.from.y}) → (${seg.to.x},${seg.to.y})`
              ).join(' → ')
            : `(${move.from.x},${move.from.y}) → (${move.to.x},${move.to.y})`;
          
          return `
            <div class="step-item">
              <div class="step-header">
                步骤 ${index + 1}: <strong>${colorNames[move.robotColor]}棋子</strong> ${directionNames[move.direction]} ${directionArrows[move.direction]}
              </div>
              <div class="step-info">
                起点: (${move.from.x}, ${move.from.y})<br>
                终点: (${move.to.x}, ${move.to.y})
                ${segments.length > 1 ? `<br>路径: ${segmentsInfo}` : ''}
                ${segments.length > 1 ? '<br><em>（遇到分光镜折射）</em>' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    this.elements.detailedSolution.innerHTML = html;
  }
  
  // updateStats 方法已移除，因为统计面板已被隐藏
  
  updateHistory(state) {
    if (state.rounds.length === 0) {
      this.elements.historyList.innerHTML = '<div class="loading">暂无历史记录</div>';
      return;
    }
    
    const html = state.rounds.map(round => `
      <div class="history-item">
        <div class="history-round">
          第${round.roundNumber}轮 - ${round.steps}步
        </div>
        <div class="history-detail">
          ${round.robotColor}棋子: (${round.startPosition.x},${round.startPosition.y}) → (${round.endPosition.x},${round.endPosition.y})<br>
          终点: ${round.targetInfo.shape} ${round.targetInfo.color}
        </div>
      </div>
    `).join('');
    
    this.elements.historyList.innerHTML = html;
  }
  
  resetGame() {
    if (!this.game) return;
    
    this.game.reset();
    this.selectedTarget = null;
    this.currentSolution = null;
    
    this.render();
    this.updateGameState();
    
    this.elements.solveBtn.disabled = true;
    
    this.showMessage('游戏已重置', 'info');
  }
  
  showMessage(message, type = 'info') {
    const html = `<div class="status-message ${type}">${message}</div>`;
    this.elements.statusMessage.innerHTML = html;
    
    // 3秒后自动清除（success和info消息）
    if (type !== 'error') {
      setTimeout(() => {
        this.elements.statusMessage.innerHTML = '';
      }, 3000);
    }
  }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  new RicochetRobotsApp();
});

