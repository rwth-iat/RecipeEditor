# Master Recipe Tool Documentation

## Overview
The Master Recipe Tool is a comprehensive recipe management system that allows users to create, edit, and export master recipes in B2MML (BatchML) format. It provides a graphical workspace editor with advanced condition logic, recipe configuration, and validation capabilities.

## Key Features

### 1. Graphical Workspace Editor
- **Drag & Drop Interface**: Add recipe elements from sidebar to workspace
- **Visual Connections**: Create logical flow between recipe steps
- **Element Types**: Support for various recipe element types including:
  - Begin/End elements
  - Process elements
  - Material elements
  - Recipe elements (with subtypes)
  - Chart elements

### 2. Advanced Condition System
- **Logical Operators**: AND, OR, NOT with proper precedence
- **Nested Conditions**: Group conditions with brackets for complex logic
- **Condition Editor**: Modal-based interface for editing complex conditions
- **Real-time Preview**: See condition summary in workspace elements
- **Validation**: Prevent invalid condition structures

### 3. Master Recipe Configuration
- **Product Information**: ID, Name, Version, Description
- **Formula Parameters**: Configurable parameters with validation
- **Equipment Requirements**: Define equipment needs for the recipe
- **Persistent Storage**: Configuration saved in localStorage

### 4. Export & Validation
- **B2MML XML Generation**: Industry-standard BatchML format
- **XSD Validation**: Server-side schema validation
- **Topological Sorting**: Steps ordered by logical connections
- **Error Handling**: Comprehensive error reporting and fallback downloads

## Architecture

### Frontend Components

#### Core Components
- **`MasterRecipe.vue`**: Main view with workspace and configuration
- **`WorkspaceContainer.vue`**: Manages main and secondary workspaces
- **`WorkspaceContent.vue`**: Renders workspace with drag & drop
- **`SideBar.vue`**: Provides recipe elements for workspace
- **`TopBar.vue`**: Actions menu and navigation

#### Property & Configuration Components
- **`PropertyWindow.vue`**: Main property editing interface
- **`MasterRecipeConfig.vue`**: Recipe configuration modal
- **`ConditionEditor.vue`**: Modal for editing complex conditions
- **`ConditionGroupEditor.vue`**: Recursive component for nested conditions
- **`ValueTypeProperty.vue`**: Property value editing with type support

#### XML Export Components
- **`new_export_xml.js`**: Core export logic and BatchML generation

### Backend Components

#### API Endpoints
- **`RecipeAPI.py`**: Recipe creation and validation endpoints
- **`AasAPI.py`**: Asset Administration Shell integration
- **`MtpApi.py`**: MTP (Manufacturing Technology Platform) integration
- **`OntologyAPI.py`**: Ontology-based capability queries

#### Core Functions
- **`Functions.py`**: Utility functions and helpers
- **`server.py`**: Main server application

## Data Structures

### Condition System
```javascript
// Condition Group Structure
{
  type: 'group',
  operator: 'AND' | 'OR' | 'NOT',
  children: [
    {
      type: 'condition',
      keyword: 'Level',
      instance: '500',
      operator: '>=',
      value: '300'
    },
    // ... more conditions or nested groups
  ]
}
```

### Workspace Elements
```javascript
// Workspace Item Structure
{
  id: 'Begin001',
  type: 'recipe_element',
  x: 100,
  y: 100,
  description: 'Begin Process',
  recipeElementType: 'Begin',
  conditionGroup: { /* condition structure */ }
}
```

### Master Recipe Configuration
```javascript
{
  productId: 'RECIPE_001',
  productName: 'Sample Recipe',
  version: '1.0.0',
  description: 'Recipe description',
  formulaParameters: [
    {
      name: 'Temperature',
      value: 150,
      unit: '°C'
    }
  ],
  equipmentRequirements: [
    {
      id: 'EQ_001',
      name: 'Reactor Vessel',
      type: 'Equipment'
    }
  ]
}
```

## User Workflow

### 1. Creating a Master Recipe
1. **Open Master Recipe Tool**: Navigate to `/master-recipe`
2. **Configure Recipe**: Click "Configure Recipe" to set basic information
3. **Add Elements**: Drag elements from sidebar to workspace
4. **Create Connections**: Connect elements to define flow
5. **Set Conditions**: Configure conditions for elements that need them
6. **Validate & Export**: Export to BatchML with validation

### 2. Condition Editing
1. **Select Element**: Click on element with conditions
2. **Open Condition Editor**: Click "Edit Condition" button
3. **Build Logic**: Use AND/OR/NOT operators to create condition groups
4. **Add Conditions**: Define individual conditions with keywords and values
5. **Preview**: See real-time condition summary
6. **Save**: Close modal to apply changes

