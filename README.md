# CityGrinder

A procedural medieval fantasy city generator for WordPress, designed to integrate seamlessly with the HexGrinder plugin for tabletop RPG hex map exploration.

## Overview

CityGrinder allows game masters and players to generate, explore, and save procedurally-generated medieval fantasy cities. When a settlement hex is clicked in HexGrinder, users can "enter" the settlement to explore its streets, districts, and buildings.

## Status

**Phase: Planning & Assessment**

This repository contains the WordPress compatibility assessment and implementation plan for recreating the [watabouCityGrinder](https://github.com/JiverG/watabouCityGrinder) functionality as a WordPress plugin.

## Documentation

- [WordPress Compatibility Assessment](WORDPRESS_COMPATIBILITY_ASSESSMENT.md) - Technical analysis and feasibility study
- [Implementation Guide](IMPLEMENTATION_GUIDE.md) - Detailed implementation instructions for each phase
- [Plugin Scaffold](plugin-scaffold/) - Example plugin structure and code

## Implementation Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Core Architecture & Plugin Setup | Planned |
| 2 | City Generation Engine (JavaScript) | Planned |
| 3 | Rendering & Visualization | Planned |
| 4 | HexGrinder Integration | Planned |
| 5 | User Interface & Exploration | Planned |

## Key Features (Planned)

- **Procedural City Generation**: Create unique cities from seeds
- **Multiple City Types**: Villages, towns, cities, fortresses, ports
- **District System**: Markets, residential, noble, craftsmen, temples, docks
- **Street Networks**: Main roads, secondary streets, alleys
- **Fortifications**: Walls, gates, towers
- **Water Features**: Rivers, coastlines, bridges
- **HexGrinder Integration**: Seamless transition from hex map to city view
- **Save/Load**: Store generated cities in WordPress database
- **Export**: PNG and SVG export options

## Technology Stack

- **Backend**: PHP 7.4+ (WordPress Plugin API)
- **Frontend**: JavaScript (ES6+), HTML5 Canvas
- **Styling**: CSS3 (extends HexGrinder theme)
- **Database**: WordPress tables (MySQL/MariaDB)

## Requirements

- WordPress 5.8+
- PHP 7.4+
- MySQL 5.7+ / MariaDB 10.3+
- HexGrinder plugin (recommended, not required)

## Related Projects

- [HexGrinder](https://github.com/JiverG/hexgrinder) - WordPress plugin for hex map exploration
- [watabouCityGrinder](https://github.com/JiverG/watabouCityGrinder) - Original Haxe city generator (inspiration)
- [Medieval Fantasy City Generator](https://watabou.itch.io/medieval-fantasy-city-generator) - Live version by watabou

## License

GPL v2 or later

## Contributing

This project is in the planning phase. See the assessment documents for details on the implementation roadmap.
