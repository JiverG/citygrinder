# WordPress Compatibility Assessment: CityGrinder

## Executive Summary

This document assesses the feasibility of recreating the **watabouCityGrinder** (Medieval Fantasy City Generator) as a WordPress-compatible plugin that integrates with the **HexGrinder** plugin and theme.

### Source Analysis

| Aspect | watabouCityGrinder | Target (WordPress) |
|--------|-------------------|-------------------|
| Language | Haxe (100%) | PHP, JavaScript |
| Framework | OpenFL | WordPress Plugin API |
| Rendering | OpenFL Display Objects | HTML5 Canvas/SVG + CSS |
| Architecture | Event-driven (msignal) | WordPress Hooks + AJAX |

### Verdict: **FEASIBLE WITH FULL REWRITE**

The original codebase cannot be directly ported—it requires a complete rewrite. However, the procedural generation algorithms can be translated to JavaScript, and the WordPress integration patterns from HexGrinder provide an excellent template.

---

## Current Architecture Analysis

### watabouCityGrinder (Source)

The Medieval Fantasy City Generator is built with:
- **Haxe**: A cross-platform language that compiles to multiple targets
- **OpenFL**: Framework for 2D graphics and cross-platform deployment
- **msignal**: Event/signal library for component communication

**Key Features to Recreate:**
1. Procedural city layout generation
2. District/ward system
3. Street network generation
4. Building placement algorithms
5. Walls and fortifications
6. Water features (rivers, coastlines)
7. Export capabilities (SVG/PNG)

### HexGrinder (Integration Target)

HexGrinder is a WordPress plugin with:
- **PHP 7.4+** backend
- **JavaScript** frontend (40%)
- **Modular CSS** (7 stylesheets)
- **4 Database Tables** (maps, party notes, sharing, settings)
- **40+ AJAX Handlers** for map operations

**Integration Points:**
- Hex tile click → City view transition
- Shared user authentication
- Consistent styling via CSS variables
- Database for saving city states

---

## Phased Implementation Plan

### Phase 1: Core Architecture & Plugin Setup
**Objective:** Establish WordPress plugin foundation with HexGrinder compatibility

#### Tasks:
1. **Plugin Scaffolding**
   - Create plugin header and main class (`citygrinder.php`)
   - Implement singleton pattern (matching HexGrinder architecture)
   - Register activation/deactivation hooks
   - Set up directory structure:
     ```
     citygrinder/
     ├── citygrinder.php           # Main plugin file
     ├── includes/
     │   ├── class-citygrinder-db.php
     │   ├── class-citygrinder-api.php
     │   ├── class-citygrinder-shortcodes.php
     │   └── class-citygrinder-generator.php
     ├── assets/
     │   ├── css/
     │   │   └── citygrinder.css   # Extends HexGrinder styles
     │   └── js/
     │       ├── city-generator.js
     │       ├── city-renderer.js
     │       └── city-explorer.js
     ├── templates/
     │   ├── city-view.php
     │   └── city-explorer.php
     └── admin/
         └── class-citygrinder-admin.php
     ```

2. **Database Schema**
   - `{prefix}_citygrinder_cities` - Saved city data
   - `{prefix}_citygrinder_buildings` - Building/POI information
   - `{prefix}_citygrinder_districts` - District/ward definitions
   - Link cities to HexGrinder hexes via foreign key

3. **WordPress Integration**
   - Register shortcodes: `[citygrinder]`, `[city_view]`
   - Enqueue scripts/styles conditionally
   - Add admin menu under HexGrinder (if present)
   - Implement AJAX handlers for city operations

#### Deliverables:
- Working plugin that activates without errors
- Database tables created on activation
- Basic shortcode rendering empty container
- Admin settings page

---

### Phase 2: City Generation Engine (JavaScript)
**Objective:** Port procedural generation algorithms to JavaScript

#### Core Algorithms to Implement:

1. **Voronoi-Based District Generation**
   ```javascript
   class DistrictGenerator {
     generateDistricts(seed, citySize, districtCount) {
       // Generate Voronoi cells for district boundaries
       // Assign district types (residential, market, noble, etc.)
     }
   }
   ```

2. **Street Network Generation**
   - Primary roads (connect gates/landmarks)
   - Secondary roads (district internal)
   - Alleys and paths
   - Curved vs. grid patterns based on city type

3. **Building Placement**
   - Lot subdivision algorithm
   - Building footprint generation
   - Height variation
   - Special building placement (temples, castles, markets)

4. **Fortification System**
   - Wall path generation
   - Gate placement
   - Tower positioning
   - Moat/ditch options

5. **Terrain Integration**
   - River/water body placement
   - Coastline generation
   - Hill/elevation effects
   - Bridge placement

#### Technical Approach:
- Use **Seeded Random** (seedrandom.js) for reproducible generation
- Implement **Delaunay Triangulation** for Voronoi diagrams
- Store generation parameters for re-generation
- Support multiple city templates (coastal, inland, island, etc.)

#### Deliverables:
- `city-generator.js` with full procedural generation
- Seed-based reproducibility
- JSON city data structure output
- Unit tests for generation algorithms

---

### Phase 3: Rendering & Visualization
**Objective:** Create visual city display using HTML5 Canvas/SVG

#### Rendering Layers:
1. **Background Layer** - Terrain, water, grass
2. **District Layer** - Colored district fills
3. **Street Layer** - Road network
4. **Building Layer** - Building footprints
5. **Fortification Layer** - Walls, gates, towers
6. **Label Layer** - District names, POI labels
7. **Interactive Layer** - Hover/click targets

#### Implementation Options:

**Option A: HTML5 Canvas (Recommended)**
```javascript
class CityRenderer {
  constructor(canvas, city) {
    this.ctx = canvas.getContext('2d');
    this.city = city;
  }

  render() {
    this.drawTerrain();
    this.drawDistricts();
    this.drawStreets();
    this.drawBuildings();
    this.drawWalls();
    this.drawLabels();
  }
}
```

**Option B: SVG (Better for Export)**
- DOM-based, easier hit detection
- Native zoom/pan support
- Better print quality
- Larger file sizes for complex cities

**Recommendation:** Hybrid approach
- Canvas for main display (performance)
- SVG generation for export feature

#### Styling Integration:
- Import HexGrinder CSS variables
- Match color palette and typography
- Consistent UI components (buttons, panels, modals)
- Responsive design for mobile

#### Deliverables:
- `city-renderer.js` with full visual rendering
- Zoom/pan controls
- Layer toggle system
- Export to PNG/SVG
- Print-friendly stylesheet

---

### Phase 4: HexGrinder Integration
**Objective:** Seamless transition between hex map and city view

#### Integration Points:

1. **Hex-to-City Linking**
   ```php
   // In HexGrinder, when clicking a settlement hex
   add_filter('hexgrinder_hex_click_action', function($action, $hex) {
     if ($hex['type'] === 'settlement') {
       return [
         'action' => 'open_city',
         'city_id' => $hex['linked_city_id']
       ];
     }
     return $action;
   }, 10, 2);
   ```

2. **Settlement Type Mapping**
   | HexGrinder Terrain | CityGrinder Type |
   |-------------------|------------------|
   | village | Small Village |
   | town | Market Town |
   | city | Large City |
   | castle | Fortified Castle |
   | port | Coastal City |

3. **Shared Data Layer**
   - City seed derived from hex coordinates
   - Consistent naming conventions
   - Shared party notes system
   - Cross-referenced encounters

4. **Navigation System**
   - "Enter Settlement" button on hex info panel
   - "Return to Map" button in city view
   - Breadcrumb trail (Map → Region → City → Building)
   - URL routing: `/hexgrinder/map/city/{city_id}`

