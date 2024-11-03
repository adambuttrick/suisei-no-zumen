const NODE_SIZE = 100;
const DISCARD_RATE = 3;
const DISCARD_ARC_HEIGHT = 300;
const DISCARD_DISTANCE = 400;
const ICON_SIZE = 75;
const LABEL_OFFSET_Y = 90;
const ICON_MARGIN = 20;
const TRAIL_LENGTH = 20;
const TRAIL_SPAWN_RATE = 0.2;
const TRAIL_MIN_SIZE = 3;
const TRAIL_MAX_SIZE = 8;
const GLOW_RADIUS = NODE_SIZE * 1;
const GLOW_DECAY_RATE = 0.05;

let nodes = {};
let dataParticles = [];
let particlePool = [];
let regularFont;
let titleFont;
let icons = {};


function imageLoadError(err) {
  console.warn('Error loading image:', err);
}


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

  loadSvg('./icons/metadata.svg', 'metadata');
  loadSvg('./icons/depositor.svg', 'depositor');
  loadSvg('./icons/service.svg', 'service');
  loadSvg('./icons/enrich.svg', 'enrich');
  loadSvg('./icons/validation.svg', 'validation');
}

class Node {
  constructor(x, y, type, label, iconKey) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.label = label;
    this.iconKey = iconKey;
    this.glowEffects = [];
  }

  addGlowEffect() {
    this.glowEffects.push(new GlowEffect(this.x, this.y));
  }

  updateGlowEffects() {
    for (let i = this.glowEffects.length - 1; i >= 0; i--) {
      if (!this.glowEffects[i].update()) {
        this.glowEffects.splice(i, 1);
      }
    }
  }

  draw() {
    this.glowEffects.forEach(effect => effect.draw());
    
    push();

    noStroke();
    fill(0, 0, 0, 20);
    if (this.type === 'circle') {
      ellipse(this.x + 2, this.y + 2, NODE_SIZE + 2);
    } else {
      rect(this.x - NODE_SIZE/2 + 2, this.y - NODE_SIZE/2 + 2, NODE_SIZE, NODE_SIZE, 15);
    }

    if (this.type === 'circle') {
      stroke(51);
      strokeWeight(2);
      fill(255);
      ellipse(this.x, this.y, NODE_SIZE);
    } else if (this.type === 'enriched') {
      stroke(59, 28, 50);
      strokeWeight(2);
      fill(232, 217, 227);
      rect(this.x - NODE_SIZE/2, this.y - NODE_SIZE/2, NODE_SIZE, NODE_SIZE, 15);
    } else if (this.type === 'validation') {
      strokeWeight(2);
      stroke(41, 71, 96);
      fill(0, 175, 181);
      rect(this.x - NODE_SIZE/2, this.y - NODE_SIZE/2, NODE_SIZE, NODE_SIZE, 15);
    } else {
      stroke(51);
      strokeWeight(2);
      fill(255);
      rect(this.x - NODE_SIZE/2, this.y - NODE_SIZE/2, NODE_SIZE, NODE_SIZE, 15);
    }

    if (this.iconKey && icons[this.iconKey]) {
      const svg = icons[this.iconKey].cloneNode(true);
      const canvas = document.querySelector('#canvas-container canvas');
      const canvasRect = canvas.getBoundingClientRect();
      
      svg.style.position = 'absolute';
      svg.style.left = `${canvasRect.left + this.x - ICON_SIZE/2}px`;
      svg.style.top = `${canvasRect.top + this.y - ICON_SIZE/2}px`;
      svg.style.pointerEvents = 'none';
      
      const iconId = `icon-${this.iconKey}-${this.x}-${this.y}`;
      if (!document.getElementById(iconId)) {
        svg.id = iconId;
        document.getElementById('canvas-container').appendChild(svg);
      }
    }
    noStroke();
    fill(80);
    textAlign(CENTER, CENTER);
    textFont(regularFont);
    textStyle(BOLD);
    textSize(16);
    text(this.label, this.x, this.y + LABEL_OFFSET_Y);
    pop();
    
    this.updateGlowEffects();
  }
}

