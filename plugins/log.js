const fs = require('fs');

function expandFilename(template, serverName) {
    return template ? template.replace(/\$\{server\}/g, () => serverName) : null;
}

module.exports = function (multimeter) {
    if (!multimeter.config.logFilename && !multimeter.config.errorLogFilename) {
        return;
    }

    let logFile = null;
    let errorLogFile = null;
    let logPath = null;
    let errorLogPath = null;

    function openStreams() {
        const serverName = multimeter.configManager.serverName;
        const nextLogPath = expandFilename(multimeter.config.logFilename, serverName);
        const nextErrorLogPath = expandFilename(multimeter.config.errorLogFilename, serverName);

        if (nextLogPath === logPath && nextErrorLogPath === errorLogPath) {
            return;
        }

        if (nextLogPath === logPath) {
           // No need to reopen
        } else if (nextLogPath) {
            if (logFile) {
                logFile.end();
            }
            logFile = fs.createWriteStream(nextLogPath, { flags: 'a' });
            logPath = nextLogPath;
        } else {
            logFile = null;
            logPath = null;
        }

        if (nextErrorLogPath && nextErrorLogPath === errorLogPath) {
            // No need to reopen
        } else if (nextErrorLogPath) {
            if (errorLogFile) {
                errorLogFile.end();
            }
            errorLogFile = fs.createWriteStream(nextErrorLogPath, { flags: 'a' });
            errorLogPath = nextErrorLogPath;
        } else {
            errorLogFile = logFile;
            errorLogPath = null;
        }
    }

    openStreams();
    multimeter.on('server', openStreams);

    multimeter.console.on('addLines', function (event) {
        const shard = event.shard ? `[${event.shard}] ` : '';
        const msg = new Date().toISOString() + ': ' + shard + event.line + '\n';
        if ((event.type === 'log' || event.type === 'result') && logFile) {
            logFile.write(msg);
        } else if (event.type === 'error' && errorLogFile) {
            errorLogFile.write(msg);
        }
    });
};

module.exports.expandFilename = expandFilename;
