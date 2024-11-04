
const NODE_SIZE = 100;
const ICON_SIZE = 75;
const LABEL_OFFSET_Y = 90;
const ICON_MARGIN = 20;
const VERTICAL_SPACING = 160;

let nodes = {};
let icons = {};
let regularFont;

const PARTICLE_SIZE = 10;
const TRAIL_MIN_SIZE = 3;
const TRAIL_MAX_SIZE = 8;
const TRAIL_LENGTH = 20;
const TRAIL_SPAWN_RATE = 0.2;
const COLLISION_ZONE_RADIUS = 20;
const DISPERSION_PARTICLE_COUNT = { MIN: 2, MAX: 5 };
const DISPERSION_VELOCITY = {
  X: { MIN: -3, MAX: 2 },
  Y: { MIN: -3, MAX: -1 }
};
const DISPERSION_LIFETIME = 255;
const DISPERSION_DECAY = 20;
const COLORS = {
  REGISTRY: [14, 121, 178],
  DEPOSITOR: [0, 175, 181],
  SERVICE: [59, 28, 50],
  VALIDATION: [253, 194, 33]
};

let particlePool = [];
let collisionPoints = {};

function preload() {
  const loadSvg = (url, name) => {
    fetch(url)
      .then(response => response.text())
      .then(svgData => {
        const container = document.createElement('div');
        container.innerHTML = svgData;
        const svgElement = container.querySelector('svg');
        
        svgElement.setAttribute('width', ICON_SIZE);
        svgElement.setAttribute('height', ICON_SIZE);
        
        icons[name] = svgElement;
      })
      .catch(err => console.error(`Error loading ${name}:`, err));
  };

  loadSvg('icons/depositor.svg', 'depositor');
  loadSvg('icons/metadata.svg', 'metadata');
  loadSvg('icons/service.svg', 'service');
  loadSvg('icons/validation.svg', 'validation');
}

class Node {
  constructor(x, y, label, iconKey) {
    this.x = x;
    this.y = y;
    this.label = label;
    this.iconKey = iconKey;
    this.particles = [];
  }

  draw(opacity = 1, labelOpacity = 1) {
    push();
    
    noStroke();
    fill(0, 0, 0, 20 * opacity);
    rect(this.x - NODE_SIZE/2 + 2, this.y - NODE_SIZE/2 + 2, NODE_SIZE, NODE_SIZE, 15);
    
    strokeWeight(2);
    
    // Node background and stroke colors
    if (this.iconKey === 'metadata') {
      stroke(14, 121, 178, 255 * opacity);
      fill(217, 232, 247, 255 * opacity);
    } else if (this.iconKey === 'depositor') {
      stroke(41, 71, 96, 255 * opacity);
      fill(0, 175, 181, 255 * opacity);
    } else if (this.iconKey === 'service') {
      stroke(59, 28, 50, 255 * opacity);
      fill(232, 217, 227, 255 * opacity);
    } else if (this.iconKey === 'validation') {
      stroke(14, 121, 178, 255 * opacity);
      fill(217, 232, 247, 255 * opacity);
    }
    
    rect(this.x - NODE_SIZE/2, this.y - NODE_SIZE/2, NODE_SIZE, NODE_SIZE, 15);

    if (this.iconKey && icons[this.iconKey]) {
      const svg = icons[this.iconKey].cloneNode(true);
      const canvas = document.querySelector('#canvas-container canvas');
      const canvasRect = canvas.getBoundingClientRect();
      
      svg.style.position = 'absolute';
      svg.style.left = `${canvasRect.left + this.x - ICON_SIZE/2}px`;
      svg.style.top = `${canvasRect.top + this.y - ICON_SIZE/2}px`;
      svg.style.pointerEvents = 'none';
      svg.style.opacity = opacity;
      
      const iconId = `icon-${this.iconKey}-${this.x}-${this.y}`;
      if (!document.getElementById(iconId)) {
        svg.id = iconId;
        document.getElementById('canvas-container').appendChild(svg);
      }
    }

    noStroke();
    fill(80, 255 * labelOpacity);
    textAlign(CENTER, CENTER);
    textFont(regularFont);
    textStyle(BOLD);
    textSize(16);
    text(this.label, this.x, this.y + LABEL_OFFSET_Y);
    
    pop();
  }
}