class GlowEffect {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.intensity = 1.0;
    this.decayRate = GLOW_DECAY_RATE;
    this.radius = GLOW_RADIUS;
  }

  update() {
    this.intensity -= this.decayRate;
    return this.intensity > 0;
  }

  draw() {
    push();
    noStroke();
    const steps = 10;
    for (let i = steps; i > 0; i--) {
      const ratio = i / steps;
      const glowAlpha = this.intensity * ratio * 100;
      fill(252, 219, 128, glowAlpha);
      ellipse(this.x, this.y, this.radius * (2 - ratio));
    }
    pop();
  }
}

class TrailParticle {
  constructor(x, y, size, opacity, velocity) {
    this.init(x, y, size, opacity, velocity);
  }

  init(x, y, size, opacity, velocity) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.opacity = opacity;
    this.decay = 0.03;
    this.vx = velocity ? velocity.x * 0.3 : 0;
    this.vy = velocity ? velocity.y * 0.3 : 0;
  }

  update() {
    this.opacity -= this.decay;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
    return this.opacity > 0;
  }

  draw() {
    push();
    noStroke();
    fill(253, 162, 33, this.opacity * 255);
    ellipse(this.x, this.y, this.size);
    pop();
  }
}


function getTrailParticle(x, y, size, opacity, velocity) {
  let particle = particlePool.pop();
  if (particle) {
    particle.init(x, y, size, opacity, velocity);
  } else {
    particle = new TrailParticle(x, y, size, opacity, velocity);
  }
  return particle;
}

function recycleTrailParticle(particle) {
  particlePool.push(particle);
}


class Particle {
  constructor(startNode) {
    this.x = startNode.x;
    this.y = startNode.y;
    this.prevX = this.x;
    this.prevY = this.y;
    this.stage = 0;
    this.targetService = floor(random(3));
    this.progress = 0;
    this.color = color(14, 121, 178, 180);
    this.size = 10;
    this.returnPath = random() < 0.5 ? 'top' : 'bottom';
    this.isDiscarded = false;
    this.trail = [];
    this.trailCounter = 0;
    this.velocity = { x: 0, y: 0 };
  }

  updateVelocity() {
    this.velocity.x = this.x - this.prevX;
    this.velocity.y = this.y - this.prevY;
    this.prevX = this.x;
    this.prevY = this.y;
  }