5. **API Endpoints**
   ```php
   // New AJAX actions
   wp_ajax_citygrinder_get_city
   wp_ajax_citygrinder_save_city
   wp_ajax_citygrinder_generate_city
   wp_ajax_citygrinder_link_to_hex
   ```

#### Deliverables:
- HexGrinder integration hooks
- Settlement click handlers
- Shared navigation system
- Unified user experience

---

### Phase 5: User Interface & Exploration
**Objective:** Rich exploration experience within generated cities

#### UI Components:

1. **City Overview Panel**
   - City name and type
   - Population estimate
   - District list with quick-nav
   - Notable locations (POIs)
   - Weather/time display (from HexGrinder)

2. **District Detail View**
   - District name and type
   - Key buildings
   - NPC encounters
   - Random event tables

3. **Building Interaction**
   - Click building for details
   - Interior generation (future)
   - Shop inventories
   - NPC assignment

4. **Exploration Tools**
   - Search/filter POIs
   - Custom marker placement
   - Note-taking per location
   - Session history

5. **GM Tools**
   - Edit city parameters
   - Add/remove POIs
   - Link encounters to locations
   - Share with party

#### CSS Styling (HexGrinder Compatible):
```css
/* citygrinder.css - Extends HexGrinder styles */
@import url('../hexgrinder/assets/css/hexgrinder.css');

.citygrinder-container {
  /* Uses HexGrinder CSS variables */
  --cg-primary: var(--hg-primary, #4a5568);
  --cg-accent: var(--hg-accent, #ed8936);
  --cg-background: var(--hg-panel-bg, #2d3748);
}

.city-canvas-container {
  border: 2px solid var(--cg-primary);
  border-radius: var(--hg-border-radius, 4px);
}

.district-panel {
  font-family: var(--hg-font-family);
  background: var(--cg-background);
}
```

#### Deliverables:
- Complete exploration UI
- Responsive design
- Accessibility compliance (WCAG 2.1)
- Keyboard navigation
- Touch support for mobile

---

## Technical Specifications

### Browser Support
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Performance Targets
- Initial load: < 2 seconds
- City generation: < 500ms
- Pan/zoom: 60fps
- Memory: < 100MB for large cities

### Dependencies
```json
{
  "dependencies": {
    "seedrandom": "^3.0.5",
    "delaunator": "^5.0.0"
  }
}
```

### WordPress Requirements
- WordPress 5.8+
- PHP 7.4+
- MySQL 5.7+ / MariaDB 10.3+
- HexGrinder plugin (recommended, not required)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Algorithm complexity | High | Start with simplified generation, iterate |
| Performance issues | Medium | Canvas optimization, web workers |
| HexGrinder API changes | Medium | Version checking, graceful degradation |
| Browser compatibility | Low | Polyfills, feature detection |

---

## Timeline Overview

| Phase | Description | Complexity |
|-------|-------------|------------|
| Phase 1 | Plugin Architecture | Low |
| Phase 2 | Generation Engine | High |
| Phase 3 | Rendering System | Medium |
| Phase 4 | HexGrinder Integration | Medium |
| Phase 5 | UI & Exploration | Medium |

---

## Conclusion

Recreating the Medieval Fantasy City Generator as a WordPress plugin is **technically feasible** and would provide significant value when integrated with HexGrinder. The main challenges are:

1. **Algorithm Translation**: Porting Haxe procedural generation to JavaScript
2. **Performance**: Ensuring smooth rendering of complex cities
3. **Integration**: Maintaining compatibility with HexGrinder updates

The modular architecture of HexGrinder provides an excellent template for the plugin structure, and the shared CSS system will ensure visual consistency.

### Recommended Next Steps

1. Approve this assessment and phased plan
2. Set up development environment with WordPress + HexGrinder
3. Begin Phase 1 implementation
4. Research original city generation algorithms in detail
5. Create prototype of core generation in JavaScript

---

*Document created: 2026-01-24*
*Assessment for: JiverG/citygrinder*
*Related repositories: JiverG/watabouCityGrinder, JiverG/hexgrinder*