class DispersingParticle {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.velocity = createVector(
      random(DISPERSION_VELOCITY.X.MIN, DISPERSION_VELOCITY.X.MAX),
      random(DISPERSION_VELOCITY.Y.MIN, DISPERSION_VELOCITY.Y.MAX)
    );
    this.acceleration = createVector(0, 0.2);
    this.lifetime = DISPERSION_LIFETIME;
    this.size = random(TRAIL_MIN_SIZE, TRAIL_MAX_SIZE);
    this.originalSize = this.size;
  }

  update() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.lifetime -= DISPERSION_DECAY;
    this.size = map(this.lifetime, DISPERSION_LIFETIME, 0, this.originalSize, 0);
    return this.lifetime > 0;
  }

  draw() {
    push();
    noStroke();
    const fadeAlpha = map(this.lifetime, DISPERSION_LIFETIME, 0, 255, 0);
    
    for (let i = 1; i >= 0; i -= 0.2) {
      let size = this.size * (1 + i);
      let alpha = fadeAlpha * i*2;
      fill(COLORS.REGISTRY[0], COLORS.REGISTRY[1], COLORS.REGISTRY[2], alpha);
      ellipse(this.position.x, this.position.y, size, size);
    }
    pop();
  }
}

class TrailParticle {
  constructor(x, y, size, color, opacity) {
    this.init(x, y, size, color, opacity);
  }

  init(x, y, size, color, opacity) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.opacity = opacity;
    this.decay = 0.05;
  }

  update() {
    this.opacity -= this.decay;
    return this.opacity > 0;
  }

  draw() {
    push();
    noStroke();
    const alpha = this.opacity * 255;
    fill(this.color[0], this.color[1], this.color[2], alpha);
    ellipse(this.x, this.y, this.size);
    pop();
  }
}

function getTrailParticle(x, y, size, color, opacity) {
  let particle = particlePool.pop();
  if (particle) {
    particle.init(x, y, size, color, opacity);
  } else {
    particle = new TrailParticle(x, y, size, color, opacity);
  }
  return particle;
}

function recycleParticle(particle) {
  particlePool.push(particle);
}


class Particle {
  constructor(start, end, status) {
    this.pos = createVector(start.x, start.y);
    this.start = start;
    this.end = end;
    this.progress = 0;
    this.status = status;
    this.isDead = false;
    this.size = PARTICLE_SIZE;
    this.trail = [];
    this.trailCounter = 0;
    this.stage = 0;
    this.path = this.determinePath();
    this.returnPath = random() < 0.5 ? 'top' : 'bottom';
    this.color = COLORS.REGISTRY;
    this.hasCollided = false;
    this.dispersingParticles = [];
  }

  determinePath() {
    if (this.start === nodes.depositor) {
      return 'depositor';
    } else if (this.start === nodes.registry) {
      return 'outbound';
    } else if ([nodes.community, nodes.service].includes(this.start)) {
      return 'validation';
    }
    return 'return';
  }

  updateTrail() {
    if (this.path === 'return' && !this.hasCollided) {
      this.trailCounter++;
      if (this.trailCounter >= 1 / TRAIL_SPAWN_RATE) {
        const trailSize = random(TRAIL_MIN_SIZE, TRAIL_MAX_SIZE);
        const trail = getTrailParticle(this.pos.x, this.pos.y, trailSize, COLORS.REGISTRY, 0.8);
        this.trail.push(trail);
        this.trailCounter = 0;
      }
    }

    for (let i = this.trail.length - 1; i >= 0; i--) {
      if (!this.trail[i].update()) {
        recycleParticle(this.trail[i]);
        this.trail.splice(i, 1);
      }
    }
  }

  checkCollision() {
    if (this.hasCollided || this.path !== 'return') return false;
    
    const collisionPoint = collisionPoints[this.returnPath];
    const d = dist(this.pos.x, this.pos.y, collisionPoint.x, collisionPoint.y);
    
    if (d < COLLISION_ZONE_RADIUS) {
      this.hasCollided = true;
      this.createDispersionEffect();
      return true;
    }
    return false;
  }

  createDispersionEffect() {
    const particleCount = floor(random(
      DISPERSION_PARTICLE_COUNT.MIN,
      DISPERSION_PARTICLE_COUNT.MAX
    ));
    
    for (let i = 0; i < particleCount; i++) {
      this.dispersingParticles.push(
        new DispersingParticle(this.pos.x, this.pos.y)
      );
    }
  }

  updateDispersionParticles() {
    for (let i = this.dispersingParticles.length - 1; i >= 0; i--) {
      if (!this.dispersingParticles[i].update()) {
        this.dispersingParticles.splice(i, 1);
      }
    }
    
    if (this.hasCollided && this.dispersingParticles.length === 0) {
      this.isDead = true;
    }
  }

