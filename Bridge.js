var mqtt = require('mqtt');
var config = require('./config');
var deviceHubClient  = mqtt.connect(config.deviceHubHost);
var mqttClient = mqtt.connect(config.mqttClient);
var deviceHubTopicList = {};
var localTopicList = {};

deviceHubClient.on('connect', function () {
  console.log('connected to DeviceHub.net')
  //subscribe to device actuators
  for(var i=0; i<config.devices.length; i++) {
    var device = config.devices[i];
    if(device.actuators!=null) {
      for(var j=0; j<device.actuators.length; j++) {
        var actuator = device.actuators[j];
        var deviceHubTopic = '/a/' + device.apiKeys + '/p/' + device.projectId + '/d/' + device.deviceUUID + '/actuator/' + actuator.name + '/state';
        deviceHubClient.subscribe(deviceHubTopic);
        localTopicList[deviceHubTopic] = actuator.destinations;
      }
    }
  }
})

mqttClient.on('connect', function () {
  console.log('connected to MQTT broker')
  //subscribe to local device sensors
  for(var i=0; i<config.devices.length; i++) {
    var device = config.devices[i];
    if(device.sensors!=null) {
      for(var j=0; j<device.sensors.length; j++) {
        var sensor = device.sensors[j];
        var deviceHubTopic = '/a/' + device.apiKeys + '/p/' + device.projectId + '/d/' + device.deviceUUID + '/sensor/' + sensor.name + '/data';
        mqttClient.subscribe(sensor.source);
        deviceHubTopicList[sensor.source] = deviceHubTopic;
      }
    }
  }
})


deviceHubClient.on('message', function (topic, message) {
  // message is Buffer
  console.log('remote:' + message.toString())
  var destinations = localTopicList[topic];
  if(destinations != null) {
    var actuatorUpdate = JSON.parse(message)
    for(var i=0; i<destinations.length;i++) {
      mqttClient.publish(destinations[i],String(actuatorUpdate.state));
    }
  }
})

mqttClient.on('message', function (topic, message) {
  // message is Buffer
  console.log('local:' + message.toString())
  var destination = deviceHubTopicList[topic];
  if(destination != null) {
    var sensorUpdate = {};
    sensorUpdate.value = String(message);
    console.log("sending " + JSON.stringify(sensorUpdate) + " to " + destination);
    deviceHubClient.publish(destination,JSON.stringify(sensorUpdate));
  } else {
    console.log("no destination found for [" + topic + ']');
  }
})
