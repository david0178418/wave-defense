## SimpleECS

SimpleECS is a lightweight Entity-Component-System (ECS) architecture designed for game development. It provides an efficient way to organize game logic through composition rather than inheritance.

### Core Concepts

- **Entities**: Game objects represented by a unique ID
- **Components**: Data containers attached to entities (position, health, etc.)
- **Systems**: Logic that processes entities with specific components
- **Events**: Communication mechanism between systems

### Getting Started

#### Creating a SimpleECS

First, define your component types interface:

```typescript
interface GameComponents {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  health: { current: number; max: number };
  // Add more component types as needed
}
```

Then create a game:

```typescript
import SimpleECS from "./simple-ecs";

const game = new SimpleECS<GameComponents>();
```

#### Working with Entities

Create entities and add components to them:

```typescript
// Create a new entity
const entityId = game.createEntity();

// Add components
game.addComponent(entityId, 'position', { x: 10, y: 20 })
     .addComponent(entityId, 'health', { current: 100, max: 100 });

// Get component data
const position = game.getComponent(entityId, 'position');
console.log(position); // { x: 10, y: 20 }

// Remove component
game.removeComponent(entityId, 'position');

// Remove entity
game.removeEntity(entityId);
```

#### Creating Systems

Systems process entities with specific components:

```typescript
// Create a movement system
game.addSystem({
  label: "MovementSystem",
  with: ['position', 'velocity'],  // Required components
  without: ['frozen'],             // Excluded components
  process(entities, deltaTime, entityManager) {
    for (const entity of entities) {
      const pos = entity.components.position;
      const vel = entity.components.velocity;
      
      // Update position based on velocity and delta time
      entityManager.addComponent(entity.id, 'position', {
        x: pos.x + vel.x * deltaTime,
        y: pos.y + vel.y * deltaTime
      });
    }
  }
});

// Update all systems (typically called in game loop)
game.update(1/60); // 60 FPS
```

### Event System

SimpleECS includes a pub/sub event system for communication between systems:

```typescript
// Define event types
interface GameEvents {
  collision: { entity1Id: number; entity2Id: number };
  healthChanged: { entityId: number; oldValue: number; newValue: number };
  // Add more events as needed
}

// Create game with events
const game = new SimpleECS<GameComponents, GameEvents>();
const eventBus = game.getEventBus();

// Subscribe to an event
eventBus.subscribe('healthChanged', (data) => {
  console.log(`Entity ${data.entityId} health changed from ${data.oldValue} to ${data.newValue}`);
});

// One-time subscription
eventBus.once('collision', (data) => {
  console.log(`One-time collision between ${data.entity1Id} and ${data.entity2Id}`);
});

// Publish an event
eventBus.publish('healthChanged', {
  entityId: playerId,
  oldValue: 100,
  newValue: 90
});

// Clear event subscriptions
eventBus.clearEvent('collision');  // Clear specific event
eventBus.clear();                  // Clear all events
```

### System Event Handlers

Systems can have dedicated event handlers:

```typescript
game.addSystem({
  label: "DamageSystem",
  eventHandlers: {
    collision: {
      handler: (data, eventBus, entityManager) => {
        // Handle collision event
        const entity1Health = entityManager.getComponent(data.entity1Id, 'health');
        if (entity1Health) {
          const newHealth = Math.max(0, entity1Health.current - 10);
          
          // Update health
          entityManager.addComponent(data.entity1Id, 'health', {
            ...entity1Health,
            current: newHealth
          });
          
          // Publish follow-up event
          eventBus.publish('healthChanged', {
            entityId: data.entity1Id,
            oldValue: entity1Health.current,
            newValue: newHealth
          });
        }
      }
    }
  }
});
```

### System Lifecycle Hooks

Systems can use lifecycle hooks:

```typescript
game.addSystem({
  label: "LifecycleSystem",
  onAttach: (eventBus) => {
    // Called when system is added to game
    console.log("System attached");
  },
  onDetach: (eventBus) => {
    // Called when system is removed from game
    console.log("System detached");
  }
});

// Remove system
game.removeSystem("LifecycleSystem");
```

### Advanced Entity Queries

Get entities with specific components:

```typescript
// Get entities with both position and velocity components
const movingEntities = game.entityManager.getEntitiesWithComponents(
  ['position', 'velocity']
);

// Get entities with position but without health
const props = game.entityManager.getEntitiesWithComponents(
  ['position'],
  ['health']
);
```

This project was created using `bun init` in bun v1.2.4. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.