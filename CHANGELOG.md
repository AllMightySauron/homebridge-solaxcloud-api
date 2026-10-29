# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Changed
* Assigned Matter electrical sensors their own `-matter` serial namespace instead of reusing legacy `pureHomeApp` light-sensor serials. Existing Matter sensors from v2.5.4 will be recreated once to prevent cross-mode cache collisions.

## [v2.5.4] - 2026-10-29
### Changed
* Moved Matter electrical sensor ownership into each outlet accessory.
* Kept legacy HAP light sensors exclusive to the `pureHomeApp` fallback when Matter is unavailable.
### Fixed
* Propagated raw and smoothed outlet power updates directly to their corresponding Matter electrical sensors.
* Avoided publishing battery Matter sensors when the inverter has no battery.

## [v2.5.3] - 2026-10-28
### Changed
* Renamed smoothed outlets and power sensors from `… (smooth)` to the HomeKit-compatible `… Smooth` convention.
### Fixed
* Preserved the previous HAP accessory UUIDs during the rename so rooms, scenes, and automations remain linked.

## [v2.5.2] - 2026-10-28
### Fixed
* Restored smoothed outlet accessories when Matter electrical sensors are enabled.
* Updated smoothed readings on both outlet accessories and Matter electrical sensors.

## [v2.5.1] - 2026-10-28
### Changed
* Matter electrical sensors are now created whenever Matter is enabled for the bridge; `pureHomeApp` is no longer required.
* Renamed the `pureHomeApp` UI option to clarify that it is only a legacy Apple Home fallback.
* Advertised both Matter and HAP support in the package metadata.
### Fixed
* Decoupled Matter power and energy updates from the legacy `pureHomeApp` setting.

## [v2.5.0] - 2026-10-27
### Added
* Added Matter electrical sensor support for power and cumulative energy in Apple Home.
### Changed
* Updated the project for Homebridge 2.4, modern Node.js, TypeScript, and ESM compatibility.
### Fixed
* Corrected Matter device registration, measurement schemas, unit conversions, and accessory deduplication.

## [v2.4.2] - 2026-06-03
### Changed
* Bumped Homebridge Lib dependency.
### Fixed
* Updated Eve HomeKit type loading for Homebridge Lib v8.

## [v2.4.1] - 2026-06-03
### Added
* Added unit coverage for all accessory types, platform config validation, and totalizer inverter creation.
* Added `enableHistory` config option to disable Eve/fakegato history services.
### Changed
* Bumped Fakegato dependency.
* Updated the test command to exit cleanly after running Mocha.
### Fixed
* Handled malformed inverter entries cleanly during platform config validation.

## [v2.4.0] - 2026-06-03
### Changed
* Replaced the local Solax Cloud API implementation with the external `solax-cloud-api` package.
* Bumped Mocha test dependency.
### Fixed
* Kept battery charge state reads in sync after updates.
* Rejected polling frequencies that would break meter smoothing.
* Prevented the multi-inverter totalizer from making cloud requests without real inverter credentials.

## [v2.3.3] - 2024-08-02
### Fixed
* Updated URL for Solax cloud API fetches.

## [v2.3.2] - 2024-07-04
### Fixed
* Updated README with fixed image logos.
### Changes
* Bumped dependencies.

## [v2.3.1] - 2024-04-08
### Fixed
* Changed max TokenID size to 24 ([#08](https://github.com/AllMightySauron/homebride-solaxcloud-api/issues/8)).

## [v2.3.0] - 2024-03-14
### Changes
* Added support for inverters from QCells through the QCells cloud API.
* **Breaking change** - plug-in configuration must be re-done to support inverters from multiple brands.
* Bumped dependencies.

## [v2.1.12] - 2023-05-31
### Changes
* Bumped dependencies.

## [v2.1.11] - 2023-03-14
### Changes
* Bumped dependencies.

## [v2.1.10] - 2022-12-13
### Changes
* Bumped dependencies.

## [v2.1.9] - 2022-11-16
### Changes
* Bumped dependencies.

## [v2.1.8] - 2022-07-20
### Changes
* Bumped dependencies.
### Fixed
* Update on polling logic to prevent event memory leak issue ([#04](https://github.com/AllMightySauron/homebride-solaxcloud-api/issues/4)).

## [v2.1.7] - 2022-05-03
### Changes
* Bumped dependencies.
* Unit testing for multiple inverters.
### Fixed
* Documentation updates.

## [v2.1.6] - 2022-04-07
### Changes
* Battery totals SoC updated to "All inverters".
### Fixed
* Compressed image size for README information.

## [v2.1.5] - 2022-04-07
### Changed
* New inverter accessory **Battery** for State of Charge (SoC) information.
* Support for battery charge level, charge state and low battery handler (<10%).

## [v2.1.4] - 2022-04-06
### Changed
* Added "All inverters" virtual inverter for totalizing inverter figures for all sensors.
* Preliminary battery support with **From Battery** and **To Battery** charge power ([#02](https://github.com/AllMightySauron/homebride-solaxcloud-api/issues/2)).

## [v2.1.2] - 2022-03-31
### Fixed
* Bumped dependencies to latest versions.
### Changed
* Initial support for multiple inverters.

## [v2.0.3] - 2022-01-25
### Fixed
* Fixed dependabot detected vulnerabilities.

## [v2.0.2] - 2022-01-24
### Changed
* Added support for "pure" Home app accessories (power consumption displayed as Ambient Light Sensors) ([#01](https://github.com/AllMightySauron/homebride-solaxcloud-api/issues/1)).
* Created optional accessories to display smooth value from raw API data (minimizing sporadic events like a cloud passing).

## [v1.5.1] - 2022-01-08
### Fixed
* Disabled repeat last data for history (connection problems may lead to strange values).

## [v1.5.0] - 2021-12-31
### Changed
* Homebridge certified!

## [v1.4.6] - 2021-12-28
### Fixed
* Added extended parameter check (including Solax Cloud limits).

## [v1.4.5] - 2021-12-27
### Fixed
* Sanity checks for mandatory config parameters.

## [v1.4.4] - 2021-12-22
### Fixed
* Automation example added to documentation.

## [v1.4.3] - 2021-12-21
### Fixed
* Code cleanup and optimizations.

## [v1.4.1] - 2021-12-21
### Fixed
* First working version with fakegato-history for Eve.

## [v1.4.0] - 2021-12-20
### Changed
* Initial fakegato-history release for Eve.

## [v1.3.1] - 2021-12-14
### Fixed
* Documentation updated to reflect new **Total Energy** characteristic on Inverter AC.

## [v1.3.0] - 2021-12-14
### Changed
* Added support for total energy consumption.

## [v1.2.1] - 2021-12-14
### Fixed
* Updates to the official documentation.

## [v1.2.0] - 2021-12-13
### Changed
* First official release.
