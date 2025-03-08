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

Systems process entities with specific components. There are two ways to create systems:

##### Using SystemBuilder (Recommended)

```typescript
import { createSystem } from "./simple-ecs";

// Create a movement system using the builder pattern
const movementSystem = createSystem('movement-system')
  .addEntityQuery('moving', {
    with: ['position', 'velocity'],  // Required components
    without: ['frozen']              // Excluded components
  })
  .setProcess((queries, deltaTime, entityManager, resourceManager, eventBus) => {
    // Type-safe access to query results
    const movingEntities = queries.moving;
    
    if (!movingEntities || movingEntities.length === 0) return;
    
    for (const entity of movingEntities) {
      const pos = entity.components.position;
      const vel = entity.components.velocity;
      
      // Update position based on velocity and delta time
      entityManager.addComponent(entity.id, 'position', {
        x: pos.x + vel.x * deltaTime,
        y: pos.y + vel.y * deltaTime
      });
    }
  });

// Add the system to the game
game.addSystem(movementSystem);

// Or add it directly using method chaining
game.addSystem(
  createSystem('collision-system')
    .addEntityQuery('collidable', {
      with: ['position', 'collider']
    })
    .setProcess((queries, deltaTime, entityManager) => {
      // Process collision logic
    })
);

// Update all systems (typically called in game loop)
game.update(1/60); // 60 FPS
```

##### Legacy System Definition (Deprecated)

```typescript
// Create a movement system (deprecated approach)
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
// Using SystemBuilder (Recommended)
game.addSystem(
  createSystem('damage-system')
    .setEventHandlers({
      collision: {
        handler: (data, entityManager, resourceManager, eventBus) => {
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
    })
);

// Legacy approach (deprecated)
game.addSystem({
  label: "DamageSystem",
  eventHandlers: {
    collision: {
      handler: (data, eventBus, entityManager) => {
        // Handle collision event
        // ...
      }
    }
  }
});
```

### System Lifecycle Hooks

Systems can use lifecycle hooks:

```typescript
// Using SystemBuilder (Recommended)
game.addSystem(
  createSystem('lifecycle-system')
    .setOnAttach((entityManager, resourceManager, eventBus) => {
      // Called when system is added to game
      console.log("System attached");
    })
    .setOnDetach((entityManager, resourceManager, eventBus) => {
      // Called when system is removed from game
      console.log("System detached");
    })
);

// Legacy approach (deprecated)
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

### Benefits of SystemBuilder

The SystemBuilder pattern offers several advantages:

1. **Type Safety**: Full TypeScript support with properly typed queries and components
2. **Named Queries**: Use descriptive names for entity queries to improve code readability
3. **Multiple Queries**: Define and access multiple entity queries within a single system
4. **Fluent API**: Method chaining provides a more readable and self-documenting API
5. **Consistent Pattern**: All systems follow a uniform pattern, enhancing maintainability

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

### Using Bundles for Modular Organization

Bundles provide a way to organize related components, systems, and resources into modular, composable units. They help maintain type safety while allowing you to break up your game logic into reusable pieces.

#### Creating a Bundle

```typescript
import { createBundle } from "./simple-ecs";

// Define types for this bundle
interface PhysicsComponents {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
}

interface PhysicsResources {
  gravity: { value: number };
}

// Create a bundle with its own type definitions
const physicsBundle = createBundle<PhysicsComponents, {}, PhysicsResources>()
  .addSystem(
    // Systems maintain their own type safety within the bundle
    createSystem('movement')
      .addEntityQuery('moving', {
        with: ['position', 'velocity']
      })
      .setProcess((queries, deltaTime) => {
        // Process movement...
      })
  )
  .addResource('gravity', { value: 9.8 });
```

#### Installing Bundles into a World

```typescript
// Create the game world
const game = new SimpleECS<GameComponents, GameEvents, GameResources>();

// Install the bundle
game.install(physicsBundle);

// Or use method chaining
game
  .install(physicsBundle)
  .install(renderBundle)
  .install(aiBundle);
```

#### Combining Bundles

You can also combine multiple bundles before installing them:

```typescript
import { combineBundle } from "./simple-ecs";

// Define player-specific types
interface PlayerComponents {
  player: { id: string };
  health: { value: number };
}

interface PlayerResources {
  controls: { up: boolean; down: boolean; left: boolean; right: boolean };
}

// Create a player bundle
const playerBundle = createBundle<PlayerComponents, {}, PlayerResources>()
  .addSystem(/* player systems */)
  .addResource('controls', { up: false, down: false, left: false, right: false });

// Combine the bundles
// TypeScript will properly merge the component and resource types
const gameplayBundle = combineBundle(physicsBundle, playerBundle);

// Install the combined bundle
game.install(gameplayBundle);
```

#### Benefits of Bundles

1. **Modularity**: Organize related functionality into self-contained units
2. **Type Safety**: Each bundle maintains full type information for its components, resources, and systems
3. **Composition**: Combine bundles to build more complex functionality
4. **Reusability**: Create libraries of reusable game systems with proper typing
5. **Clean Code**: Keep your ECS organization tidy with logical groupings

This project was created using `bun init` in bun v1.2.4. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.