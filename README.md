# HS New Mobile

Android React Native app for parachutist monitoring with BLE ingestion, offline queueing, AI risk detection, and MQTT synchronization to web services.

## Implemented Scope

- Wrist wearable to phone link through BLE notifications.
- Two packet headers configurable in Settings (hex):
	- ESP packet header
	- Parachute packet header
- Offline-first local queue in SQLite.
- Online synchronization over MQTT when internet is available.
- On-device safety analysis:
	- dangerous situation detection
	- uncontrolled fall
	- excessive rotation
	- lack of movement
	- physiological anomalies
	- risk scoring and automatic alert queueing
- Mock/real data switch in Settings.
- Graphs for ESP telemetry history:
	- temperature
	- cpu load
	- voltage
	- current now
	- battery percentage
- Debugging tools:
	- manual packet replay from hex input
	- log export via share sheet

## Added Parachute Parameter

Altitude was added as an extra key parameter. Combined with vertical speed and g-force, it improves dangerous behavior context and impact risk interpretation.

## Packet Structure

This app expects both packet types to follow:

header bytes + 2-byte payload length + UTF-8 JSON payload

The header bytes are configured in Settings.

## Parachute Payload Schema

The parachute payload schema currently used is:

- chuteOpened: boolean
- bodyPosition: stable | tilted-left | tilted-right | head-down | unstable
- stressLevel: number
- bodyTemperature: number
- bloodOxygen: number
- heartRate: number
- verticalSpeed: number
- rotationRate: number
- movementIndex: number
- altitude: number
- gForce: number
- batteryPercentage: number
- timestamp: ISO string

## MQTT Message Contract

Telemetry topic (configured in Settings):

```json
{
	"kind": "esp | parachute",
	"createdAt": "2026-04-21T12:00:00.000Z",
	"source": "mobile",
	"payload": {"...": "..."}
}
```

Alert topic:

configuredTopic + /alerts

```json
{
	"kind": "alert",
	"createdAt": "2026-04-21T12:00:00.000Z",
	"source": "mobile",
	"payload": {
		"risk": {"...": "..."},
		"parachute": {"...": "..."},
		"esp": {"...": "..."}
	}
}
```

## Run

1. Install dependencies:

```sh
npm install
```

2. Start Metro:

```sh
npm start
```

3. Run Android:

```sh
npm run android
```

## Notes

- BLE defaults are set in Settings for service and characteristic UUID and can be edited.
- App uses SQLite queueing to avoid data loss while offline.
- Background sync attempts run periodically and can also be triggered manually.
- For stable React Native tooling, Node 20.19.4+ is recommended.
