const fs = require('fs');
const logFile = fs.createWriteStream('screeps.log', {flags : 'a'});
const errorLogFile = fs.createWriteStream('screeps.errors.log', {flags : 'a'});

module.exports = function(multimeter) {

    let enabled = false;

    function toggleLogging()
    {
	    if(!enabled) {
            enabled = true;
	        multimeter.log('Enabled logging');
        }
	    else {
	        enabled = false;
    	    multimeter.log('Disabled loggin');
	    }
    }

    multimeter.console.on('addLines', function(event) {
        if(!enabled) return;
        const msg = new Date().toISOString() + ': ' + event.line + '\n';
        if (event.type === 'log') {
	        logFile.write(msg);
        }
        else if(event.type === 'error') {
	        errorLogFile.write(msg);
        }
    });

    multimeter.addCommand("log", {
        description: "Log all console entries to a log file",
        helpText: "Enable/Disable logging to txt file",
        handler: toggleLogging,
    });
};
