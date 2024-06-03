const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

class Entity {
  constructor(x, y, color) {
    this.position = new Vector(x, y);
    this.color = color || "black";
  }
}

class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(vector) {
    if (!(vector instanceof Vector)) {
      console.error("Vector.add called with non-Vector argument:", vector);
      return;
    }
    this.x += vector.x;
    this.y += vector.y;
    return this;
  }

  subtract(vector) {
    if (!(vector instanceof Vector)) {
      console.error("Vector.subtract called with non-Vector argument:", vector);
      return;
    }
    this.x -= vector.x;
    this.y -= vector.y;
    return this;
  }

  multiply(scalar) {
    if (typeof scalar !== "number") {
      console.error(
        "Vector.multiply called with non-numeric argument:",
        scalar
      );
      return new Vector(this.x, this.y);
    }
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  copy() {
    return new Vector(this.x, this.y);
  }
}

class StaticObject extends Entity {
  constructor(x, y, width, height, rotation, color) {
    super(x, y, color);
    this.width = width;
    this.height = height;
    this.rotation = (rotation / 180) * Math.PI;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }

  checkCollision(other) {
    if (other instanceof Body) {
      let distX = Math.abs(other.position.x - this.position.x);
      let distY = Math.abs(other.position.y - this.position.y);

      let halfWidth = this.width / 2;
      let halfHeight = this.height / 2;

      if (
        distX > halfWidth + other.radius ||
        distY > halfHeight + other.radius
      ) {
        return;
      }

      if (distX <= halfWidth || distY <= halfHeight) {
        other.velocity.x *= -1 * other.bounceFactor;
        other.velocity.y *= -1 * other.bounceFactor;
        return;
      }

      let cornerDistance_sq =
        (distX - halfWidth) * (distX - halfWidth) +
        (distY - halfHeight) * (distY - halfHeight);

      if (cornerDistance_sq <= other.radius * other.radius) {
        other.velocity.x *= -1 * other.bounceFactor;
        other.velocity.y *= -1 * other.bounceFactor;
      }
    }
  }
}

class Body extends Entity {
  constructor(x, y, radius, mass, bounceFactor, color) {
    super(x, y, color);
    this.velocity = new Vector(0, 0);
    this.acceleration = new Vector(0, 0);
    this.radius = radius;
    this.mass = mass;
    this.isBeingDragged = false;
    this.previousPosition = new Vector(x, y);
    this.bounceFactor = bounceFactor || 0.8;
  }

  applyForce(force) {
    let f = new Vector(force.x * this.mass, force.y * this.mass);
    this.acceleration.add(f);
  }

  update() {
    this.applyForce(gravity);
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.acceleration.multiply(0);

    this.checkBorderCollision();
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();
  }

  checkCollision(other) {
    if (other instanceof Body) {
      let distX = other.position.x - this.position.x;
      let distY = other.position.y - this.position.y;
      let distance = Math.sqrt(distX * distX + distY * distY);

      if (distance < this.radius + other.radius) {
        let normal = new Vector(distX / distance, distY / distance);
        let tangent = new Vector(-normal.y, normal.x);

        let dpTan1 = this.velocity.x * tangent.x + this.velocity.y * tangent.y;
        let dpTan2 =
          other.velocity.x * tangent.x + other.velocity.y * tangent.y;
        let dpNorm1 = this.velocity.x * normal.x + this.velocity.y * normal.y;
        let dpNorm2 = other.velocity.x * normal.x + other.velocity.y * normal.y;

        let m1 =
          (dpNorm1 * (this.mass - other.mass) + 2.0 * other.mass * dpNorm2) /
          (this.mass + other.mass);
        let m2 =
          (dpNorm2 * (other.mass - this.mass) + 2.0 * this.mass * dpNorm1) /
          (this.mass + other.mass);

        this.velocity.x = tangent.x * dpTan1 + normal.x * m1;
        this.velocity.y = tangent.y * dpTan1 + normal.y * m1;
        other.velocity.x = tangent.x * dpTan2 + normal.x * m2;
        other.velocity.y = tangent.y * dpTan2 + normal.y * m2;

        let overlap = this.radius + other.radius - distance;
        let correction = normal.multiply(overlap / 2);
        this.position.subtract(correction);
        other.position.add(correction);
      }
    } else if (other instanceof StaticObject) {
      other.checkCollision(this);
    }
  }

  checkBorderCollision() {
    if (this.position.x + this.radius > canvas.width) {
      this.position.x = canvas.width - this.radius;
      this.velocity.x *= -1 * this.bounceFactor;
    }
    if (this.position.x - this.radius < 0) {
      this.position.x = this.radius;
      this.velocity.x *= -1 * this.bounceFactor;
    }
    if (this.position.y + this.radius > canvas.height) {
      this.position.y = canvas.height - this.radius;
      this.velocity.y *= -1 * this.bounceFactor;
    }
    if (this.position.y - this.radius < 0) {
      this.position.y = this.radius;
      this.velocity.y *= -1 * this.bounceFactor;
    }
  }

  isUnderCursor(x, y) {
    let distX = x - this.position.x;
    let distY = y - this.position.y;
    let distance = Math.sqrt(distX * distX + distY * distY);
    return distance < this.radius;
  }
}

let entities = [];
let G = 0.9;
const gravity = new Vector(0, G);

const gravityInput = document.getElementById("gravity");

gravityInput.value = G;

gravityInput.addEventListener("input", (event) => {
  G = parseFloat(event.target.value);
  gravity.y = G;
});

const spawnButton = document.getElementById("spawn");
spawnButton.addEventListener("click", () => {
  let x = Math.random() * canvas.width;
  let y = Math.random() * canvas.height;
  let radius = Math.random() * 20 + 10;
  let mass = radius * 0.1;
  let bounceFactor = Math.random() * 0.5 + 0.5;
  let color = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${
    Math.random() * 255
  })`;
  entities.push(new Body(x, y, radius, mass, bounceFactor, color));
  entities[entities.length - 1].applyForce(
    new Vector(Math.random() * 10 - 5, Math.random() * 10 - 5)
  );
});

const clearButton = document.getElementById("clear");
clearButton.addEventListener("click", () => {
  entities = [];
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  for (let i = 0; i < entities.length; i++) {
    if (entities[i] instanceof Body && entities[i].isUnderCursor(x, y)) {
      entities.splice(i, 1);
      break;
    }
  }
});

function init() {
  for (let i = 0; i < 50; i++) {
    let x = Math.random() * canvas.width;
    let y = Math.random() * canvas.height;
    let radius = Math.random() * 20 + 10;
    let mass = radius * 0.1;
    let bounceFactor = Math.random() * 0.5 + 0.5;
    let color = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${
      Math.random() * 255
    })`;
    entities.push(new Body(x, y, radius, mass, bounceFactor, color));
    entities[entities.length - 1].applyForce(
      new Vector(Math.random() * 10 - 5, Math.random() * 10 - 5)
    );
  }
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < entities.length; i++) {
    entities[i] instanceof Body && entities[i].update();
    entities[i].draw();
    for (let j = i + 1; j < entities.length; j++) {
      entities[i].checkCollision(entities[j]);
    }
  }

  requestAnimationFrame(update);
}

init();
update();
