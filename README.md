
<table cellspacing="0" cellpadding="0">
  <tr>
    <td align="center"><img src="images/logos/homebridge-wordmark-logo-horizontal.png" width="200"></td>
    <td align="center"><img src="images/logos/solax-power.png" width="150"></td>
    <td align="center"><img src="images/logos/qcells.png" width="150"></td>
  <tr>
</table>

# Solax Cloud Plugin for Homebridge

![npm](https://badgen.net/npm/v/homebridge-solaxcloud-api) ![npm](https://badgen.net/npm/dt/homebridge-solaxcloud-api) [![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)


The Solax Cloud Plugin for [Homebridge](https://homebridge.io/) was created as a platform plugin to gather data exposed by **Solax inverters** to the cloud through the [Solax Cloud API](https://www.solaxcloud.com/phoebus/resource/files/userGuide/Solax_API.pdf). Please note that **QCells inverters** are also supported since cloud requests share a similar approach.

Now with support for **multiple inverters**! Sensors will be created for each of the inverters present in the configuration. Additionally, a virtual inverter named "All inverters" will be created whenever a multiple inverters configuration is present. This inverter will present summarized power and consumption figures derived from data for all the physical inverters.

As HomeKit is still clueless about what a solar panel is, this plugin exposes a set of standard HomeKit accessories though Homebridge for each configured inverter that will allow interacting and automating your smart home based on the data made available from the Solax platform:

- **PV** (PV outlet with power consumption)
- **AC** (Inverter AC outlet with power and total energy consumptions)
- **To Grid** (Inverter to Grid outlet with power consumption)
- **To House** (Inverter to House outlet with power consumption)
- **From Grid** (Grid to House outlet with power consumption)
- **Update** (Motion sensor)

Battery information is also provided as Homekit accessories in case there are any batteries installed for any of the configured inverters:

- **To Battery** (Outlet with inverter power charging the battery)
- **From Battery** (Outlet with power drawn from the battery to the inverter)
- **Battery** (Battery with State of Charge information such as level or charge state)

<img src="images/plugin-accessories-home.png" width="50%" height="50%">
 
Please note that additional accessories are created by default with smooth power consumption curves (by applying either a simple or exponential moving average to the power series). This prevents sporadic events like a cloud passing by to have an immediate affect on provided meters.

## Required information

For this plugin to work, two critical pieces of information are required from Solax/QCells Cloud: 

- **Token ID**: Solax/Qcells users can get inverter information through the granted tokenID. You need to obtain your tokenID on the API page of Solax/Qcells cloud.
- **SN**: Registration No (communication module SN) for each desired inverter.

## Installation

This plugin is supported under Homebridge. It is highly recommended that you use Homebridge Config UI X to install and configure this plugin.

### Manual Installation

Install this plugin using: `sudo npm install -g homebridge-solaxcloud-api`.
Edit `config.json` manually to add your Solax inverters. See below for instructions on that.

## Platform configuration

Minimal platform configuration is depicted by the example configuration file below:

```json
{
  "platforms": [
    {
      "platform": "SolaxCloudAPI",
      "inverters": [
        {
          "brand": "solax",
          "tokenId": "20200722185111234567890",
          "name": "Solax",
          "sn": "ABCDEFGHIJ"
        }
      ],
    }
  ]
}
```
Configuration parameters are described on the table below:

| **Parameter**      | **Type** |  **Description**                                                                                                                                                                                                            |  **Default**  | **Mandatory?** |
| ------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------:| :------------: |
| `platform`         |  string  |  Platform name (must be SolaxCloudAPI)                                                                                                                                                                                      |     -         |       Y        |
| `inverters`        |  array   |  Array of configured inverters as objects with `{ brand: string, tokenId: string, name: string, sn: string, hasBattery: boolean }`, where `brand` is "solax" or "qcells", `tokenID` is the access token retrieved from the API page of Solax/QCells Cloud, `name` is the inverter name, used as prefix for accessory naming, `sn` is the inverter registration no. (inverter module SN) and `hasBattery` indicates on whether this inverter is connected to a battery. |     -         |       Y        |
| `pollingFrequency` |  number  |  Plugin data polling frequency from Solax Cloud (in seconds)                                                                                                                                                                |     300       |       N        |
| `smoothMeters`     |  boolean |  Whether to create additional meters by smoothing raw values from Solax Cloud                                                                                                                                               |     true      |       N        |
| `smoothingMethod`  |  string  |  Statistical method to use for smoothing raw values from Solax Cloud (simple or exponential moving average - "sma" or "ema")                                                                                                |     "sma"     |       N        |
| `pureHomeApp`      |  boolean |  Legacy fallback that exposes power as ambient light sensors when Matter is unavailable. It is ignored when Matter is enabled for the bridge.                                                                               |     false     |       N        |
| `enableHistory`    |  boolean |  Whether to enable Eve/fakegato history services for outlet power readings                                                                                                                                                  |     true      |       N        |

**NOTE:** The `pollingFrequency` parameter defaults to 300 seconds, since Solax/QCells inverters update cloud data every 5 minutes.

Configuration through the the use of [Homebridge UI](https://github.com/oznu/homebridge-config-ui-x) plugin is also available and recommended:

<img src="images/homebridge-ui.png" width="100%" height="100%">

## Matter electrical sensors

On Homebridge 2.4 or newer, the plugin exposes power readings as native Matter
Electrical Sensor devices. The **AC** sensor also exposes cumulative generated
energy. Matter support does not require `pureHomeApp`.

To enable the sensors:

1. Open **Homebridge UI > Plugins > Homebridge Solax Cloud API > Bridge Settings**.
2. Enable **Matter**, save, and restart the plugin.
3. Open the bridge settings again to display its Matter QR code.
4. In Apple Home, select **Add Accessory** and scan the QR code.

The plugin logs `Matter enabled - exposing native electrical sensors.` followed
by one `Matter Electrical Sensor` creation message for each applicable meter.
New sensors start at 0 W and receive data on the next successful Solax Cloud
update (the default polling interval is five minutes). The already-paired Matter
bridge does not need to be removed or paired again when sensors are added.

Raw and smoothed readings are exposed as separate sensors by default. Disable
`smoothMeters` if you do not want the additional smoothed sensors.

When Matter is unavailable, enabling `pureHomeApp` provides the legacy Apple
Home fallback by representing power readings as ambient light sensors. With
Matter enabled, `pureHomeApp` is ignored and native electrical sensors are used.

## Non-standard characteristics

Non-standard accessory characteristics are available through the use of [Eve for HomeKit app](https://apps.apple.com/us/app/eve-for-homekit/id917695792) you may download from the App Store.

This will allow some non-standard characteristics to be visible along with its historical data (like power or total energy consumption), as depicted in the image below:

<img src="images/plugin-outlet-consumption.png" width="50%" height="50%">

If Matter is unavailable and you want to rely solely on the native Home App, enable the `pureHomeApp` config setting. This legacy fallback exposes power consumption on each meter as an Ambient Light Sensor (the minimum value for an Ambient Light Sensor is 0.1 lux):

<img src="images/plugin-accessories-home-pure.png" width="50%" height="50%">

# Automation

Automation can be achieved with the help of the virtual **Update** motion sensor that was specifically tailored for this effect and which is available for each inverter. This motion sensor will be triggered whenever inverter data gets updated from the Solax Cloud API (according to what is defined on the `pollingFrequency` configuration setting). 

<img src="images/plugin-accessories-eve.png" width="50%" height="50%">

Motion is detected by the **Update** motion sensor whenever there is newly fetched inverter data from Solax Cloud. Using this sensor as a trigger combined with power and energy data from the virtual outlets enumerated above forms the basic building blocks for defining an automation.

## Automation example

Since automations are probably going to be dependent on the non-standard **Consumption** characteristics from the virtual outlets, these must created by using the Eve App. 

As an automation example, let's imagine we want to turn a pool heater pump on whenever the inverter AC power is greater than a specific figure (in Watt):

<table cellspacing="0" cellpadding="0">
  <tr>
    <td width="50%">1. Under Automation, select <b>Rules</b></td>
    <td width="50%">2. Click <b>Next</b></td>
  </tr>
  <tr>
    <td><img src="images/automation/automation_1.png"></td>
    <td><img src="images/automation/automation_2.png"></td>
  </tr>
  <tr>
    <td>3. Click <b>Add Trigger</b></td>
    <td>4. Select <b>Motion</b> as trigger type</td>
  </tr>
  <tr>
    <td><img src="images/automation/automation_3.png"></td>
    <td><img src="images/automation/automation_4.png"></td>
  </tr>
  <tr>
    <td>5. Select the Solax <b>Update</b> motion detector and set <b>Motion</b> as trigger</td>
    <td>6. Click <b>Next</b></td>
  </tr>
  <tr>
    <td><img src="images/automation/automation_5.png"></td>
    <td><img src="images/automation/automation_6.png"></td>
  </tr>
  <tr>
    <td>7. Select <b>Add Value Condition</b></td>
    <td>8. Choose <b>Inverter AC Consumption</b> as characteristic and elect <b>&gt=</b> a desired value</b></td>
  </tr>
  <tr>
    <td><img src="images/automation/automation_7.png"></td>
    <td><img src="images/automation/automation_8.png"></td>
  </tr>
  <tr>
    <td>9. Click <b>Next</b></td>
    <td>10. If no scene exists, click <b>Add Scene</b></td>
  </tr>
  <tr>
    <td><img src="images/automation/automation_9.png"></td>
    <td><img src="images/automation/automation_10.png"></td>
  </tr>
  <tr>
    <td>11. Click <b>Add Actions</b></td>
    <td>12. Select the accessory to be controlled (in this case <b>Garden Pool Outlet</b> will be turned <b>ON</b>)</td>
  </tr>
  <tr>
    <td><img src="images/automation/automation_11.png"></td>
    <td><img src="images/automation/automation_12.png"></td>
  </tr>
  <tr>
    <td>13. Click <b>Next</b></td>
    <td>14. Name your scene and click <b>Done</b></td>
  </tr>
  <tr>
    <td><img src="images/automation/automation_13.png"></td>
    <td><img src="images/automation/automation_14.png"></td>
  </tr>
  <tr>
    <td>15. Click <b>Next</b></td>
    <td>16. Name your rule and click <b>Done</b></td>
  </tr>
  <tr>
    <td><img src="images/automation/automation_15.png"></td>
    <td><img src="images/automation/automation_16.png"></td>
  </tr>
</table>

# TO DO

Next planned plugin releases should include:

- [X] **Inverter AC** to include Total Yield Energy
- [X] Consumption history through the [fakegato-history](https://github.com/simont77/fakegato-history) module
- [x] Enable support for "pure" Home App accessories (power meters will be exposed as Ambient Light sensors)
- [x] Add "smooth" accessories for power meters (compensating for sporadic scenarios like cloud a passing)
- [x] Add native Matter support for power and energy readings
- [x] Support for multiple inverters
- [x] Support for multiple brands (between Solax and QCells)
- [x] Accessories for battery state and consumptions
