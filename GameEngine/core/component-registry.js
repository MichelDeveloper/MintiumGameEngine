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
    },
    {
      name: "life-system",
      label: "Health System",
      schema: {
        maxLife: { type: "number", default: 100, label: "Max Health", min: 0 },
        currentLife: {
          type: "number",
          default: 100,
          label: "Current Health",
          min: 0,
        },
      },
      description: "Adds health and damage capabilities to this object",
      icon: "bi-heart-fill",
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
};
