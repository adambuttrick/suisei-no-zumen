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
class ServiceState {
  constructor(id, serviceNode, enrichmentNode) {
    this.id = id;
    this.serviceNode = serviceNode;
    this.enrichmentNode = enrichmentNode;
    this.status = 'active';
    
  
    this.serviceOpacity = 1;             
    this.enrichmentOpacity = 1;   
    this.consumeLineOpacity = 1;  
    this.enrichLineOpacity = 1;   
    this.proposesLineOpacity = 1;
    
  
    this.serviceLabelOpacity = 1; 
    this.enrichmentLabelOpacity = 1;  
    this.consumeLabelOpacity = 1; 
    this.enrichLabelOpacity = 1;  
    
  
    this.failureStage = 0;
    this.restorationSubStage = 0;
    this.fadeStartTime = 0;
    this.dispersingParticles = [];
    
  
    this.consumeConnection = {
      start: nodes.doi,
      end: serviceNode
    };
    this.enrichConnection = {
      start: serviceNode,
      end: enrichmentNode
    };
  }
    reset() {
    this.status = 'active';
    this.serviceOpacity = 1;
    this.enrichmentOpacity = 1;
    this.consumeLineOpacity = 1;
    this.enrichLineOpacity = 1;
    this.proposesLineOpacity = 1;
    this.serviceLabelOpacity = 1;
    this.enrichmentLabelOpacity = 1;
    this.consumeLabelOpacity = 1;
    this.enrichLabelOpacity = 1;
    this.failureStage = 0;
    this.restorationSubStage = 0;
    this.fadeStartTime = 0;
    this.dispersingParticles = [];
  }
    drawConnections() {
    push();
    for (let i = 0; i < 1; i += 0.02) {
      let alpha = 150 * (1 - i);
      strokeWeight(5 - (3 * i));
      
      if (this.consumeLineOpacity > 0) {
        stroke(200, 210, 220, alpha * this.consumeLineOpacity);
        line(
          this.consumeConnection.start.x, 
          this.consumeConnection.start.y,
          this.consumeConnection.end.x, 
          this.consumeConnection.end.y
        );
      }
      
      if (this.enrichLineOpacity > 0) {
        stroke(200, 210, 220, alpha * this.enrichLineOpacity);
        line(
          this.enrichConnection.start.x, 
          this.enrichConnection.start.y,
          this.enrichConnection.end.x, 
          this.enrichConnection.end.y
        );
      }

      if (this.proposesLineOpacity > 0) {
        stroke(200, 210, 220, alpha * this.proposesLineOpacity);
        line(
          this.enrichmentNode.x,
          this.enrichmentNode.y,
          nodes.validation.x,
          nodes.validation.y
        );
      }
    }
    pop();
  }
    updateParticles() {
    for (let i = this.dispersingParticles.length - 1; i >= 0; i--) {
      const particle = this.dispersingParticles[i];
      particle.update();
      
      if (particle.isDead()) {
        this.dispersingParticles.splice(i, 1);
      }
    }
  }
    drawParticles() {
    this.dispersingParticles.forEach(particle => particle.draw());
  }
}
class FailureManager {
  constructor() {
    this.serviceStates = [];
    this.lastFailureTime = 0;
    this.lastFailedServiceId = null;
    this.failureInterval = this.getRandomInterval();
    this.FADE_DURATION = 1000;
    this.RESTORE_DELAY = 1000;
    this.RESTORE_SERVICE_DURATION = 150;
    this.RESTORE_CONSUME_DURATION = 150;
    this.RESTORE_ENRICH_DURATION = 150;
    this.RESTORE_ENRICHMENT_DURATION = 150;
    this.DISPERSION_DELAY = 500;
  }
    initialize() {
    for (let i = 1; i <= 3; i++) {
      this.serviceStates.push(
        new ServiceState(
          i,
          nodes[`service${i}`],
          nodes[`enriched${i}`]
        )
      );
    }
  }
    getRandomInterval() {
    return random(5000, 15000);
  }
    update(currentTime) {
    if (currentTime - this.lastFailureTime > this.failureInterval && 
        !this.serviceStates.some(state => state.status === 'failing')) {
      this.triggerFailure();
      this.lastFailureTime = currentTime;
      this.failureInterval = this.getRandomInterval();
    }
    
    this.serviceStates.forEach(state => this.updateServiceState(state, currentTime));
  }
    triggerFailure() {
    const activeServices = this.serviceStates.filter(state => 
      state.status === 'active' && state.id !== this.lastFailedServiceId
    );
    
    if (activeServices.length === 0) {
      this.lastFailureTime = millis();
      return;
    }
    
    const serviceToFail = random(activeServices);
    serviceToFail.status = 'failing';
    serviceToFail.fadeStartTime = millis();
    this.lastFailedServiceId = serviceToFail.id;
  }
    updateServiceState(state, currentTime) {
    if (state.status !== 'failing') return;
    
    const elapsedTime = currentTime - state.fadeStartTime;
    
    
    if (state.failureStage === 0) {
      const fadeProgress = constrain(map(elapsedTime, 0, this.FADE_DURATION, 1, 0), 0, 1);
      state.consumeLineOpacity = fadeProgress;
      state.consumeLabelOpacity = fadeProgress;
      state.enrichLineOpacity = fadeProgress;
      state.enrichLabelOpacity = fadeProgress;
      state.proposesLineOpacity = fadeProgress;  
      
      if (elapsedTime >= this.FADE_DURATION) {
        state.failureStage = 1;
        state.fadeStartTime = currentTime;
      }
    }
    
    else if (state.failureStage === 1) {
      const fadeProgress = constrain(map(elapsedTime, 0, this.FADE_DURATION, 1, 0), 0, 1);
      state.serviceOpacity = fadeProgress;
      state.serviceLabelOpacity = fadeProgress;
      
      if (elapsedTime >= this.FADE_DURATION) {
        state.failureStage = 2;
        state.fadeStartTime = currentTime;
      }
    }
    
    else if (state.failureStage === 2) {
      const fadeProgress = constrain(map(elapsedTime, 0, this.FADE_DURATION, 1, 0), 0, 1);
      state.enrichmentOpacity = fadeProgress;
      state.enrichmentLabelOpacity = fadeProgress;
      
      if (elapsedTime >= this.FADE_DURATION && !state.hasDispersed) {
        state.hasDispersed = true;
        this.createDispersionEffect(state);
        setTimeout(() => {
          state.failureStage = 3;  
          state.fadeStartTime = millis();
          state.restorationSubStage = 0;
          state.hasDispersed = false;
        }, this.DISPERSION_DELAY);
      }
    }
    
    else if (state.failureStage === 3) {
      if (elapsedTime < this.RESTORE_DELAY) return;
      
      const restorationTime = elapsedTime - this.RESTORE_DELAY;
      
      
      if (state.restorationSubStage === 0) {
        const progress = constrain(map(restorationTime, 0, this.RESTORE_SERVICE_DURATION, 0, 1), 0, 1);
        state.serviceOpacity = progress;
        state.serviceLabelOpacity = progress;
        
        if (restorationTime >= this.RESTORE_SERVICE_DURATION) {
          state.restorationSubStage = 1;
          state.fadeStartTime = currentTime;
        }
      }
      
      else if (state.restorationSubStage === 1) {
        const progress = constrain(map(restorationTime - this.RESTORE_SERVICE_DURATION,
                                     0, this.RESTORE_CONSUME_DURATION, 0, 1), 0, 1);
        state.consumeLineOpacity = progress;
        state.consumeLabelOpacity = progress;
        
        if (restorationTime >= this.RESTORE_SERVICE_DURATION + this.RESTORE_CONSUME_DURATION) {
          state.restorationSubStage = 2;
        }
      }
      
      else if (state.restorationSubStage === 2) {
        const progress = constrain(map(restorationTime - this.RESTORE_SERVICE_DURATION - this.RESTORE_CONSUME_DURATION,
                                     0, this.RESTORE_ENRICH_DURATION, 0, 1), 0, 1);
        state.enrichLineOpacity = progress;
        state.enrichLabelOpacity = progress;
        state.enrichmentOpacity = progress;
        state.enrichmentLabelOpacity = progress;
        state.proposesLineOpacity = progress;  
        
        if (restorationTime >= this.RESTORE_SERVICE_DURATION + this.RESTORE_CONSUME_DURATION + this.RESTORE_ENRICH_DURATION) {
          state.reset();
        }
      }
    }
  }
    getFailingServiceIds() {
    return this.serviceStates
      .filter(state => state.status === 'failing' && state.failureStage >= 0)
      .map(state => state.id);
  }
    createDispersionEffect(state) {
    const particleCount = random(15, 20);
    for (let i = 0; i < particleCount; i++) {
      state.dispersingParticles.push(
        new DispersingParticle(state.enrichmentNode.x, state.enrichmentNode.y)
      );
    }
  }
}