  update() {
    if (this.hasCollided) {
      this.updateDispersionParticles();
      return;
    }

    this.progress += 0.02;
    
    switch(this.path) {
      case 'depositor':
        this.updateDepositorPath();
        break;
      case 'outbound':
        this.updateOutboundPath();
        break;
      case 'validation':
        this.updateValidationPath();
        break;
      case 'return':
        this.updateReturnPath();
        break;
    }

    this.updateTrail();
    this.checkCollision();
  }

  updateDepositorPath() {
    let t = this.easeInOutQuad(this.progress);
    this.pos.x = lerp(this.start.x, nodes.registry.x, t);
    this.pos.y = lerp(this.start.y, nodes.registry.y, t);
    
    if (this.progress >= 1) {
      this.isDead = true;
    }
  }

  updateOutboundPath() {
    let t = this.easeInOutQuad(this.progress);
    this.pos.x = lerp(this.start.x, this.end.x, t);
    this.pos.y = lerp(this.start.y, this.end.y, t);
    
    if (this.progress >= 1) {
      let newParticle = new Particle(this.end, nodes.validation, this.status);
      newParticle.path = 'validation';
      newParticle.color = COLORS.REGISTRY;
      if (this.end === nodes.community) {
        nodes.community.particles.push(newParticle);
      } else {
        nodes.service.particles.push(newParticle);
      }
      this.isDead = true;
    }
  }

  updateValidationPath() {
    let t = this.easeInOutQuad(this.progress);
    this.pos.x = lerp(this.start.x, nodes.validation.x, t);
    this.pos.y = lerp(this.start.y, nodes.validation.y, t);
    
    if (this.progress >= 1) {
      let returnParticle = new Particle(nodes.validation, nodes.registry, this.status);
      returnParticle.path = 'return';
      returnParticle.returnPath = this.returnPath;
      returnParticle.color = COLORS.REGISTRY;
      nodes.validation.particles.push(returnParticle);
      this.isDead = true;
    }
  }

  updateReturnPath() {
    if (this.hasCollided) return;
    
    let t = this.easeInOutQuad(this.progress);
    let centerX = (nodes.validation.x + nodes.registry.x) / 2;
    let centerY = nodes.validation.y;
    let arcWidth = nodes.validation.x - nodes.registry.x;
    let arcHeight = 400;
    
    let angle;
    if (this.returnPath === 'top') {
      angle = map(t, 0, 1, 0, -PI);
    } else {
      angle = map(t, 0, 1, 0, PI);
    }
    
    this.pos.x = centerX + (arcWidth/2 * cos(angle));
    this.pos.y = centerY + (arcHeight/2 * sin(angle));
    
    if (this.progress >= 1) {
      this.isDead = true;
    }
  }

  draw() {
    this.trail.forEach(particle => particle.draw());
    
    if (this.hasCollided) {
      this.dispersingParticles.forEach(particle => particle.draw());
      return;
    }
    
    push();
    noStroke();
    const fadeAlpha = map(this.progress, 0, 1, 255, 200);
    
    for (let i = 1; i >= 0; i -= 0.2) {
      let size = this.size * (1 + i);
      let alpha = fadeAlpha * i;
      fill(this.color[0], this.color[1], this.color[2], alpha);
      ellipse(this.pos.x, this.pos.y, size, size);
    }
    pop();
  }

  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}


function setup() {
  let canvas = createCanvas(1400, 600);
  canvas.parent("canvas-container");
  regularFont = 'Montserrat';
  textFont(regularFont);
  smooth();
  
  nodes.depositor = new Node(350, 300, "Original\nDepositor", 'depositor');
  nodes.registry = new Node(600, 300, "DOI\nRegistry", 'metadata');
  nodes.community = new Node(810, 180, "Community\nMembers", 'depositor');
  nodes.service = new Node(810, 380, "Service", 'service');
  nodes.validation = new Node(1000, 300, "Identifies\nImprovements", 'validation');

  const centerX = (nodes.validation.x + nodes.registry.x) / 2;
  const centerY = nodes.validation.y;
  const arcWidth = nodes.validation.x - nodes.registry.x;
  const arcHeight = 400;

  const collisionAngle = PI/3;
  
  collisionPoints = {
    top: createVector(
      centerX + (arcWidth/2 * cos(-collisionAngle)),
      centerY + (arcHeight/2 * sin(-collisionAngle))
    ),
    bottom: createVector(
      centerX + (arcWidth/2 * cos(collisionAngle)),
      centerY + (arcHeight/2 * sin(collisionAngle))
    )
  };
}

