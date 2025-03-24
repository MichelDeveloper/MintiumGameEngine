export const ComponentRegistry = {
  // Just include the two components you want to start with
  availableComponents: [
    {
      name: "show-text-near",
      label: "Show Text When Near",
      schema: {
        text: { type: "string", default: "", label: "Text to Show" },
        distance: { type: "number", default: 2, label: "Trigger Distance" },
      },
      description: "Displays text when player is nearby",
      icon: "bi-chat-text",
      enabled: true,
    },
    {
      name: "show-hud-text",
      label: "Show HUD Text",
      schema: {
        text: { type: "string", default: "", label: "HUD Text" },
        distance: { type: "number", default: 2, label: "Trigger Distance" },
        viewAngle: {
          type: "boolean",
          default: true,
          label: "Check View Angle",
        },
      },
      description: "Shows text on player HUD when near the object",
      icon: "bi-display",
      enabled: true,
    },
    {
      name: "life-system",
      label: "Health System",
      schema: {
        maxLife: { type: "number", default: 0, label: "Max Health", min: 0 },
        currentLife: {
          type: "number",
          default: 0,
          label: "Current Health",
          min: 0,
        },
      },
      description: "Adds health and damage capabilities to this object",
      icon: "bi-heart-fill",
      enabled: true,
    },
    {
      name: "raycast-collider",
      label: "Raycast Collider",
      icon: "bi-bullseye",
      description:
        "Marks this entity as a raycast target for terrain detection: For each collider, if its 3D object has a child named 'collision-data', use that child so that only its geometry is taken into account for raycasting.",
      schema: {
        enabled: {
          type: "boolean",
          default: false,
          label: "Enable Raycast Collider",
        },
        debug: {
          type: "boolean",
          default: false,
          label: "Show Debug Visual",
        },
      },
      enabled: true,
    },
  ],

  // Get component definition by name
  getComponent(name) {
    return this.availableComponents.find((comp) => comp.name === name);
  },

  // Create component data from schema
  createDefaultComponentData(componentName) {
    const component = this.getComponent(componentName);
    if (!component) return null;

    const data = {};
    Object.entries(component.schema).forEach(([key, schema]) => {
      data[key] = schema.default;
    });
    return data;
  },

  // Add these new helper methods
  getEnabledComponents() {
    return this.availableComponents.filter((comp) => comp.enabled);
  },

  // Get input element ID for a component property
  getInputId(componentName, propertyName) {
    return `${componentName}-${propertyName}`;
  },
};