class DispersingParticle {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.velocity = createVector(
      random(-3, 3),
      random(-5, -2)
    );
    this.acceleration = createVector(0, 0.2);
    this.lifetime = 255;
    this.size = random(3, 8);
    this.originalSize = this.size;
  }
    update() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.lifetime -= 4;
    this.size = map(this.lifetime, 255, 0, this.originalSize, 0);
  }
    draw() {
    push();
    noStroke();
    const fadeAlpha = map(this.lifetime, 255, 0, 255, 0);
    fill(59, 28, 50, fadeAlpha);
    
  
    for (let i = 1; i >= 0; i -= 0.2) {
      let size = this.size * (1 + i);
      let alpha = fadeAlpha * i;
      fill(59, 28, 50, alpha);
      ellipse(this.position.x, this.position.y, size, size);
    }
    pop();
  }
    isDead() {
    return this.lifetime <= 0 || this.position.y > height;
  }
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

  draw(opacity = 1, labelOpacity = 1) {
    this.glowEffects.forEach(effect => effect.draw());
    
    push();
    
    noStroke();
    fill(0, 0, 0, 20 * opacity);
    rect(this.x - NODE_SIZE/2 + 2, this.y - NODE_SIZE/2 + 2, NODE_SIZE, NODE_SIZE, 15);

    strokeWeight(2);
    
    if (this.iconKey === 'service' || this.iconKey === 'enrich') {
      // Service and Enriched nodes stroke and fill colors
      stroke(59, 28, 50, 255 * opacity);
      fill(232, 217, 227, 255 * opacity);
    } else if (this.iconKey === 'validation') {
      // Validation node stroke and fill colors
      stroke(253, 162, 33, 255 * opacity);
      fill(252, 219, 128, 255 * opacity);
    } else if (this.iconKey === 'depositor') {
      // Creator node stroke and fill colors
      stroke(41, 71, 96, 255 * opacity);
      fill(0, 175, 181, 255 * opacity);
    } else if (this.iconKey === 'metadata') {
      // DOI Metadata node stroke and fill colors
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
    this.targetService = this.selectInitialService();
    this.progress = 0;
    this.color = color(14, 121, 178, 180);
    this.size = 10;
    this.returnPath = random() < 0.5 ? 'top' : 'bottom';
    this.isDiscarded = false;
    this.trail = [];
    this.trailCounter = 0;
    this.velocity = { x: 0, y: 0 };
  }
    selectInitialService() {
    const availableServices = [0, 1, 2].filter(id => {
      const serviceState = failureManager.serviceStates[id];
      return serviceState && serviceState.status === 'active';
    });
    
    return availableServices.length > 0 ? 
      random(availableServices) : 
      floor(random(3));
  }
    findNewTarget() {
    const availableServices = [0, 1, 2].filter(id => {
      const serviceState = failureManager.serviceStates[id];
      return serviceState && serviceState.status === 'active';
    });
    
    if (availableServices.length > 0) {
    
      const otherServices = availableServices.filter(id => id !== this.targetService);
      this.targetService = random(otherServices.length > 0 ? otherServices : availableServices);
      this.progress = 0;
    } else {
    
      this.isDiscarded = true;
      this.stage = 4;
      this.progress = 0;
      this.color = color(200, 200, 200, 180);
    }
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
    
  
    if (this.stage === 1 || this.stage === 2) {
      const serviceState = failureManager.serviceStates[this.targetService];
      if (serviceState && serviceState.status === 'failing') {
        this.findNewTarget();
      }
    }
    
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

function drawConnections() {
  push();
  
    for (let i = 0; i < 1; i += 0.02) {
    let alpha = 150 * (1 - i);
    strokeWeight(5 - (3 * i));
    
  
    stroke(200, 210, 220, alpha);
    line(nodes.depositor.x, nodes.depositor.y, nodes.doi.x, nodes.doi.y);
    
  
    failureManager.serviceStates.forEach((state, index) => {
    
      stroke(200, 210, 220, alpha * state.consumeLineOpacity);
      line(nodes.doi.x, nodes.doi.y, nodes[`service${index + 1}`].x, nodes[`service${index + 1}`].y);
      
    
      stroke(200, 210, 220, alpha * state.enrichLineOpacity);
      line(nodes[`service${index + 1}`].x, nodes[`service${index + 1}`].y, 
           nodes[`enriched${index + 1}`].x, nodes[`enriched${index + 1}`].y);
           
    
      stroke(200, 210, 220, alpha * state.proposesLineOpacity);
      line(nodes[`enriched${index + 1}`].x, nodes[`enriched${index + 1}`].y, 
           nodes.validation.x, nodes.validation.y);
    });
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
  noStroke();
  
    fill(100, 100, 100);
  text("Creates", (nodes.depositor.x + nodes.doi.x) / 2, nodes.depositor.y - 25);
  text("Proposes", (nodes.enriched2.x + nodes.validation.x) / 2, nodes.validation.y - 25);
  text("Updates or\nRejects", nodes.validation.x + 100, nodes.validation.y);
  
    failureManager.serviceStates.forEach((state, index) => {
    fill(100, 100, 100, state.consumeLabelOpacity * 255);
    const serviceX = nodes[`service${index + 1}`].x;
    const serviceY = nodes[`service${index + 1}`].y;
    text("Consumes", (nodes.doi.x + serviceX) / 2, nodes.doi.y - 25);
  });
  
  pop();
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

  failureManager = new FailureManager();
  failureManager.initialize();
}

function draw() {
  const canvasContainer = document.getElementById('canvas-container');
  const oldSvgs = canvasContainer.querySelectorAll('svg');
  oldSvgs.forEach(svg => svg.remove());
  background(252, 253, 255);
  
    failureManager.update(millis());
  
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
  
    nodes.depositor.draw();
  nodes.doi.draw();
  nodes.validation.draw();
  
    failureManager.serviceStates.forEach((state, index) => {
    const serviceNode = nodes[`service${index + 1}`];
    const enrichmentNode = nodes[`enriched${index + 1}`];
    
    serviceNode.draw(state.serviceOpacity, state.serviceLabelOpacity);
    enrichmentNode.draw(state.enrichmentOpacity, state.enrichmentLabelOpacity);
    
  
    state.updateParticles();
    state.drawParticles();
  });
}