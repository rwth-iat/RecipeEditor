# Changelog

## [Unreleased] - Master Recipe Tool Development Session

### 🚀 Major Features Added

#### Advanced Condition System
- **Nested Condition Logic**: Implemented recursive condition groups with AND/OR/NOT operators
- **Logical Precedence**: Added proper bracket handling for complex logical expressions
- **Condition Editor Modal**: Moved condition editing to modal dialog to save screen space
- **Real-time Condition Preview**: Added condition summary display in workspace elements
- **Condition Validation**: Prevented invalid condition structures (e.g., NOT with multiple children)

#### Master Recipe Export Enhancement
- **Topological Sorting**: Implemented Kahn's algorithm to order recipe steps by connections
- **Enhanced Parameter Handling**: Improved parameter value extraction for MTP, AAS, and legacy types
- **Equipment Connection Mapping**: Added logic to create equipment connections based on workspace data
- **Template Compatibility**: Enhanced export to support full hierarchy like Wabe10/Wabe20 templates
- **XSD Validation Feedback**: Added explicit success/error messages for validation results

#### Workspace State Management
- **Improved ID Generation**: Fixed ID conflicts after element deletion and re-addition
- **Enhanced Cleanup**: Added proper cleanup of managed elements and workspace state
- **Persistent State**: Fixed workspace saving and loading for both general and master recipes

### 🔧 Components Modified

#### PropertyWindow.vue
- **Condition Editor Integration**: Added modal-based condition editing
- **Condition Summary Display**: Show stringified conditions in properties window
- **Validation Logic**: Prevent modal closure if conditions are invalid
- **UI Improvements**: Enhanced button styling and trash icon for remove buttons

#### ConditionEditor.vue
- **Modal Implementation**: Converted to modal dialog for better UX
- **Condition Stringification**: Added `summarizeGroup` function for readable condition text
- **Validation Integration**: Added validation checks before allowing modal closure

#### ConditionGroupEditor.vue
- **Recursive Rendering**: Handles nested condition groups with proper operator constraints
- **Move Up/Down**: Added reordering functionality without external packages
- **NOT Operator Logic**: Enforced unary operator constraint for NOT groups
- **UI Validation**: Added validation to prevent invalid condition structures

#### WorkspaceContent.vue
- **Condition Text Display**: Updated `generateConditionText` to use new condition logic
- **ID Management**: Enhanced `findNextAvailableId` to prevent conflicts
- **Element Cleanup**: Improved `deleteElement` with proper state management
- **Debug Logging**: Added extensive logging for troubleshooting

#### new_export_xml.js
- **Topological Sort**: Implemented Kahn's algorithm for step ordering
- **Enhanced Parameter Mapping**: Improved parameter value extraction and structure
- **Equipment Integration**: Added equipment connection and requirement mapping
- **Template Support**: Enhanced export for complex recipe hierarchies
- **Validation Feedback**: Added comprehensive error and success messaging

#### WorkspaceContainer.vue
- **Master Recipe Integration**: Added master recipe configuration support
- **Export Functions**: Integrated both general and master recipe export
- **Workspace Management**: Enhanced save/load/import/export functionality

#### TopBar.vue
- **Action Menu**: Added comprehensive actions dropdown with all workspace functions
- **Mode Awareness**: Different actions available for general vs master recipe modes
- **Import Support**: Added file import for JSON and XML formats

### 🎨 UI/UX Improvements

#### Button Styling
- **Dark Background Compatibility**: Fixed button visibility on dark backgrounds
- **Icon Integration**: Replaced "Remove" text with trash icons
- **Consistent Design**: Unified button styling across components

#### Modal Dialogs
- **Condition Editor Modal**: Moved condition editing to modal for better space usage
- **Master Recipe Config**: Enhanced configuration modal with validation
- **Responsive Design**: Improved modal layouts and interactions

#### Workspace Elements
- **Condition Display**: Show actual condition text instead of "True" in workspace
- **Visual Feedback**: Enhanced element appearance and interaction states
- **Drag & Drop**: Improved drag and drop experience with better visual cues

### 🐛 Bug Fixes