  updateTrail() {
    if (this.stage === 4 && !this.isDiscarded) {
      this.trailCounter += 1;
      if (this.trailCounter >= 1 / TRAIL_SPAWN_RATE) {
        const speed = sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        const size = map(speed, 0, 10, TRAIL_MIN_SIZE, TRAIL_MAX_SIZE);
        const trailParticle = getTrailParticle(this.x, this.y, size, 0.8, this.velocity);
        this.trail.push(trailParticle);
        this.trailCounter = 0;
      }
    }

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const alive = this.trail[i].update();
      if (!alive) {
        recycleTrailParticle(this.trail[i]);
        this.trail.splice(i, 1);
      }
    }
  }

  update() {
    this.prevX = this.x;
    this.prevY = this.y;
    
    this.progress += 0.02;
    
    if (this.progress >= 1) {
      this.progress = 0;
      this.stage++;
      
      if (this.stage === 4) {
        this.isDiscarded = random(DISCARD_RATE) < 1;
        if (this.isDiscarded) {
          this.color = color(200, 200, 200, 180);
        }
      }
      
      if (this.stage === 2) {
        this.color = color(14, 121, 178, 180);
      } else if (this.stage === 3) {
        this.color = color(59, 28, 50, 180);
      } else if (this.stage === 4 && !this.isDiscarded) {
        this.color = color(253, 194, 33, 180);
      }
    }
    
    this.updatePosition();
    this.updateVelocity();
    this.updateTrail();

    if (this.stage === 4 && !this.isDiscarded) {
      const distToDOI = dist(this.x, this.y, nodes.doi.x, nodes.doi.y);
      if (distToDOI < NODE_SIZE/2) {
        nodes.doi.addGlowEffect();
      }
    }
  }

  updatePosition() {
    if (this.stage === 0) {
      this.x = lerp(nodes.depositor.x, nodes.doi.x, this.progress);
      this.y = lerp(nodes.depositor.y, nodes.doi.y, this.progress);
    } else if (this.stage === 1) {
      let targetY = nodes.service1.y + (this.targetService * 200);
      let progress = this.easeInOutQuad(this.progress);
      this.x = lerp(nodes.doi.x, nodes.service1.x, progress);
      this.y = lerp(nodes.doi.y, targetY, progress);
    } else if (this.stage === 2) {
      let sourceY = nodes.service1.y + (this.targetService * 200);
      let targetY = nodes.enriched1.y + (this.targetService * 200);
      this.x = lerp(nodes.service1.x, nodes.enriched1.x, this.progress);
      this.y = lerp(sourceY, targetY, this.progress);
    } else if (this.stage === 3) {
      let sourceY = nodes.enriched1.y + (this.targetService * 200);
      this.x = lerp(nodes.enriched1.x, nodes.validation.x, this.progress);
      this.y = lerp(sourceY, nodes.validation.y, this.progress);
    } else if (this.stage === 4) {
      if (this.isDiscarded) {
        this.updateDiscardedPosition();
      } else {
        this.updateReturnPosition();
      }
    }
  }

  updateDiscardedPosition() {
    let t = this.progress;
    let startX = nodes.validation.x;
    let startY = nodes.validation.y;
    let endX = startX + DISCARD_DISTANCE;
    let endY = startY;
    let controlX = startX + (DISCARD_DISTANCE / 2);
    let controlY = startY - DISCARD_ARC_HEIGHT;
    
    this.x = pow(1-t, 2) * startX + 
            2 * (1-t) * t * controlX + 
            pow(t, 2) * endX;
    this.y = pow(1-t, 2) * startY + 
            2 * (1-t) * t * controlY + 
            pow(t, 2) * endY;
            
    this.color = color(
      red(this.color),
      green(this.color),
      blue(this.color),
      180 * (1 - this.progress)
    );
  }

  updateReturnPosition() {
    let centerX = (nodes.validation.x + nodes.doi.x) / 2;
    let centerY = nodes.validation.y;
    let ellipseWidth = nodes.validation.x - nodes.doi.x;
    let ellipseHeight = 700;
    
    let startAngle = 0;
    let endAngle = this.returnPath === 'top' ? PI : -PI;
    let angle = map(this.progress, 0, 1, startAngle, endAngle);
    
    this.x = centerX + (ellipseWidth/2 * cos(angle));
    this.y = centerY + (ellipseHeight/2 * sin(angle));
  }

  draw() {
    this.trail.forEach(particle => particle.draw());
    push();
    for (let i = 1; i >= 0; i -= 0.2) {
      let size = this.size * (1 + i);
      let alpha = 255 * i;
      fill(red(this.color), green(this.color), blue(this.color), alpha);
      noStroke();
      ellipse(this.x, this.y, size, size);
    }
    pop();
  }

  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}


function setup() {
  let canvas = createCanvas(1400, 800);
  canvas.parent("canvas-container");
  smooth();
  
 
  textFont('Montserrat');
  regularFont = 'Montserrat';
  titleFont = 'Montserrat';
  
 
  nodes.depositor = new Node(200, 400, 'rect', 'Object\nCreator', 'depositor');
  nodes.doi = new Node(450, 400, 'rect', 'DOI\nMetadata', 'metadata');
  
 
  nodes.service1 = new Node(750, 200, 'rect', 'Service A', 'service');
  nodes.service2 = new Node(750, 400, 'rect', 'Service B', 'service');
  nodes.service3 = new Node(750, 600, 'rect', 'Service C', 'service');
  
 
  nodes.enriched1 = new Node(950, 200, 'enriched', 'Service A\nEnrichment', 'enrich');
  nodes.enriched2 = new Node(950, 400, 'enriched', 'Service B\nEnrichment', 'enrich');
  nodes.enriched3 = new Node(950, 600, 'enriched', 'Service C\nEnrichment', 'enrich');
  
 
  nodes.validation = new Node(1150, 400, 'validation', 'Community+\nRules-based\nValidation', 'validation');
}


