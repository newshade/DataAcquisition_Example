const nodes7 = require('nodes7');														// Include 'nodes7' module for S7 communication
const Influx = require('influx');														// Include 'influx' module for InfluxDB communication
var s7conn = new nodes7;																// Create new object of 'nodes7' class - each connection requires new object
var doneReading = false,																// Declare other necessary variables
	doneWriting = false,
	timestamp,
	oldValue,
	variables = {
///// PLC VARIABLE DEFINITION AREA /////
////								////
////	Name:		Address:		////
////								////
/**/	Value: 		'DB3,REAL0', 	////
/**/	DTL_YY:		'DB3,INT4',	////
/**/	DTL_MM:		'DB3,BYTE6',	////
/**/	DTL_DD:		'DB3,BYTE7',	////
/**/	DTL_hh:		'DB3,BYTE9',	////
/**/	DTL_mm:		'DB3,BYTE10',	////
/**/	DTL_ss:		'DB3,BYTE11',	////
/**/	DTL_nn:		'DB3,DINT12'	////
////								////
////// END OF DEFINITION AREA //////////
};

const influx = new Influx.InfluxDB({													// Set InfluxDB connection parameters:
	host: process.env.INFLUX_HOST,														// Host			(default: localhost - for EDGE device)
	database: process.env.INFLUX_DB,													// Database name
	schema: [
	  {
		measurement: 'sensor_data',														// Table name
		fields: { 
			value: Influx.FieldType.FLOAT 												// Define table column and its variable type
		},
		tags: ['timestamp']																// Tag name
	  }
	]
});

s7conn.initiateConnection({																// Set PLC connection parameters:
	port: 102,																			// Port			(INT, default: 102)
	host: process.env.PLC_IP,															// IP address	(STRING)
	rack: 0,																			// Rack number	(INT, default: 0)
	slot: 1																				// Slot number	(INT, default: 1 - for S7-1500; 2 - for S7-1200)
}, connected);

function connected(err) {																// Return message when connecting error occurs
	if (typeof(err) !== "undefined") {
		console.log(err);
		process.exit();
	}
	s7conn.setTranslationCB(function(tag) {return variables[tag];});					// Translate absolute addresses of PLC variables in order to use symbolic names in further code
	s7conn.addItems([																	// Define variables' names for translation
		'Value',
		'DTL_YY',
		'DTL_MM',
		'DTL_DD',
		'DTL_hh',
		'DTL_mm',
		'DTL_ss',
		'DTL_nn'
	]);
//	s7conn.readAllItems(valuesReady);													// Read and return all values when the connection is established
	setInterval(function() { 
		s7conn.readAllItems(valuesReady);												// Read and return all values every [t] miliseconds (set interval time [t] below)
	}, 1000);																				// Set interval time [t] (in miliseconds)
}

function valuesReady(anythingBad, values) {
	if (anythingBad) {console.log("Error when reading PLC values"); }					// Return error message when values can't be read
	
	timestamp = 																		// Create timestamp string (for further DB use)
		values.DTL_YY + "-" + 
		values.DTL_MM + "-" + 
		values.DTL_DD + "T" + 
		values.DTL_hh + ":" + 
		values.DTL_mm + ":" + 
		values.DTL_ss + "." + 
		(Math.trunc(values.DTL_nn * 0.001));

	if (values.Value !== oldValue)	{													// Check if value has changed and when 'true', return new value with its timestamp
		console.log('Timestamp: ' + timestamp + ", Value: " + values.Value);			// Return values in console window		
		influx.writePoints([															// Writing data records to InfluxDB database
			{
			  measurement: 'sensor_data',												// Selecting table 'sensor_data'
			  tags: {
				timestamp: timestamp													// Setting tag 'timestamp' to actual timestamp value read from PLC
			  },
			  fields: {
				  value: values.Value													// Setting 'value' to actual value read from PLC
			  },
			  //timestamp: null,
			}
		  ], {
			database: process.env.INFLUX_DB,															// Selecting database 'data'
			precision: 'ms',															// Select precision - 'h' (hours), 'm' (minutes), 's' (seconds), 'ms' (miliseconds), 'u' (microseconds), 'ns' (nanoseconds)
		  })
		  .catch(error => {
			console.error(`Error saving data to InfluxDB! ${err.stack}`)				// Return error when writing cannot be performed
		  });

	} else {
		return;
	}
	oldValue = values.Value;															// Store current value in memory (for further comparison)
	doneReading = true;
}




/*

function valuesWritten(anythingBad) {
	if (anythingBad) { console.log("Error when writing values"); }
	console.log("Done writing.");
	doneWriting = true;
	if (doneReading) { process.exit(); }
}

*/