#### Condition System
- **NOT Operator Display**: Fixed "NOT(True)" appearing when custom conditions were set
- **Condition Stringification**: Corrected bracket display and logical precedence
- **Modal Validation**: Fixed condition editor modal closing with invalid data

#### Workspace Management
- **Element Movement**: Fixed "Begin" elements not being movable after deletion/re-addition
- **ID Conflicts**: Resolved ID generation conflicts between sidebar and workspace items
- **State Persistence**: Fixed workspace state not being properly saved after deletions

#### Export System
- **Parameter Values**: Fixed mismatch between PropertyWindow data structure and export logic
- **Topological Sorting**: Corrected step ordering based on logical connections
- **Template Compatibility**: Fixed export to match Wabe10/Wabe20 template structures

### 🔄 Data Structure Changes

#### Condition System Refactor
- **From Flat Array**: Changed from `conditionList: []` to `conditionGroup: {}`
- **To Nested Structure**: Implemented recursive condition groups with operators
- **Backward Compatibility**: Maintained existing condition data during transition

#### Parameter Value Handling
- **Enhanced Extraction**: Added robust parameter value extraction for multiple data sources
- **Type Safety**: Improved handling of array, object, and direct value formats
- **Validation**: Added parameter validation with user-friendly warnings

### 📁 New Files Added

#### Documentation
- `MASTER_RECIPE_DOCUMENTATION.md`: Comprehensive master recipe tool documentation
- `CHANGELOG.md`: This changelog documenting all changes

#### Artefacts
- `server/Artefakte/`: Added sample recipe templates and AAS files for testing
- `server/MtpApi.py`: New MTP API integration for manufacturing platforms

### 🧪 Testing & Validation

#### XSD Validation
- **Server-side Validation**: Enhanced validation with detailed error reporting
- **Client Feedback**: Added explicit success/error messages for validation results
- **Fallback Downloads**: Invalid recipes still downloadable for debugging

#### Condition Logic Testing
- **Complex Scenarios**: Tested nested conditions with multiple operators
- **Edge Cases**: Validated NOT operator constraints and logical precedence
- **UI Validation**: Ensured condition editor prevents invalid structures

### 🔌 Integration Improvements

#### API Integration
- **Enhanced Endpoints**: Improved recipe creation and validation APIs
- **Error Handling**: Better error reporting and user feedback
- **Data Validation**: Added comprehensive validation at multiple levels

#### File Format Support
- **Import Formats**: Enhanced support for JSON and XML imports
- **Export Formats**: Improved BatchML XML generation and validation
- **Workspace Persistence**: Better localStorage integration and state management

### 📊 Performance Improvements

#### Workspace Rendering
- **Optimized Updates**: Reduced unnecessary re-renders during condition editing
- **Efficient State Management**: Improved state updates and change detection
- **Memory Management**: Better cleanup of deleted elements and connections

#### Export Pipeline
- **Topological Sorting**: Efficient step ordering algorithm
- **Parameter Processing**: Optimized parameter extraction and mapping
- **XML Generation**: Streamlined BatchML generation process

### 🔒 Security & Validation

#### Input Validation
- **Condition Validation**: Prevented invalid logical structures
- **Parameter Validation**: Added value range and type checking
- **Configuration Validation**: Ensured required fields are completed

#### Data Integrity
- **State Persistence**: Reliable workspace state saving and loading
- **ID Uniqueness**: Prevented ID conflicts and data corruption
- **Connection Validation**: Ensured logical flow integrity

---

## Technical Details

### Dependencies
- **Vue 3**: Composition API and modern Vue patterns
- **jsPlumb**: Connection management and visual flow
- **Local Storage**: Browser-based persistence
- **File API**: Import/export functionality

### Browser Support
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **ES6+ Features**: Arrow functions, destructuring, async/await
- **HTML5 APIs**: Drag & Drop, File API, Local Storage

### Architecture Changes
- **Component Modularization**: Broke down complex components into smaller, focused ones
- **Composable Functions**: Extracted reusable logic into composables
- **State Management**: Improved state flow and data consistency
- **Error Handling**: Comprehensive error handling throughout the application

---

*This changelog documents all changes made during the master recipe tool development session. For detailed implementation information, refer to the code comments and the master recipe documentation.* 