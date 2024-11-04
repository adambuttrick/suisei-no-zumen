// Configuration constants
const CONFIG = {
  CANVAS: {
    WIDTH: 1200,
    HEIGHT: 600
  },
  NODES: {
    SIZE: 100,
    CORNER_RADIUS: 15
  },
  PARTICLES: {
    BASE_SIZE: 10,
    ENRICHED_SIZE: 12,
    SPAWN_RATE: 0.05
  },
  COLORS: {
    BACKGROUND: [252, 253, 255],
    PARTICLE: [65, 145, 215],
    ENRICHED: [255, 128, 128],
    TEXT: [80, 80, 80]
  }
};

// Core classes
class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.stage = 0;
    this.targetService = Math.floor(random(3));
    this.progress = 0;
    this.color = color(CONFIG.COLORS.PARTICLE[0], CONFIG.COLORS.PARTICLE[1], CONFIG.COLORS.PARTICLE[2], 180);
    this.size = CONFIG.PARTICLES.BASE_SIZE;
  }

  update() {
    this.progress += 0.02;
    
    if (this.progress >= 1) {
      this.progress = 0;
      this.stage++;
      
      if (this.stage === 2) {
        this.color = color(CONFIG.COLORS.ENRICHED[0], CONFIG.COLORS.ENRICHED[1], CONFIG.COLORS.ENRICHED[2], 180);
        this.size = CONFIG.PARTICLES.ENRICHED_SIZE;
      }
    }
    
    this._updatePosition();
  }

  _updatePosition() {
    if (this.stage === 0) {
      this.x = lerp(nodes.depositor.x, nodes.doi.x, this.progress);
      this.y = lerp(nodes.depositor.y, nodes.doi.y, this.progress);
    } else if (this.stage === 1) {
      let targetY = nodes.service1.y + (this.targetService * 150);
      let progress = this._easeInOutQuad(this.progress);
      this.x = lerp(nodes.doi.x, nodes.service1.x, progress);
      this.y = lerp(nodes.doi.y, targetY, progress);
    } else if (this.stage === 2) {
      let sourceY = nodes.service1.y + (this.targetService * 150);
      let targetY = nodes.enriched1.y + (this.targetService * 150);
      let progress = this._easeInOutQuad(this.progress);
      this.x = lerp(nodes.service1.x, nodes.enriched1.x, progress);
      this.y = lerp(sourceY, targetY, progress);
    }
  }

  _easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  draw() {
    for (let i = 1; i >= 0; i -= 0.2) {
      let size = this.size * (1 + i);
      let alpha = 255 * i;
      fill(red(this.color), green(this.color), blue(this.color), alpha);
      noStroke();
      ellipse(this.x, this.y, size, size);
    }
  }
}

class GraphicsManager {
  constructor() {
    this.regularFont = null;
    this.titleFont = null;
  }

  setFonts(regular, title) {
    this.regularFont = regular;
    this.titleFont = title;
  }

  drawTitle() {
    textFont(this.titleFont);
    textAlign(LEFT, TOP);
    fill(60);
    text("Current Model", 40, 40);
  }

  drawConnections() {
    for (let i = 0; i < 1; i += 0.02) {
      let alpha = 150 * (1 - i);
      stroke(200, 210, 220, alpha);
      strokeWeight(5 - (3 * i));
      
      // Main connections
      line(nodes.depositor.x, nodes.depositor.y, nodes.doi.x, nodes.doi.y);
      line(nodes.doi.x, nodes.doi.y, nodes.service1.x, nodes.service1.y);
      line(nodes.doi.x, nodes.doi.y, nodes.service2.x, nodes.service2.y);
      line(nodes.doi.x, nodes.doi.y, nodes.service3.x, nodes.service3.y);
      
      // Service to Enriched connections
      line(nodes.service1.x, nodes.service1.y, nodes.enriched1.x, nodes.enriched1.y);
      line(nodes.service2.x, nodes.service2.y, nodes.enriched2.x, nodes.enriched2.y);
      line(nodes.service3.x, nodes.service3.y, nodes.enriched3.x, nodes.enriched3.y);
    }
  }

  drawRelationshipLabels() {
    textFont(this.regularFont);
    textAlign(CENTER, BOTTOM);
    fill(100);
    noStroke();
    
    // Label between Depositor and DOI
    let midX = (nodes.depositor.x + nodes.doi.x) / 2;
    let midY = nodes.depositor.y - 20;
    text("Produces", midX, midY);
    
    // Label between DOI and Services
    let doiToServiceX = (nodes.doi.x + nodes.service2.x) / 2;
    text("Consumes", doiToServiceX, midY);
    
    // Labels between Services and Enriched
    let serviceToEnrichedX = (nodes.service1.x + nodes.enriched1.x) / 2;
    text("Enriches", serviceToEnrichedX, nodes.service1.y - 20);
    text("Enriches", serviceToEnrichedX, nodes.service2.y - 20);
    text("Enriches", serviceToEnrichedX, nodes.service3.y - 20);
  }

  drawNodesAndLabels() {
    textFont(this.regularFont);
    textAlign(CENTER, CENTER);
    
    // Draw node shadows
    this._drawNodeShadows();
    
    // Draw Depositor node
    this._drawDepositorNode();
    
    // Draw DOI node
    this._drawDOINode();
    
    // Draw Service nodes
    this._drawServiceNodes();
    
    // Draw Enriched nodes
    this._drawEnrichedNodes();
  }