function drawConnections() {
  push();
 
  for (let i = 0; i < 1; i += 0.02) {
    let alpha = 150 * (1 - i);
    stroke(200, 210, 220, alpha);
    strokeWeight(5 - (3 * i));
    
   
    line(nodes.depositor.x, nodes.depositor.y, nodes.doi.x, nodes.doi.y);
    line(nodes.doi.x, nodes.doi.y, nodes.service1.x, nodes.service1.y);
    line(nodes.doi.x, nodes.doi.y, nodes.service2.x, nodes.service2.y);
    line(nodes.doi.x, nodes.doi.y, nodes.service3.x, nodes.service3.y);
    
   
    line(nodes.service1.x, nodes.service1.y, nodes.enriched1.x, nodes.enriched1.y);
    line(nodes.service2.x, nodes.service2.y, nodes.enriched2.x, nodes.enriched2.y);
    line(nodes.service3.x, nodes.service3.y, nodes.enriched3.x, nodes.enriched3.y);
    
   
    line(nodes.enriched1.x, nodes.enriched1.y, nodes.validation.x, nodes.validation.y);
    line(nodes.enriched2.x, nodes.enriched2.y, nodes.validation.x, nodes.validation.y);
    line(nodes.enriched3.x, nodes.enriched3.y, nodes.validation.x, nodes.validation.y);
  }
  
 
  drawDottedReturnPath(true); 
  drawDottedReturnPath(false);
  pop();
}

function drawDottedReturnPath(isTop) {
  push();
  stroke(200, 210, 220, 150);
  strokeWeight(3);
  
  let startX = nodes.validation.x;
  let startY = nodes.validation.y;
  let endX = nodes.doi.x;
  let endY = nodes.doi.y;
  let centerX = (startX + endX) / 2;
  let centerY = nodes.validation.y;
  
  let ellipseWidth = startX - endX;
  let ellipseHeight = 700;
  
  let startAngle = 0;
  let endAngle = isTop ? PI : -PI;
  
  let steps = 30;
  for (let t = 0; t <= steps; t++) {
    let angle = map(t, 0, steps, startAngle, endAngle);
    let x = centerX + (ellipseWidth/2 * cos(angle));
    let y = centerY + (ellipseHeight/2 * sin(angle));
    ellipse(x, y, 4, 4);
  }
  pop();
}

function drawRelationshipLabels() {
  push();
  textStyle(BOLD);
  textSize(12);
  textFont(regularFont);
  textAlign(CENTER, CENTER);
  fill(100, 100, 100);
  noStroke();
  
 
  text("Creates", (nodes.depositor.x + nodes.doi.x) / 2, nodes.depositor.y - 25);
  text("Consumes", (nodes.doi.x + nodes.service2.x) / 2, nodes.doi.y - 25);
  text("Proposes", (nodes.enriched2.x + nodes.validation.x) / 2, nodes.validation.y - 25);
  text("Updates or\nRejects", nodes.validation.x + 100, nodes.validation.y);
  pop();
}

function draw() {
  const canvasContainer = document.getElementById('canvas-container');
  const oldSvgs = canvasContainer.querySelectorAll('svg');
  oldSvgs.forEach(svg => svg.remove());
  background(252, 253, 255);
  
  push();
  textFont(titleFont);
  textAlign(LEFT, TOP);
  fill(60);
  textSize(48);
  text("COMET Model", 40, 40);
  pop();
   
  drawConnections();
  
  drawRelationshipLabels();
  
  if (random() < 0.05) {
    dataParticles.push(new Particle(nodes.depositor));
  } 
 
  for (let i = dataParticles.length - 1; i >= 0; i--) {
    let p = dataParticles[i];
    p.update();
    p.draw();
    
    if (p.stage >= 5) {
      dataParticles.splice(i, 1);
    }
  }  
 
  Object.values(nodes).forEach(node => node.draw());
}