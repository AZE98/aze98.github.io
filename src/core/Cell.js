/**
 * Cell 格子类
 * 表示棋盘上的一个格子
 */

export class Cell {
  /**
   * @param {number} x - x坐标
   * @param {number} y - y坐标
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
    
    // 墙壁状态
    this.walls = {
      top: false,
      right: false,
      bottom: false,
      left: false
    };
    
    // 格子上的元素
    this.prism = null;   // Prism对象或null
    this.target = null;  // Target对象或null
  }
  
  /**
   * 检查指定方向是否有墙
   * @param {string} direction - 方向 ('top', 'right', 'bottom', 'left')
   * @returns {boolean}
   */
  hasWall(direction) {
    return this.walls[direction] === true;
  }
  
  /**
   * 设置墙壁
   * @param {string} direction - 方向
   * @param {boolean} value - 是否有墙
   */
  setWall(direction, value) {
    this.walls[direction] = value;
  }
  
  /**
   * 设置多个墙壁
   * @param {Array<string>} sides - 方向数组
   */
  setWalls(sides) {
    sides.forEach(side => {
      this.walls[side] = true;
    });
  }
  
  /**
   * 设置分光镜
   * @param {Prism} prism - 分光镜对象
   */
  setPrism(prism) {
    this.prism = prism;
  }
  
  /**
   * 设置终点
   * @param {Target} target - 终点对象
   */
  setTarget(target) {
    this.target = target;
  }
  
  /**
   * 检查格子是否为空（没有分光镜和终点）
   * @returns {boolean}
   */
  isEmpty() {
    return this.prism === null && this.target === null;
  }
  
  /**
   * 检查格子是否有分光镜
   * @returns {boolean}
   */
  hasPrism() {
    return this.prism !== null;
  }
  
  /**
   * 检查格子是否有终点
   * @returns {boolean}
   */
  hasTarget() {
    return this.target !== null;
  }
  
  /**
   * 清空格子
   */
  clear() {
    this.prism = null;
    this.target = null;
  }
  
  /**
   * 获取格子的字符串表示
   * @returns {string}
   */
  toString() {
    const elements = [];
    if (this.prism) elements.push('Prism');
    if (this.target) elements.push('Target');
    return `Cell(${this.x},${this.y})[${elements.join(',')}]`;
  }
  
  /**
   * 克隆格子
   * @returns {Cell}
   */
  clone() {
    const cell = new Cell(this.x, this.y);
    cell.walls = { ...this.walls };
    cell.prism = this.prism;  // 浅拷贝引用
    cell.target = this.target;
    return cell;
  }
}

export default Cell;