function drawConnections() {
  push();
  for (let i = 0; i < 1; i += 0.02) {
    let alpha = 150 * (1 - i);
    strokeWeight(5 - (3 * i));
    stroke(200, 210, 220, alpha);
    
    line(nodes.depositor.x, nodes.depositor.y, nodes.registry.x, nodes.registry.y);
    
    line(nodes.registry.x, nodes.registry.y, nodes.community.x, nodes.community.y);
    line(nodes.registry.x, nodes.registry.y, nodes.service.x, nodes.service.y);
    
    line(nodes.community.x, nodes.community.y, nodes.validation.x, nodes.validation.y);
    line(nodes.service.x, nodes.service.y, nodes.validation.x, nodes.validation.y);
  }
  
  drawReturnPaths();
  pop();
}

function drawReturnPaths() {
  push();
  stroke(200, 210, 220, 150);
  strokeWeight(3);
  
  let centerX = (nodes.validation.x + nodes.registry.x) / 2;
  let centerY = nodes.validation.y;
  let arcWidth = nodes.validation.x - nodes.registry.x;
  let arcHeight = 400;
  
  let steps = 30;
  
  for (let t = 0; t <= steps; t++) {
    let progress = t / steps;
    let angle = map(progress, 0, 1, 0, -PI);
    let x = centerX + (arcWidth/2 * cos(angle));
    let y = centerY + (arcHeight/2 * sin(angle));
    ellipse(x, y, 4, 4);
  }
  
  for (let t = 0; t <= steps; t++) {
    let progress = t / steps;
    let angle = map(progress, 0, 1, 0, PI);
    let x = centerX + (arcWidth/2 * cos(angle));
    let y = centerY + (arcHeight/2 * sin(angle));
    ellipse(x, y, 4, 4);
  }

  push();
  noStroke();
  ellipse(collisionPoints.top.x, collisionPoints.top.y, 10, 10);
  ellipse(collisionPoints.bottom.x, collisionPoints.bottom.y, 10, 10);
  stroke(0,0,0, 300);
  strokeWeight(3);
  const xSize = 25;
  line(collisionPoints.top.x - xSize/2, collisionPoints.top.y - xSize/2,
       collisionPoints.top.x + xSize/2, collisionPoints.top.y + xSize/2);
  line(collisionPoints.top.x + xSize/2, collisionPoints.top.y - xSize/2,
       collisionPoints.top.x - xSize/2, collisionPoints.top.y + xSize/2);
  line(collisionPoints.bottom.x - xSize/2, collisionPoints.bottom.y - xSize/2,
       collisionPoints.bottom.x + xSize/2, collisionPoints.bottom.y + xSize/2);
  line(collisionPoints.bottom.x + xSize/2, collisionPoints.bottom.y - xSize/2,
       collisionPoints.bottom.x - xSize/2, collisionPoints.bottom.y + xSize/2);
  pop();
  pop();
}

function drawLabels() {
  push();
  textAlign(CENTER);
  textSize(12);
  textStyle(BOLD);
  fill(100, 100, 100);
  text("Creates", 
       (nodes.depositor.x + nodes.registry.x)/2, 
       nodes.depositor.y - 20);
       
  text("Consumes", 
       (nodes.community.x + nodes.registry.x)/2, 
       nodes.community.y + 115);
       
  text("Proposes",
       nodes.validation.x + 90,
       nodes.validation.y);

  text("Does not own",
     nodes.community.x + 90,
     nodes.community.y-100);

  text("Does not own",
     nodes.service.x + 90,
     nodes.service.y+150);
  
  textAlign(LEFT, TOP);
  textSize(48);
  textStyle(NORMAL);
  fill(60);
  text("Current Model", 40, 40);
  pop();
}

function draw() {
  const canvasContainer = document.getElementById('canvas-container');
  const oldSvgs = canvasContainer.querySelectorAll('svg');
  oldSvgs.forEach(svg => svg.remove());
  
  background(252, 253, 255);
  
  drawConnections();
  drawLabels();
  
  if (random() < 0.05) {
    nodes.depositor.particles.push(
      new Particle(nodes.depositor, nodes.registry, 'success')
    );
  }
  if (random() < 0.02) {
    nodes.registry.particles.push(
      new Particle(nodes.registry, nodes.community, 'outbound')
    );
  }
  if (random() < 0.02) {
    nodes.registry.particles.push(
      new Particle(nodes.registry, nodes.service, 'outbound')
    );
  }
  Object.values(nodes).forEach(node => {
    for (let i = node.particles.length - 1; i >= 0; i--) {
      let particle = node.particles[i];
      particle.update();
      particle.draw();
      if (particle.isDead) {
        node.particles.splice(i, 1);
      }
    }
  });
  Object.values(nodes).forEach(node => node.draw());
}