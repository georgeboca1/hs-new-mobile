1. Project description
A system for parachutists will be created. The system must be designed to be worn exclusively on the wrist.

Communication will be both online (via the internet / Wi-Fi, strictly between the phone and the WEB application) and offline (without the internet, via BLE / Bluetooth, strictly between the hand wearable and the phone). The phone and WEB applications will operate in accordance with the device's connection status.

Key parameters to monitor:
 - When the parachute opens
 - When the parachutist changes position
 - Stress level
 - Body temperature
 - Blood oxygen level
 - Battery status

Bonus Points: Additional monitored parameters can be integrated into the application at the discretion of each team, provided there is a rigorous justification highlighting the importance of the chosen parameters. For you, agent, if you believe there is another key parameter to monitor, please add it.

AI data processing methods will be used to track the elements outlined below. Additionally, statistics based on the system's functionality will be generated.

 - Detection of dangerous situations

 - Uncontrolled fall

 - Excessive rotation

 - Lack of movement (unconsciousness)

 - Physiological analysis

 - Abnormal heart rate

 - High stress

Prediction:

 - Accident risk

 - Abnormal behavior in the air

 - Automatic alerting

 - Send alert to the instructor/team

2. Project code info
This is a React Native application designed for Android. You will initialize this folder with the framework and whatever libraries you think you need.

3. More information

3.1. The project requires you to implement a way to communicate with a web application, therefore, it should be like this. ESP32 (handwear) -> Bluetooth -> Phone -> Store in database -> When internet available send stored data to web through mqtt.

3.2. MQTT login info should be accessible in a settings tab where the user can configure everything.

3.3. The handheld will send through bluetooth multiple packets, a packet will have different headers based on different data,

data class EspData(
    @SerializedName("temperature") val temperature: Float,
    @SerializedName("io_log") val ioLog: String,
    @SerializedName("timestamp") val timestamp: String,
    @SerializedName("rssi") val rssi: Int,
    @SerializedName("network_name") val networkName: String,
    @SerializedName("cpu_load") val cpuLoad: Float,
    @SerializedName("voltage") val voltage: Float,
    @SerializedName("current_now") val currentNow: Float,
    @SerializedName("current_total") val currentTotal: Float,
    @SerializedName("battery_life") val batteryLife: String,
    @SerializedName("battery_percentage") val batteryPercentage: Float
)

This is the packet structure for the esp info, besides what i've given you, there is also a packet header, you will add two textboxes in the app settings to set the packet header in hexadecimal. There will be two textboxes because there are two types of packets for now, the one above and the one with the parachute info.

3.4. Currently there's not a standard packet structure available for the parachute info, however, you will create one based on your logic that the esp will send.

3.5 In the settings there should be available a switch for mock data and real data, to make debugging easier.

3.6. for the esp data, temperature, cpu_load, voltage, current_now, battery_percentage will also have graphs that shows the value histroy