  _drawNodeShadows() {
    noStroke();
    fill(0, 0, 0, 20);
    
    // Service and Enriched node shadows
    for (let i = 0; i < 3; i++) {
      rect(
        nodes.service1.x - CONFIG.NODES.SIZE/2 + 2,
        nodes.service1.y - CONFIG.NODES.SIZE/2 + 2 + (i * 150),
        CONFIG.NODES.SIZE,
        CONFIG.NODES.SIZE,
        CONFIG.NODES.CORNER_RADIUS
      );
      rect(
        nodes.enriched1.x - CONFIG.NODES.SIZE/2 + 2,
        nodes.enriched1.y - CONFIG.NODES.SIZE/2 + 2 + (i * 150),
        CONFIG.NODES.SIZE,
        CONFIG.NODES.SIZE,
        CONFIG.NODES.CORNER_RADIUS
      );
    }
    
    // Depositor shadow
    rect(
      nodes.depositor.x - CONFIG.NODES.SIZE/2 + 2,
      nodes.depositor.y - CONFIG.NODES.SIZE/2 + 2,
      CONFIG.NODES.SIZE,
      CONFIG.NODES.SIZE,
      CONFIG.NODES.CORNER_RADIUS
    );
    
    // DOI shadow
    ellipse(
      nodes.doi.x + 2,
      nodes.doi.y + 2,
      CONFIG.NODES.SIZE + 2,
      CONFIG.NODES.SIZE + 2
    );
  }

  _drawDepositorNode() {
    stroke(51);
    strokeWeight(2);
    fill(255);
    rect(
      nodes.depositor.x - CONFIG.NODES.SIZE/2,
      nodes.depositor.y - CONFIG.NODES.SIZE/2,
      CONFIG.NODES.SIZE,
      CONFIG.NODES.SIZE,
      CONFIG.NODES.CORNER_RADIUS
    );
    fill(CONFIG.COLORS.TEXT[0]);
    noStroke();
    text("Object\nCreator", nodes.depositor.x, nodes.depositor.y);
  }

  _drawDOINode() {
    stroke(51);
    fill(255);
    ellipse(nodes.doi.x, nodes.doi.y, CONFIG.NODES.SIZE, CONFIG.NODES.SIZE);
    fill(CONFIG.COLORS.TEXT[0]);
    noStroke();
    text("DOI\nMetadata", nodes.doi.x, nodes.doi.y);
  }

  _drawServiceNodes() {
    for (let i = 0; i < 3; i++) {
      stroke(51);
      fill(255);
      rect(
        nodes.service1.x - CONFIG.NODES.SIZE/2,
        nodes.service1.y - CONFIG.NODES.SIZE/2 + (i * 150),
        CONFIG.NODES.SIZE,
        CONFIG.NODES.SIZE,
        CONFIG.NODES.CORNER_RADIUS
      );
      fill(CONFIG.COLORS.TEXT[0]);
      noStroke();
      text("Service " + String.fromCharCode(65 + i), nodes.service1.x, nodes.service1.y + (i * 150));
    }
  }

  _drawEnrichedNodes() {
    for (let i = 0; i < 3; i++) {
      stroke(CONFIG.COLORS.ENRICHED[0], CONFIG.COLORS.ENRICHED[1], CONFIG.COLORS.ENRICHED[2]);
      fill(255, 245, 245);
      rect(
        nodes.enriched1.x - CONFIG.NODES.SIZE/2,
        nodes.enriched1.y - CONFIG.NODES.SIZE/2 + (i * 150),
        CONFIG.NODES.SIZE,
        CONFIG.NODES.SIZE,
        CONFIG.NODES.CORNER_RADIUS
      );
      fill(CONFIG.COLORS.TEXT[0]);
      noStroke();
      text("Enriched\nSilo " + String.fromCharCode(65 + i), nodes.enriched1.x, nodes.enriched1.y + (i * 150));
    }
  }
}

// Global variables
let nodes = {};
let dataParticles = [];
let graphicsManager;
let regularFont;
let titleFont;

function preload() {
  // Load fonts
  regularFont = 'Arial';
  titleFont ='Arial';
}

function setup() {
  createCanvas(CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);
  smooth();
  
  // Initialize graphics manager
  graphicsManager = new GraphicsManager();
  graphicsManager.setFonts(regularFont, titleFont);
  
  // Initialize node positions
  nodes.depositor = {x: 150, y: 300};
  nodes.doi = {x: 450, y: 300};
  nodes.service1 = {x: 750, y: 150};
  nodes.service2 = {x: 750, y: 300};
  nodes.service3 = {x: 750, y: 450};
  nodes.enriched1 = {x: 1050, y: 150};
  nodes.enriched2 = {x: 1050, y: 300};
  nodes.enriched3 = {x: 1050, y: 450};
}

function draw() {
  // Set background
  background(CONFIG.COLORS.BACKGROUND[0], CONFIG.COLORS.BACKGROUND[1], CONFIG.COLORS.BACKGROUND[2]);
  
  // Draw visualization elements
  graphicsManager.drawTitle();
  graphicsManager.drawConnections();
  graphicsManager.drawRelationshipLabels();
  
  // Create new particles
  if (random(1) < CONFIG.PARTICLES.SPAWN_RATE) {
    dataParticles.push(new Particle(nodes.depositor.x, nodes.depositor.y));
  }
  
  // Update and draw particles
  for (let i = dataParticles.length - 1; i >= 0; i--) {
    let p = dataParticles[i];
    p.update();
    p.draw();
    
    if (p.stage >= 3) {
      dataParticles.splice(i, 1);
    }
  }
  
  // Draw nodes and labels
  graphicsManager.drawNodesAndLabels();
}