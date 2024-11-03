const NODE_SIZE = 100;
const ICON_SIZE = 75;
const LABEL_OFFSET_Y = 90;
const ICON_MARGIN = 20;

let nodes = {};
let dataParticles = [];
let regularFont;
let titleFont;
let icons = {};
let failureController;

class ServiceState {
  constructor(id, serviceNode, connectionNode, siloNode) {
    this.id = id;
    this.serviceNode = serviceNode;
    this.connectionNode = connectionNode;
    this.siloNode = siloNode;
    this.status = 'active';
    
  
    this.opacity = 1;             
    this.consumeLineOpacity = 1;  
    this.enrichLineOpacity = 1;   
    this.siloOpacity = 1;         
    
  
    this.serviceLabelOpacity = 1; 
    this.consumeLabelOpacity = 1; 
    this.enrichLabelOpacity = 1;  
    this.siloLabelOpacity = 1;    
    
  
    this.failureStage = 0;
    this.restorationSubStage = 0;
    this.fadeStartTime = 0;
    this.dispersingParticles = [];
    
  
    this.consumeConnection = {
      start: nodes.doi,
      end: serviceNode
    };
  }
    reset() {
    this.status = 'active';
  
    this.opacity = 1;
    this.consumeLineOpacity = 1;
    this.enrichLineOpacity = 1;
    this.siloOpacity = 1;
    
  
    this.serviceLabelOpacity = 1;
    this.consumeLabelOpacity = 1;
    this.enrichLabelOpacity = 1;
    this.siloLabelOpacity = 1;
    
  
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
          this.connectionNode.start.x, 
          this.connectionNode.start.y,
          this.connectionNode.end.x, 
          this.connectionNode.end.y
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
class FailureController {
  constructor() {
    this.serviceStates = [];
    this.lastFailureTime = 0;
    this.lastFailedServiceId = null;
    this.failureInterval = this.getRandomInterval();
    this.FADE_DURATION = 1000;
    this.RESTORE_DELAY = 2000;
    
  
    this.RESTORE_SERVICE_DURATION = 250;
    this.RESTORE_CONSUME_DURATION = 250;
    this.RESTORE_ENRICH_DURATION = 200;
    this.RESTORE_SILO_DURATION = 200;
  }
    initialize(nodes) {
    for (let i = 1; i <= 3; i++) {
      this.serviceStates.push(
        new ServiceState(
          i,
          nodes[`service${i}`],
          {start: nodes[`service${i}`], end: nodes[`enriched${i}`]},
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
      
    
      state.opacity = fadeProgress;
      state.serviceLabelOpacity = fadeProgress;
      
    
      state.consumeLineOpacity = fadeProgress;
      state.consumeLabelOpacity = fadeProgress;
      state.enrichLineOpacity = fadeProgress;
      state.enrichLabelOpacity = fadeProgress;
      
      if (elapsedTime >= this.FADE_DURATION) {
        state.failureStage = 1;
        state.fadeStartTime = currentTime;
      }
    }
  
    else if (state.failureStage === 1) {
      state.siloOpacity = constrain(map(elapsedTime, 0, this.FADE_DURATION, 1, 0), 0, 1);
      state.siloLabelOpacity = state.siloOpacity;
      
      if (elapsedTime >= this.FADE_DURATION) {
        this.createDispersionEffect(state);
        state.failureStage = 2;
        state.fadeStartTime = currentTime;
        state.restorationSubStage = 0;
      }
    }
  
    else if (state.failureStage === 2) {
      if (elapsedTime < this.RESTORE_DELAY) return;
      
      const restorationTime = elapsedTime - this.RESTORE_DELAY;
      
    
      if (state.restorationSubStage === 0) {
        const progress = constrain(map(restorationTime, 0, this.RESTORE_SERVICE_DURATION, 0, 1), 0, 1);
        state.opacity = progress;
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
        
        if (restorationTime >= this.RESTORE_SERVICE_DURATION + this.RESTORE_CONSUME_DURATION + this.RESTORE_ENRICH_DURATION) {
          state.restorationSubStage = 3;
        }
      }
    
      else if (state.restorationSubStage === 3) {
        const progress = constrain(map(restorationTime - this.RESTORE_SERVICE_DURATION - this.RESTORE_CONSUME_DURATION - this.RESTORE_ENRICH_DURATION,
                                     0, this.RESTORE_SILO_DURATION, 0, 1), 0, 1);
        state.siloOpacity = progress;
        state.siloLabelOpacity = progress;
        
        if (restorationTime >= this.RESTORE_SERVICE_DURATION + this.RESTORE_CONSUME_DURATION + this.RESTORE_ENRICH_DURATION + this.RESTORE_SILO_DURATION) {
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
        new DispersingParticle(state.siloNode.x, state.siloNode.y)
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

  draw(opacity = 1, labelOpacity = 1) {
    this.glowEffects.forEach(effect => effect.draw());
    
    push();
    
    // Shadow
    noStroke();
    fill(0, 0, 0, 20 * opacity);
    rect(this.x - NODE_SIZE/2 + 2, this.y - NODE_SIZE/2 + 2, NODE_SIZE, NODE_SIZE, 15);
    strokeWeight(2);
    
    if (this.iconKey === 'service' || this.iconKey === 'enrich') {
      // Service and Enriched stroke and fill colors
      stroke(59, 28, 50, 255 * opacity);
      fill(232, 217, 227, 255 * opacity);
    } else if (this.iconKey === 'validation') {
      // Validation node stroke and fill colors
      stroke(41, 71, 96, 255 * opacity);
      fill(0, 175, 181, 255 * opacity);
    } else if (this.iconKey === 'depositor') {
      // Creator node stroke and fill colors
      stroke(41, 71, 96, 255 * opacity);
      fill(0, 175, 181, 255 * opacity);
    } else if (this.iconKey === 'metadata') {
      // DOI Metadata node stroke and fill colors
      stroke(14, 121, 178, 255 * opacity);
      fill(217, 232, 247, 255 * opacity);
    }

    const fillStyle = drawingContext.fillStyle;
    fill(fillStyle);
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
}

class Particle {
  constructor(startNode) {
    this.x = startNode.x;
    this.y = startNode.y;
    this.stage = 0;
  
    const failingServices = failureController.getFailingServiceIds();
    let availableServices = [0, 1, 2].filter(id => !failingServices.includes(id + 1));
    
  
    this.targetService = availableServices.length > 0 ? 
      availableServices[floor(random(availableServices.length))] : 
      null;
    
    this.progress = 0;
    this.color = color(14, 121, 178, 180);
    this.size = 10;
  }
    update() {
    this.progress += 0.02;
    
    if (this.progress >= 1) {
      this.progress = 0;
      this.stage++;
      
    
      if (this.stage === 1 && (
        this.targetService === null || 
        failureController.getFailingServiceIds().includes(this.targetService + 1)
      )) {
        this.stage = 3;
      }
      
      if (this.stage === 2) {
        this.color = color(59, 28, 50, 180);
      } else if (this.stage === 3) {
        this.color = color(59, 28, 50, 180);
      }
    }
    
    this.updatePosition();
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
    }
  }
    draw() {
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
  
  nodes.enriched1 = new Node(1100, 200, 'enriched', 'Enriched\nSilo A', 'enrich');
  nodes.enriched2 = new Node(1100, 400, 'enriched', 'Enriched\nSilo B', 'enrich');
  nodes.enriched3 = new Node(1100, 600, 'enriched', 'Enriched\nSilo C', 'enrich');
  
    failureController = new FailureController();
  failureController.initialize(nodes);
}
function drawConnections() {
  push();

  for (let i = 0; i < 1; i += 0.02) {
    let alpha = 150 * (1 - i);
    stroke(200, 210, 220, alpha);
    strokeWeight(5 - (3 * i));
    
  
    line(nodes.depositor.x, nodes.depositor.y, nodes.doi.x, nodes.doi.y);
  }
  
    failureController.serviceStates.forEach(state => {
    state.drawConnections(state.opacity);
  });
  
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
  text("Produces", (nodes.depositor.x + nodes.doi.x) / 2, nodes.depositor.y - 20);
  text("Consumes", (nodes.doi.x + nodes.service2.x) / 2, nodes.doi.y - 20);
  
    failureController.serviceStates.forEach(state => {
  
    fill(100, 100, 100, state.enrichLabelOpacity * 255);
    const serviceNode = state.serviceNode;
    const enrichedNode = state.siloNode;
    text("Enriches", (serviceNode.x + enrichedNode.x) / 2, serviceNode.y - 20);
  });
  
  pop();
}
function draw() {
  const canvasContainer = document.getElementById('canvas-container');
  const oldSvgs = canvasContainer.querySelectorAll('svg');
  oldSvgs.forEach(svg => svg.remove());
  background(252, 253, 255);
  
    failureController.update(millis());
  
    push();
  textFont(titleFont);
  textAlign(LEFT, TOP);
  fill(60);
  textSize(48);
  text("Current Model", 40, 40);
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
    
    if (p.stage >= 3) {
      dataParticles.splice(i, 1);
    }
  }
  
    Object.values(nodes).forEach(node => {
    const failedService = failureController.serviceStates.find(
      state => (state.serviceNode === node || state.siloNode === node) && state.status === 'failing'
    );
    
    if (failedService) {
      if (failedService.serviceNode === node) {
      
        node.draw(failedService.opacity, failedService.serviceLabelOpacity);
      } else if (failedService.siloNode === node) {
      
        node.draw(failedService.siloOpacity, failedService.siloLabelOpacity);
      }
    } else {
    
      node.draw(1, 1);
    }
  });
  
    failureController.serviceStates.forEach(state => {
    state.updateParticles();
    state.drawParticles();
  });
}
function imageLoadError(err) {
  console.warn('Error loading image:', err);
}