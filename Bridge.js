var mqtt = require('mqtt');
var config = require('./config');
var cayenneClient  = mqtt.connect(config.cayenneConnection.host,{clientId : config.cayenneConnection.clientId, username : config.cayenneConnection.username, password : config.cayenneConnection.password});
var localClient = mqtt.connect(config.mqttClient);
var destinationInfoList = {};
var localTopicList = {};

cayenneClient.on('connect', function () {
  console.log('connected to Cayenne MyDevices')
  //subscribe to device actuators
  // for(var i=0; i<config.devices.length; i++) {
  //   var device = config.devices[i];
  //   if(device.actuators!=null) {
  //     for(var j=0; j<device.actuators.length; j++) {
  //       var actuator = device.actuators[j];
  //       var cayenneTopic = '/a/' + device.apiKeys + '/p/' + device.projectId + '/d/' + device.deviceUUID + '/actuator/' + actuator.name + '/state';
  //       cayenneClient.subscribe(cayenneTopic);
  //       localTopicList[cayenneTopic] = actuator.destinations;
  //     }
  //   }
  // }
})

localClient.on('connect', function () {
  console.log('connected to local MQTT broker')
  //subscribe to local device sensors
  for(var i=0; i<config.devices.length; i++) {
    var device = config.devices[i];
    if(device.sensors!=null) {
      for(var j=0; j<device.sensors.length; j++) {
        var sensor = device.sensors[j];
        var cayenneTopic = 'v1/' + config.cayenneConnection.username + '/things/' + config.cayenneConnection.clientId + '/data/' + sensor.channel;
        localClient.subscribe(sensor.source);
        var destinationInfo = {topic: cayenneTopic, sensorInfo: sensor};
        destinationInfoList[sensor.source] = destinationInfo;
      }
    }
  }
})


cayenneClient.on('message', function (topic, message) {
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

localClient.on('message', function (topic, message) {
  // message is Buffer
  console.log('local:' + message.toString())
  var destinationInfo = destinationInfoList[topic];
  if(destinationInfo != null) {
    var value = destinationInfo.sensorInfo.type + ',' + destinationInfo.sensorInfo.unit + '=' + message.toString();
    console.log("sending " + value + " to " + destinationInfo.topic);
    cayenneClient.publish(destinationInfo.topic,value);
  } else {
    console.log("no destination found for [" + topic + ']');
  }
})
