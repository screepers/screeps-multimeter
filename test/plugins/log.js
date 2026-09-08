const assert = require('assert');
const EventEmitter = require('events');
const fs = require('fs');
const logPlugin = require('../../plugins/log');

const { expandFilename } = logPlugin;

function createMultimeter(opts) {
    const mm = new EventEmitter();
    mm.config = {
        logFilename: opts.logFilename,
        errorLogFilename: opts.errorLogFilename,
    };
    mm.configManager = {
        serverName: opts.serverName || 'main',
    };
    mm.console = new EventEmitter();
    return mm;
}

function mockStream(file) {
    return {
        path: file,
        chunks: [],
        ended: false,
        write(data) {
            this.chunks.push(data);
            return true;
        },
        end() {
            this.ended = true;
        },
    };
}

describe('log plugin', function () {
    let originalCreateWriteStream;
    let streams;

    beforeEach(function () {
        streams = [];
        originalCreateWriteStream = fs.createWriteStream;
        fs.createWriteStream = function (file) {
            const stream = mockStream(file);
            streams.push(stream);
            return stream;
        };
    });

    afterEach(function () {
        fs.createWriteStream = originalCreateWriteStream;
    });

    describe('expandFilename', function () {
        it('replaces ${server} with the server name', function () {
            assert.equal(
                expandFilename('multimeter-${server}.log', 'private'),
                'multimeter-private.log',
            );
        });

        it('leaves other filenames unchanged', function () {
            assert.equal(
                expandFilename('multimeter.log', 'main'),
                'multimeter.log',
            );
        });

        it('does not replace $server', function () {
            assert.equal(
                expandFilename('multimeter-$server.log', 'main'),
                'multimeter-$server.log',
            );
        });
    });

    it('does nothing when no log filenames are set', function () {
        logPlugin(createMultimeter({}));
        assert.equal(streams.length, 0);
    });

    it('writes errors to the log file when errorLogFilename is unset', function () {
        const mm = createMultimeter({ logFilename: 'multimeter.log' });
        logPlugin(mm);
        mm.console.emit('addLines', { type: 'error', line: 'boom' });
        assert.equal(streams.length, 1);
        assert.match(streams[0].chunks[0], /: boom\n$/);
    });

    it('writes log lines to the configured file', function () {
        const mm = createMultimeter({ logFilename: 'multimeter.log' });
        logPlugin(mm);
        assert.equal(streams.length, 1);
        assert.equal(streams[0].path, 'multimeter.log');

        mm.console.emit('addLines', {
            type: 'log',
            line: 'hello',
            shard: 'shard0',
        });
        assert.match(
            streams[0].chunks[0],
            /^\d{4}-.+: \[shard0\] hello\n$/,
        );
    });

    it('expands ${server} when opening the log file', function () {
        const mm = createMultimeter({
            logFilename: 'multimeter-${server}.log',
            serverName: 'season',
        });
        logPlugin(mm);
        assert.equal(streams[0].path, 'multimeter-season.log');
    });

    it('reopens the log file when the server changes', function () {
        const mm = createMultimeter({
            logFilename: 'multimeter-${server}.log',
            serverName: 'main',
        });
        logPlugin(mm);
        mm.console.emit('addLines', { type: 'log', line: 'one' });

        mm.configManager.serverName = 'ptr';
        mm.emit('server', 'ptr');

        assert.equal(streams[0].ended, true);
        assert.equal(streams[1].path, 'multimeter-ptr.log');

        mm.console.emit('addLines', { type: 'log', line: 'two' });
        assert.equal(streams[0].chunks.length, 1);
        assert.match(streams[1].chunks[0], /: two\n$/);
    });

    it('does not reopen a static log file on server switch', function () {
        const mm = createMultimeter({ logFilename: 'multimeter.log' });
        logPlugin(mm);
        mm.configManager.serverName = 'ptr';
        mm.emit('server', 'ptr');
        assert.equal(streams.length, 1);
        assert.equal(streams[0].ended, false);
    });

    it('writes errors to errorLogFilename when set', function () {
        const mm = createMultimeter({
            logFilename: 'multimeter.log',
            errorLogFilename: 'errors.log',
        });
        logPlugin(mm);
        assert.equal(streams.length, 2);
        assert.equal(streams[0].path, 'multimeter.log');
        assert.equal(streams[1].path, 'errors.log');

        mm.console.emit('addLines', { type: 'error', line: 'boom' });
        assert.equal(streams[0].chunks.length, 0);
        assert.match(streams[1].chunks[0], /: boom\n$/);
    });

    it('logs only errors when only errorLogFilename is set', function () {
        const mm = createMultimeter({ errorLogFilename: 'errors.log' });
        logPlugin(mm);
        assert.equal(streams.length, 1);
        assert.equal(streams[0].path, 'errors.log');

        mm.console.emit('addLines', { type: 'log', line: 'hello' });
        mm.console.emit('addLines', { type: 'error', line: 'boom' });
        assert.equal(streams[0].chunks.length, 1);
        assert.match(streams[0].chunks[0], /: boom\n$/);
    });

    it('expands ${server} in errorLogFilename on server switch', function () {
        const mm = createMultimeter({
            logFilename: 'multimeter-${server}.log',
            errorLogFilename: 'errors-${server}.log',
            serverName: 'main',
        });
        logPlugin(mm);
        mm.configManager.serverName = 'ptr';
        mm.emit('server', 'ptr');

        assert.equal(streams[0].ended, true);
        assert.equal(streams[1].ended, true);
        assert.equal(streams[2].path, 'multimeter-ptr.log');
        assert.equal(streams[3].path, 'errors-ptr.log');
    });
});