### 3. Recipe Export
1. **Configure Export**: Ensure recipe configuration is complete
2. **Export**: Click "Export BatchML Recipe"
3. **Validation**: Server validates against XSD schema
4. **Download**: Valid XML downloads automatically
5. **Error Handling**: Invalid recipes download with error details

## Technical Implementation

### Condition Logic
- **Recursive Rendering**: `ConditionGroupEditor.vue` handles nested groups
- **Operator Constraints**: NOT can only have one child, AND/OR can have multiple
- **Validation**: Prevents invalid condition structures
- **Stringification**: Converts complex conditions to readable text

### Workspace Management
- **State Persistence**: Automatic saving to localStorage
- **ID Generation**: Unique IDs for all elements
- **Connection Tracking**: jsPlumb manages visual connections
- **Secondary Workspace**: Nested process editing capability

### Export Pipeline
- **Data Collection**: Gather workspace items and connections
- **Topological Sort**: Order steps by logical connections
- **XML Generation**: Create B2MML-compliant XML
- **Schema Validation**: Server-side XSD validation
- **Error Reporting**: Detailed error messages for debugging

## File Formats

### Supported Import Formats
- **Workspace JSON**: Complete workspace state with positions
- **B2MML XML**: Industry-standard recipe format
- **Recipe JSON**: Simple step-based recipe format

### Export Formats
- **BatchML XML**: B2MML-compliant master recipe
- **Workspace JSON**: Complete workspace state for sharing/backup

## Configuration Options

### Recipe Settings
- **Product Identification**: Unique identifiers and metadata
- **Version Control**: Recipe versioning support
- **Parameter Management**: Configurable formula parameters
- **Equipment Mapping**: Equipment requirement definitions

### Workspace Settings
- **Storage Keys**: Separate storage for different recipe types
- **Auto-save**: Automatic workspace persistence
- **Layout Management**: Automatic positioning and spacing
- **Zoom Controls**: Workspace navigation tools

## Error Handling

### Validation Errors
- **XSD Schema**: XML structure validation
- **Parameter Validation**: Value range and type checking
- **Condition Validation**: Logical structure validation
- **Connection Validation**: Flow completeness checking

### User Feedback
- **Alert Messages**: Clear error and success notifications
- **Download Fallbacks**: Invalid recipes still downloadable
- **Console Logging**: Detailed debugging information
- **Graceful Degradation**: Partial functionality on errors

## Browser Compatibility

### Supported Features
- **Modern ES6+**: JavaScript features and syntax
- **Vue 3 Composition API**: Modern Vue.js patterns
- **Local Storage**: Browser persistence
- **File API**: Import/export functionality
- **Drag & Drop**: HTML5 drag and drop

### Requirements
- **Modern Browser**: Chrome, Firefox, Safari, Edge (latest versions)
- **JavaScript Enabled**: Required for all functionality
- **Local Storage**: Required for workspace persistence

## Future Enhancements

### Planned Features
- **Recipe Templates**: Pre-built recipe structures
- **Version History**: Recipe change tracking
- **Collaboration**: Multi-user editing support
- **Advanced Validation**: Business rule validation
- **Integration APIs**: External system connectivity

### Technical Improvements
- **Performance Optimization**: Large recipe handling
- **Offline Support**: Service worker implementation
- **Real-time Sync**: WebSocket-based collaboration
- **Advanced Search**: Recipe content search
- **Export Formats**: Additional industry standards

## Troubleshooting

### Common Issues
1. **Elements Not Moving**: Check for ID conflicts, try refreshing
2. **Conditions Not Saving**: Ensure modal validation passes
3. **Export Failures**: Check recipe configuration completeness
4. **Import Errors**: Verify file format and structure

### Debug Information
- **Console Logs**: Detailed operation logging
- **Network Tab**: API request/response monitoring
- **Local Storage**: Workspace state inspection
- **Element Inspector**: DOM structure analysis

## API Reference

### Frontend Functions
- `export_master_recipe_batchml()`: Export recipe to BatchML
- `saveWorkspaceToLocal()`: Save workspace to localStorage
- `importWorkspace()`: Import workspace from file
- `clearWorkspace()`: Reset workspace state

### Backend Endpoints
- `POST /create_master_recipe`: Create and validate master recipe
- `POST /validate`: Validate XML against XSD schema
- `GET /apidocs`: API documentation

## Contributing

### Development Guidelines
- **Vue 3 Composition API**: Use modern Vue patterns
- **Component Structure**: Follow established component hierarchy
- **Error Handling**: Implement comprehensive error handling
- **Testing**: Add tests for new functionality
- **Documentation**: Update docs for new features

### Code Organization
- **Component Separation**: Single responsibility principle
- **Composable Functions**: Reusable logic in composables
- **Type Safety**: Use TypeScript-like patterns
- **Consistent Naming**: Follow established naming conventions

---

*This documentation covers the Master Recipe Tool as of the latest implementation. For updates and changes, refer to the commit history and code comments.* 